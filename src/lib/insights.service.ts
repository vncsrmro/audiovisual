/**
 * Insights Service - Sistema de Ajuda Inteligente
 * Identifica editores que precisam de ajuda e gera recomendações
 */

import { NormalizedTask } from '@/types';
import { ALL_TEAMS, getTeamByMemberName, getMemberByName, Team, TeamMember } from './constants';
import { FeedbackCategory } from './frameio-api.service';

// ============================================
// TIPOS
// ============================================

export type UrgencyLevel = 'critical' | 'attention' | 'ok';

export interface ErrorPattern {
    category: string;
    count: number;
    percentage: number;
}

export interface EditorInsight {
    // Identificação
    editorId: number;
    editorName: string;
    teamId: string;
    teamName: string;
    teamColor: string;
    editorColor: string;

    // Métricas atuais (período atual)
    totalVideos: number;
    videosWithAlteration: number;
    alterationRate: number;

    // Métricas anteriores (para comparação)
    previousVideos: number;
    previousAlterationRate: number;

    // Tendência
    trend: 'improving' | 'stable' | 'worsening';
    trendValue: number; // diferença em pontos percentuais

    // Padrões de erro (do Frame.io)
    errorPatterns: ErrorPattern[];
    topError: ErrorPattern | null;

    // Score de urgência (0-100)
    urgencyScore: number;
    urgencyLevel: UrgencyLevel;

    // Recomendação
    recommendation: string;
    recommendationIcon: string;
}

export interface InsightsData {
    // Editores agrupados por urgência
    critical: EditorInsight[];   // Score > 70
    attention: EditorInsight[];  // Score 40-70
    ok: EditorInsight[];         // Score < 40

    // Resumo geral
    summary: {
        totalEditors: number;
        editorsNeedingHelp: number;
        avgAlterationRate: number;
        mostCommonError: string;
    };

    // Metadata
    periodLabel: string;
    comparisonLabel: string;
    lastUpdated: number;
}

// ============================================
// MAPEAMENTO DE RECOMENDAÇÕES
// ============================================

const ERROR_RECOMMENDATIONS: Record<string, { text: string; icon: string }> = {
    'Áudio/Voz': { text: 'Conversar sobre mixagem e níveis de áudio', icon: '🔊' },
    'Legenda/Texto': { text: 'Revisar processo de legendagem e timing', icon: '📝' },
    'Corte/Transição': { text: 'Praticar transições e ritmo de edição', icon: '🎬' },
    'Fonte/Tipografia': { text: 'Padronizar tipografia com guidelines', icon: '🔤' },
    'Cor/Imagem': { text: 'Revisar workflow de colorização', icon: '🎨' },
    'Timing/Sincronização': { text: 'Focar em sincronização áudio/vídeo', icon: '⏱️' },
    'Logo/Marca': { text: 'Verificar posicionamento de marca', icon: '🏷️' },
    'CTA/Preço': { text: 'Revisar templates de CTA/preço', icon: '💰' },
    'Footage/Vídeo': { text: 'Melhorar seleção de footage', icon: '🎥' },
    'Outros': { text: 'Agendar 1:1 para entender dificuldades', icon: '💬' },
};

// ============================================
// FUNÇÕES PRINCIPAIS
// ============================================

/**
 * Calcula o score de urgência (0-100)
 * Quanto MAIOR, mais urgente a ajuda
 */
export function calculateUrgencyScore(
    alterationRate: number,
    topErrorPercentage: number,
    trendValue: number
): number {
    let score = 0;

    // 1. Taxa de alteração atual (peso 40%)
    if (alterationRate >= 35) score += 40;      // Crítico
    else if (alterationRate >= 20) score += 25; // Atenção
    else score += 10;                            // OK

    // 2. Padrão de erro concentrado (peso 30%)
    // Se >50% dos erros são do mesmo tipo = problema focado
    if (topErrorPercentage >= 50) score += 30;
    else if (topErrorPercentage >= 35) score += 20;
    else score += 10;

    // 3. Tendência de piora (peso 30%)
    if (trendValue > 10) score += 30;      // Piorou muito
    else if (trendValue > 5) score += 20;  // Piorou um pouco
    else if (trendValue > 0) score += 10;  // Estável/leve piora
    else score += 0;                        // Melhorando!

    return Math.min(100, Math.max(0, score));
}

/**
 * Determina o nível de urgência baseado no score
 */
export function getUrgencyLevel(score: number): UrgencyLevel {
    if (score >= 70) return 'critical';
    if (score >= 40) return 'attention';
    return 'ok';
}

/**
 * Gera recomendação baseada nos dados do editor
 */
export function generateRecommendation(
    trend: 'improving' | 'stable' | 'worsening',
    topError: ErrorPattern | null,
    alterationRate: number
): { text: string; icon: string } {
    // Se está melhorando, parabenizar
    if (trend === 'improving' && alterationRate < 20) {
        return { text: 'Evoluindo bem! Manter acompanhamento', icon: '✨' };
    }

    // Se está excelente
    if (alterationRate < 10) {
        return { text: 'Performance excelente! Considerar como mentor', icon: '🏆' };
    }

    // Baseado no erro principal
    if (topError && topError.percentage >= 30) {
        const rec = ERROR_RECOMMENDATIONS[topError.category];
        if (rec) return rec;
    }

    // Fallback baseado na taxa de alteração
    if (alterationRate >= 35) {
        return { text: 'Agendar reunião urgente para entender bloqueios', icon: '🚨' };
    }

    return { text: 'Acompanhar de perto nas próximas semanas', icon: '👀' };
}

