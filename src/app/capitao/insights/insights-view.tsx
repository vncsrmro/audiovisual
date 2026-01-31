'use client';

import { useState } from 'react';
import { EditorInsight, InsightsData } from '@/lib/insights.service';
import { ALL_TEAMS } from '@/lib/constants';
import {
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Minus,
    Users,
    Target,
    Lightbulb,
    Filter,
    ChevronDown,
    ChevronUp,
    Award,
    AlertCircle,
    CheckCircle,
    HelpCircle
} from 'lucide-react';

interface InsightsViewProps {
    critical: EditorInsight[];
    attention: EditorInsight[];
    ok: EditorInsight[];
    summary: InsightsData['summary'];
    periodLabel: string;
    comparisonLabel: string;
    lastUpdated: number;
}

// Componente de Card do Editor
function EditorCard({ insight, expanded, onToggle }: {
    insight: EditorInsight;
    expanded: boolean;
    onToggle: () => void;
}) {
    const getTrendIcon = () => {
        if (insight.trend === 'improving') return <TrendingDown className="w-4 h-4 text-green-400" />;
        if (insight.trend === 'worsening') return <TrendingUp className="w-4 h-4 text-red-400" />;
        return <Minus className="w-4 h-4 text-gray-400" />;
    };

    const getTrendColor = () => {
        if (insight.trend === 'improving') return 'text-green-400';
        if (insight.trend === 'worsening') return 'text-red-400';
        return 'text-gray-400';
    };

    const getUrgencyBorderColor = () => {
        if (insight.urgencyLevel === 'critical') return 'border-red-500/50';
        if (insight.urgencyLevel === 'attention') return 'border-yellow-500/50';
        return 'border-green-500/30';
    };

    const getUrgencyBgColor = () => {
        if (insight.urgencyLevel === 'critical') return 'bg-red-500/10';
        if (insight.urgencyLevel === 'attention') return 'bg-yellow-500/10';
        return 'bg-green-500/10';
    };

    return (
        <div className={`bg-[#12121a] border ${getUrgencyBorderColor()} rounded-xl overflow-hidden transition-all`}>
            {/* Header do Card */}
            <div
                className={`p-4 cursor-pointer hover:bg-white/5 transition-colors ${getUrgencyBgColor()}`}
                onClick={onToggle}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: insight.editorColor }}
                        >
                            {insight.editorName.charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-white font-semibold">{insight.editorName}</h3>
                            <div className="flex items-center gap-2">
                                <span
                                    className="text-xs px-2 py-0.5 rounded"
                                    style={{ backgroundColor: `${insight.teamColor}30`, color: insight.teamColor }}
                                >
                                    {insight.teamName}
                                </span>
                                <span className="text-gray-500 text-xs">
                                    {insight.totalVideos} vídeos
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Taxa de Alteração */}
                        <div className="text-right">
                            <div className={`text-2xl font-bold ${
                                insight.alterationRate >= 35 ? 'text-red-400' :
                                insight.alterationRate >= 20 ? 'text-yellow-400' : 'text-green-400'
                            }`}>
                                {insight.alterationRate}%
                            </div>
                            <div className={`flex items-center gap-1 text-xs ${getTrendColor()}`}>
                                {getTrendIcon()}
                                {insight.trendValue > 0 ? '+' : ''}{insight.trendValue}%
                            </div>
                        </div>

                        {/* Expandir */}
                        <button className="text-gray-400 hover:text-white p-1">
                            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Padrão de Erro Principal (sempre visível) */}
                {insight.topError && (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                        <span className="text-gray-400">Principal erro:</span>
                        <span className="text-white font-medium">
                            {insight.topError.category} ({insight.topError.percentage}%)
                        </span>
                    </div>
                )}
            </div>

            {/* Conteúdo Expandido */}
            {expanded && (
                <div className="p-4 border-t border-white/10 space-y-4">
                    {/* Recomendação */}
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">{insight.recommendationIcon}</span>
                            <div>
                                <h4 className="text-purple-400 font-semibold flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4" />
                                    Ação Recomendada
                                </h4>
                                <p className="text-white mt-1">{insight.recommendation}</p>
                            </div>
                        </div>
                    </div>

                    {/* Métricas Detalhadas */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white/5 rounded-lg p-3 text-center">
                            <p className="text-gray-400 text-xs">Vídeos Entregues</p>
                            <p className="text-white text-xl font-bold">{insight.totalVideos}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3 text-center">
                            <p className="text-gray-400 text-xs">Com Alteração</p>
                            <p className={`text-xl font-bold ${
                                insight.videosWithAlteration > 0 ? 'text-yellow-400' : 'text-green-400'
                            }`}>
                                {insight.videosWithAlteration}
                            </p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3 text-center">
                            <p className="text-gray-400 text-xs">Período Anterior</p>
                            <p className="text-gray-300 text-xl font-bold">{insight.previousAlterationRate}%</p>
                        </div>
                    </div>

                    {/* Padrões de Erro */}
                    {insight.errorPatterns.length > 0 && (
                        <div>
                            <h4 className="text-gray-400 text-sm mb-2">Distribuição de Erros</h4>
                            <div className="space-y-2">
                                {insight.errorPatterns.slice(0, 4).map((error, idx) => (
                                    <div key={error.category} className="flex items-center gap-2">
                                        <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                                            <div
                                                className={`h-full ${
                                                    idx === 0 ? 'bg-red-400' :
                                                    idx === 1 ? 'bg-yellow-400' :
                                                    idx === 2 ? 'bg-blue-400' : 'bg-gray-400'
                                                }`}
                                                style={{ width: `${error.percentage}%` }}
                                            />
                                        </div>
                                        <span className="text-gray-400 text-xs w-32 truncate">{error.category}</span>
                                        <span className="text-white text-xs font-medium w-10 text-right">
                                            {error.percentage}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Score de Urgência */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                        <span className="text-gray-400 text-sm">Score de Urgência</span>
                        <div className="flex items-center gap-2">
                            <div className="w-32 bg-white/10 rounded-full h-2 overflow-hidden">
                                <div
                                    className={`h-full ${
                                        insight.urgencyScore >= 70 ? 'bg-red-500' :
                                        insight.urgencyScore >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                                    }`}
                                    style={{ width: `${insight.urgencyScore}%` }}
                                />
                            </div>
                            <span className="text-white font-bold">{insight.urgencyScore}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Componente de Seção
function InsightSection({ title, icon: Icon, color, insights, expandedId, onToggle }: {
    title: string;
    icon: typeof AlertTriangle;
    color: string;
    insights: EditorInsight[];
    expandedId: string | null;
    onToggle: (id: string) => void;
}) {
    if (insights.length === 0) return null;

    return (
        <div className="space-y-4">
            <h2 className={`text-lg font-semibold flex items-center gap-2 ${color}`}>
                <Icon className="w-5 h-5" />
                {title}
                <span className="text-gray-500 text-sm font-normal">({insights.length})</span>
            </h2>
            <div className="space-y-3">
                {insights.map(insight => (
                    <EditorCard
                        key={insight.editorId}
                        insight={insight}
                        expanded={expandedId === insight.editorId.toString()}
                        onToggle={() => onToggle(insight.editorId.toString())}
                    />
                ))}
            </div>
        </div>
    );
}

export function InsightsView({
    critical,
    attention,
    ok,
    summary,
    periodLabel,
    comparisonLabel,
    lastUpdated
}: InsightsViewProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [teamFilter, setTeamFilter] = useState<string>('all');

    const handleToggle = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    // Filtrar por equipe
    const filterByTeam = (insights: EditorInsight[]) => {
        if (teamFilter === 'all') return insights;
        return insights.filter(i => i.teamId === teamFilter);
    };

    const filteredCritical = filterByTeam(critical);
    const filteredAttention = filterByTeam(attention);
    const filteredOk = filterByTeam(ok);

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Target className="w-8 h-8 text-purple-400" />
                        Central de Insights
                    </h1>
                    <p className="text-gray-400 mt-1">
                        Identifique quem precisa de ajuda e como ajudar
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-sm text-gray-500">Período analisado</div>
                    <div className="text-lg text-purple-400">{periodLabel}</div>
                    <div className="text-xs text-gray-500 mt-1">
                        Atualizado: {new Date(lastUpdated).toLocaleString('pt-BR')}
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-6">
                <div className="bg-[#12121a] border border-purple-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center">
                            <Users className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Editores Analisados</p>
                            <p className="text-2xl font-bold text-white">{summary.totalEditors}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#12121a] border border-red-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-red-600/20 flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-red-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Precisam de Ajuda</p>
                            <p className="text-2xl font-bold text-red-400">{summary.editorsNeedingHelp}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#12121a] border border-yellow-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-yellow-600/20 flex items-center justify-center">
                            <Target className="w-6 h-6 text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Taxa Média Alteração</p>
                            <p className={`text-2xl font-bold ${
                                summary.avgAlterationRate >= 35 ? 'text-red-400' :
                                summary.avgAlterationRate >= 20 ? 'text-yellow-400' : 'text-green-400'
                            }`}>
                                {summary.avgAlterationRate}%
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#12121a] border border-blue-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center">
                            <HelpCircle className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Erro Mais Comum</p>
                            <p className="text-lg font-bold text-white truncate">{summary.mostCommonError}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtro por Equipe */}
            <div className="flex items-center gap-4">
                <Filter className="w-5 h-5 text-gray-400" />
                <span className="text-gray-400">Filtrar por equipe:</span>
                <div className="flex gap-2">
                    <button
                        onClick={() => setTeamFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            teamFilter === 'all'
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/10 text-gray-400 hover:bg-white/20'
                        }`}
                    >
                        Todos
                    </button>
                    {ALL_TEAMS.map(team => (
                        <button
                            key={team.id}
                            onClick={() => setTeamFilter(team.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                teamFilter === team.id
                                    ? 'text-white'
                                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                            }`}
                            style={teamFilter === team.id ? { backgroundColor: team.color } : undefined}
                        >
                            {team.shortName}
                        </button>
                    ))}
                </div>
            </div>

            {/* Seções de Editores */}
            <div className="space-y-8">
                <InsightSection
                    title="Atenção Imediata"
                    icon={AlertCircle}
                    color="text-red-400"
                    insights={filteredCritical}
                    expandedId={expandedId}
                    onToggle={handleToggle}
                />

                <InsightSection
                    title="Monitorar"
                    icon={AlertTriangle}
                    color="text-yellow-400"
                    insights={filteredAttention}
                    expandedId={expandedId}
                    onToggle={handleToggle}
                />

                <InsightSection
                    title="Performance OK"
                    icon={CheckCircle}
                    color="text-green-400"
                    insights={filteredOk}
                    expandedId={expandedId}
                    onToggle={handleToggle}
                />
            </div>

            {/* Empty State */}
            {filteredCritical.length === 0 && filteredAttention.length === 0 && filteredOk.length === 0 && (
                <div className="text-center py-12">
                    <Award className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl text-gray-400">Nenhum editor encontrado</h3>
                    <p className="text-gray-500 mt-2">
                        {teamFilter !== 'all'
                            ? 'Tente selecionar outra equipe ou "Todos"'
                            : 'Não há dados suficientes para análise'}
                    </p>
                </div>
            )}

            {/* Legenda */}
            <div className="bg-[#12121a] border border-white/10 rounded-xl p-4">
                <h4 className="text-gray-400 text-sm font-semibold mb-3">Como interpretar</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-gray-300">Atenção Imediata (score &gt;70)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span className="text-gray-300">Monitorar (score 40-70)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-gray-300">Performance OK (score &lt;40)</span>
                    </div>
                </div>
                <p className="text-gray-500 text-xs mt-3">
                    Score baseado em: taxa de alteração (40%), concentração de erro (30%), tendência (30%)
                </p>
            </div>
        </div>
    );
}
