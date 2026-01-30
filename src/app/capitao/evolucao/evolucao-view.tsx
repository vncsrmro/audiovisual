'use client';

import { DashboardKPIs, NormalizedTask } from '@/types';
import { ALL_TEAMS, getTeamByMemberName, getMemberByName, TeamMember } from '@/lib/constants';
import {
    Award,
    Clock,
    AlertCircle,
    CheckCircle,
    TrendingUp,
    Calendar,
    Shield
} from 'lucide-react';

interface EvolucaoViewProps {
    kpis: DashboardKPIs;
    allVideos: NormalizedTask[];
    lastUpdated: number;
}

// Datas de admissão dos editores (baseado na primeira tarefa no ClickUp)
// Formato: ID do editor -> Data de admissão (timestamp)
const ADMISSION_DATES: Record<number, number> = {
    // VSL
    248675265: new Date('2026-01-15').getTime(), // Nathan Soares - primeira tarefa: 15/01/2026
    84070913: new Date('2026-01-26').getTime(),  // Victor Mazzine - primeira tarefa: 26/01/2026

    // Funil
    112053206: new Date('2026-01-28').getTime(), // Moises Ramalho - primeira tarefa: 28/01/2026
    152605916: new Date('2026-01-28').getTime(), // Victor Mendes - primeira tarefa: 28/01/2026
    3258937: new Date('2025-08-19').getTime(),   // Renato Fernandes - primeira tarefa: 19/08/2025
    3272897: new Date('2025-07-29').getTime(),   // Douglas Prado - primeira tarefa: 29/07/2025

    // ADs
    96683026: new Date('2026-01-15').getTime(),  // Leonardo da Silva (líder) - primeira tarefa: 15/01/2026
    84241154: new Date('2026-01-27').getTime(),  // Rafael Andrade - primeira tarefa: 27/01/2026

    // TP/MIC/LEAD
    82093531: new Date('2025-08-01').getTime(),  // Loren Gayoso - primeira tarefa: 01/08/2025
    82074101: new Date('2025-11-19').getTime(),  // Bruno Cesar - primeira tarefa: 19/11/2025
};

interface EditorEvolution {
    member: TeamMember;
    teamName: string;
    admissionDate: number;
    monthsInCompany: number;
    daysUntilPromotion: number;
    alterationRate: number;
    alterationRateLast2Months: number;
    status: 'on_track' | 'attention' | 'risk' | 'promoted' | 'audit_mode';
    isInAuditMode: boolean;
    canBePromoted: boolean;
    videosCount: number;
}

function calculateMonthsDiff(start: number, end: number): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth());
}