/**
 * Calcula padrões de erro a partir de feedbacks categorizados
 */
export function calculateErrorPatterns(
    feedbackCategories: Record<string, number>
): ErrorPattern[] {
    const total = Object.values(feedbackCategories).reduce((a, b) => a + b, 0);
    if (total === 0) return [];

    return Object.entries(feedbackCategories)
        .map(([category, count]) => ({
            category,
            count,
            percentage: Math.round((count / total) * 100),
        }))
        .sort((a, b) => b.count - a.count);
}

/**
 * Calcula insights para um editor específico
 */
export function calculateEditorInsight(
    editorName: string,
    currentVideos: NormalizedTask[],
    previousVideos: NormalizedTask[],
    feedbackCategories?: Record<string, number>
): EditorInsight | null {
    const member = getMemberByName(editorName);
    const team = getTeamByMemberName(editorName);

    if (!member || !team) return null;

    // Métricas atuais
    const totalVideos = currentVideos.length;
    const videosWithAlteration = currentVideos.filter(
        v => v.phaseTime?.alterationTimeMs && v.phaseTime.alterationTimeMs > 0
    ).length;
    const alterationRate = totalVideos > 0
        ? Math.round((videosWithAlteration / totalVideos) * 100)
        : 0;

    // Métricas anteriores
    const prevTotal = previousVideos.length;
    const prevWithAlteration = previousVideos.filter(
        v => v.phaseTime?.alterationTimeMs && v.phaseTime.alterationTimeMs > 0
    ).length;
    const previousAlterationRate = prevTotal > 0
        ? Math.round((prevWithAlteration / prevTotal) * 100)
        : 0;

    // Tendência
    const trendValue = alterationRate - previousAlterationRate;
    let trend: 'improving' | 'stable' | 'worsening' = 'stable';
    if (trendValue < -5) trend = 'improving';
    else if (trendValue > 5) trend = 'worsening';

    // Padrões de erro
    const errorPatterns = feedbackCategories
        ? calculateErrorPatterns(feedbackCategories)
        : [];
    const topError = errorPatterns.length > 0 ? errorPatterns[0] : null;

    // Score de urgência
    const topErrorPercentage = topError?.percentage || 0;
    const urgencyScore = calculateUrgencyScore(alterationRate, topErrorPercentage, trendValue);
    const urgencyLevel = getUrgencyLevel(urgencyScore);

    // Recomendação
    const rec = generateRecommendation(trend, topError, alterationRate);

    return {
        editorId: member.id,
        editorName: member.name,
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color,
        editorColor: member.color,
        totalVideos,
        videosWithAlteration,
        alterationRate,
        previousVideos: prevTotal,
        previousAlterationRate,
        trend,
        trendValue,
        errorPatterns,
        topError,
        urgencyScore,
        urgencyLevel,
        recommendation: rec.text,
        recommendationIcon: rec.icon,
    };
}

/**
 * Calcula insights para todos os editores
 */
export function calculateAllInsights(
    currentVideos: NormalizedTask[],
    previousVideos: NormalizedTask[],
    editorFeedbacks?: Map<string, Record<string, number>>
): InsightsData {
    const insights: EditorInsight[] = [];

    // Agrupar vídeos por editor
    const currentByEditor = new Map<string, NormalizedTask[]>();
    const previousByEditor = new Map<string, NormalizedTask[]>();

    currentVideos.forEach(v => {
        const list = currentByEditor.get(v.editorName) || [];
        list.push(v);
        currentByEditor.set(v.editorName, list);
    });

    previousVideos.forEach(v => {
        const list = previousByEditor.get(v.editorName) || [];
        list.push(v);
        previousByEditor.set(v.editorName, list);
    });

    // Calcular insight para cada editor conhecido
    ALL_TEAMS.forEach(team => {
        team.members.forEach(member => {
            if (member.role === 'leader') return; // Pular líderes

            const current = currentByEditor.get(member.name) || [];
            const previous = previousByEditor.get(member.name) || [];
            const feedbacks = editorFeedbacks?.get(member.name);

            const insight = calculateEditorInsight(member.name, current, previous, feedbacks);
            if (insight) {
                insights.push(insight);
            }
        });
    });

    // Ordenar por score de urgência (maior primeiro)
    insights.sort((a, b) => b.urgencyScore - a.urgencyScore);

    // Agrupar por nível
    const critical = insights.filter(i => i.urgencyLevel === 'critical');
    const attention = insights.filter(i => i.urgencyLevel === 'attention');
    const ok = insights.filter(i => i.urgencyLevel === 'ok');

    // Calcular resumo
    const totalEditors = insights.length;
    const editorsNeedingHelp = critical.length + attention.length;
    const avgAlterationRate = insights.length > 0
        ? Math.round(insights.reduce((acc, i) => acc + i.alterationRate, 0) / insights.length)
        : 0;

    // Erro mais comum (consolidado)
    const allErrors = new Map<string, number>();
    insights.forEach(i => {
        i.errorPatterns.forEach(e => {
            allErrors.set(e.category, (allErrors.get(e.category) || 0) + e.count);
        });
    });
    const mostCommonError = Array.from(allErrors.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return {
        critical,
        attention,
        ok,
        summary: {
            totalEditors,
            editorsNeedingHelp,
            avgAlterationRate,
            mostCommonError,
        },
        periodLabel: 'Últimas 2 semanas',
        comparisonLabel: '2 semanas anteriores',
        lastUpdated: Date.now(),
    };
}