export function EvolucaoView({ kpis, allVideos, lastUpdated }: EvolucaoViewProps) {
    const now = Date.now();

    // Calculate last 2 months range
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const twoMonthsAgoTimestamp = twoMonthsAgo.getTime();

    // Build evolution data for each editor
    const editorsEvolution: EditorEvolution[] = [];

    ALL_TEAMS.forEach(team => {
        team.members.forEach(member => {
            // Skip leaders
            if (member.role === 'leader') return;

            const admissionDate = ADMISSION_DATES[member.id];
            if (!admissionDate) return;

            const monthsInCompany = calculateMonthsDiff(admissionDate, now);
            const daysUntilPromotion = Math.max(0, 365 - Math.floor((now - admissionDate) / (1000 * 60 * 60 * 24)));

            // Get editor stats
            const editorStats = kpis.editors.find(e =>
                e.editorName.toLowerCase() === member.name.toLowerCase()
            );

            // Calculate alteration rate for last 2 months
            const editorVideosLast2Months = allVideos.filter(v => {
                if (v.editorName.toLowerCase() !== member.name.toLowerCase()) return false;
                if (!v.dateClosed) return false;
                return v.dateClosed >= twoMonthsAgoTimestamp;
            });

            const videosWithAlteration = editorVideosLast2Months.filter(v =>
                v.phaseTime?.alterationTimeMs && v.phaseTime.alterationTimeMs > 0
            ).length;

            const alterationRateLast2Months = editorVideosLast2Months.length > 0
                ? (videosWithAlteration / editorVideosLast2Months.length) * 100
                : 0;

            const alterationRate = editorStats?.phaseMetrics?.alterationRate || 0;

            // Determine status
            const isInAuditMode = monthsInCompany >= 10 && monthsInCompany < 12;
            let status: EditorEvolution['status'] = 'on_track';

            if (monthsInCompany >= 12 && alterationRateLast2Months <= 5) {
                status = 'promoted';
            } else if (isInAuditMode) {
                status = 'audit_mode';
            } else if (alterationRateLast2Months > 10) {
                status = 'risk';
            } else if (alterationRateLast2Months > 5) {
                status = 'attention';
            }

            const canBePromoted = monthsInCompany >= 12 && alterationRateLast2Months <= 5;

            editorsEvolution.push({
                member,
                teamName: team.name,
                admissionDate,
                monthsInCompany,
                daysUntilPromotion,
                alterationRate,
                alterationRateLast2Months: parseFloat(alterationRateLast2Months.toFixed(1)),
                status,
                isInAuditMode,
                canBePromoted,
                videosCount: editorVideosLast2Months.length,
            });
        });
    });

    // Sort by months in company (closest to promotion first)
    editorsEvolution.sort((a, b) => b.monthsInCompany - a.monthsInCompany);

    const statusConfig = {
        on_track: { color: 'text-green-400', bg: 'bg-green-600/20', icon: CheckCircle, label: 'No Caminho' },
        attention: { color: 'text-amber-400', bg: 'bg-amber-600/20', icon: AlertCircle, label: 'Atenção' },
        risk: { color: 'text-red-400', bg: 'bg-red-600/20', icon: AlertCircle, label: 'Risco' },
        promoted: { color: 'text-purple-400', bg: 'bg-purple-600/20', icon: Award, label: 'Apto para Pleno' },
        audit_mode: { color: 'text-blue-400', bg: 'bg-blue-600/20', icon: Shield, label: 'Modo Auditoria' },
    };

    const editorsInAudit = editorsEvolution.filter(e => e.isInAuditMode);
    const editorsReadyForPromotion = editorsEvolution.filter(e => e.canBePromoted);

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-white">Evolução de Time</h1>
                    <p className="text-gray-400 mt-1">
                        Tracker de progressão Junior → Pleno
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-sm text-gray-500">Atualizado em</div>
                    <div className="text-lg text-purple-400">
                        {new Date(lastUpdated).toLocaleString('pt-BR')}
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-6">
                <div className="bg-[#12121a] border border-purple-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Total Editores</p>
                            <p className="text-2xl font-bold text-white">{editorsEvolution.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#12121a] border border-blue-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Em Auditoria</p>
                            <p className="text-2xl font-bold text-white">{editorsInAudit.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#12121a] border border-green-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center">
                            <Award className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Aptos para Pleno</p>
                            <p className="text-2xl font-bold text-white">{editorsReadyForPromotion.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#12121a] border border-amber-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-amber-600/20 flex items-center justify-center">
                            <AlertCircle className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Em Risco/Atenção</p>
                            <p className="text-2xl font-bold text-white">
                                {editorsEvolution.filter(e => e.status === 'risk' || e.status === 'attention').length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Criteria Box */}
            <div className="bg-purple-950/30 border border-purple-900/50 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-purple-400 mb-3">Critérios para Promoção</h2>
                <div className="grid grid-cols-3 gap-6 text-sm">
                    <div className="flex items-start gap-2">
                        <Calendar className="w-5 h-5 text-purple-400 mt-0.5" />
                        <div>
                            <p className="text-white font-medium">Tempo Mínimo</p>
                            <p className="text-gray-400">12 meses na empresa</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-purple-400 mt-0.5" />
                        <div>
                            <p className="text-white font-medium">Taxa de Alteração</p>
                            <p className="text-gray-400">≤ 5% nos últimos 2 meses</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <Shield className="w-5 h-5 text-purple-400 mt-0.5" />
                        <div>
                            <p className="text-white font-medium">Modo Auditoria</p>
                            <p className="text-gray-400">Ativado nos meses 11 e 12</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Editors Grid */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Progresso dos Editores</h2>

                {editorsEvolution.map(editor => {
                    const config = statusConfig[editor.status];
                    const StatusIcon = config.icon;
                    const progressPercent = Math.min(100, (editor.monthsInCompany / 12) * 100);

                    return (
                        <div
                            key={editor.member.id}
                            className="bg-[#12121a] border border-purple-900/30 rounded-xl p-6"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                                        style={{ backgroundColor: editor.member.color }}
                                    >
                                        {editor.member.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-white font-semibold text-lg">{editor.member.name}</h3>
                                        <p className="text-gray-400 text-sm">{editor.teamName}</p>
                                    </div>
                                </div>

                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg}`}>
                                    <StatusIcon className={`w-4 h-4 ${config.color}`} />
                                    <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-4">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-400">Progresso para 12 meses</span>
                                    <span className="text-white font-medium">{editor.monthsInCompany}/12 meses</span>
                                </div>
                                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${progressPercent}%`,
                                            backgroundColor: editor.isInAuditMode ? '#3b82f6' :
                                                editor.canBePromoted ? '#a855f7' :
                                                    editor.member.color
                                        }}
                                    />
                                </div>
                                {editor.isInAuditMode && (
                                    <p className="text-blue-400 text-xs mt-1 flex items-center gap-1">
                                        <Shield className="w-3 h-3" />
                                        Modo Auditoria ativo - monitoramento intensivo
                                    </p>
                                )}
                            </div>

                            {/* Metrics */}
                            <div className="grid grid-cols-4 gap-4">
                                <div className="bg-gray-900/50 rounded-lg p-3">
                                    <p className="text-gray-500 text-xs">Admissão</p>
                                    <p className="text-white font-medium">
                                        {new Date(editor.admissionDate).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                                <div className="bg-gray-900/50 rounded-lg p-3">
                                    <p className="text-gray-500 text-xs">Dias para Promoção</p>
                                    <p className={`font-medium ${editor.daysUntilPromotion === 0 ? 'text-purple-400' : 'text-white'}`}>
                                        {editor.daysUntilPromotion === 0 ? 'Elegível' : `${editor.daysUntilPromotion} dias`}
                                    </p>
                                </div>
                                <div className="bg-gray-900/50 rounded-lg p-3">
                                    <p className="text-gray-500 text-xs">Taxa Alteração (2 meses)</p>
                                    <p className={`font-medium ${editor.alterationRateLast2Months <= 5 ? 'text-green-400' :
                                            editor.alterationRateLast2Months <= 10 ? 'text-amber-400' : 'text-red-400'
                                        }`}>
                                        {editor.alterationRateLast2Months}%
                                    </p>
                                </div>
                                <div className="bg-gray-900/50 rounded-lg p-3">
                                    <p className="text-gray-500 text-xs">Vídeos (2 meses)</p>
                                    <p className="text-white font-medium">{editor.videosCount}</p>
                                </div>
                            </div>

                            {/* Promotion Status */}
                            {editor.canBePromoted && (
                                <div className="mt-4 p-3 bg-purple-950/50 border border-purple-500/30 rounded-lg">
                                    <p className="text-purple-400 text-sm flex items-center gap-2">
                                        <Award className="w-4 h-4" />
                                        <strong>{editor.member.name}</strong> atende todos os critérios para promoção a Pleno!
                                    </p>
                                </div>
                            )}

                            {editor.status === 'risk' && (
                                <div className="mt-4 p-3 bg-red-950/50 border border-red-500/30 rounded-lg">
                                    <p className="text-red-400 text-sm flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        Taxa de alteração acima de 10% - necessário acompanhamento
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
