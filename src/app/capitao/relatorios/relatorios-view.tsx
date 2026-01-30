'use client';

import { useState } from 'react';
import { DashboardKPIs, NormalizedTask } from '@/types';
import { ALL_TEAMS, getTeamByMemberName, getMemberByName } from '@/lib/constants';
import {
    FileText,
    Download,
    Calendar,
    Clock,
    CheckCircle,
    AlertCircle,
    TrendingUp,
    Users,
    Video,
    Target,
    Eye
} from 'lucide-react';

interface RelatoriosViewProps {
    kpis: DashboardKPIs;
    allVideos: NormalizedTask[];
    lastUpdated: number;
}

type ReportType = 'weekly' | 'monthly' | 'bimonthly' | 'quarterly';

interface ReportConfig {
    type: ReportType;
    label: string;
    description: string;
    frequency: string;
    audience: string;
    icon: typeof FileText;
    color: string;
}

const reportConfigs: ReportConfig[] = [
    {
        type: 'weekly',
        label: 'Relatório Semanal',
        description: 'Resumo operacional, gargalos e ações imediatas',
        frequency: 'Toda sexta-feira',
        audience: 'Phellipe (interno)',
        icon: FileText,
        color: 'purple',
    },
    {
        type: 'monthly',
        label: 'Relatório Mensal',
        description: 'Evolução, tendências e maturidade do time',
        frequency: 'Fim do mês',
        audience: 'Mateus Maialle',
        icon: TrendingUp,
        color: 'blue',
    },
    {
        type: 'bimonthly',
        label: 'Relatório Bimestral',
        description: 'Comparativo detalhado entre os 2 meses',
        frequency: 'A cada 2 meses',
        audience: 'Tático',
        icon: Target,
        color: 'green',
    },
    {
        type: 'quarterly',
        label: 'Relatório Trimestral',
        description: 'Visão macro, ROI e projeções',
        frequency: 'A cada 3 meses',
        audience: 'C-Level',
        icon: Users,
        color: 'amber',
    },
];

export function RelatoriosView({ kpis, allVideos, lastUpdated }: RelatoriosViewProps) {
    const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Calculate metrics for reports
    const now = new Date();

    // This week
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Last week
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    // This month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Last month
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisWeekVideos = allVideos.filter(v => v.dateClosed && v.dateClosed >= startOfWeek.getTime());
    const lastWeekVideos = allVideos.filter(v => v.dateClosed && v.dateClosed >= startOfLastWeek.getTime() && v.dateClosed < startOfWeek.getTime());
    const thisMonthVideos = allVideos.filter(v => v.dateClosed && v.dateClosed >= startOfMonth.getTime());
    const lastMonthVideos = allVideos.filter(v => v.dateClosed && v.dateClosed >= startOfLastMonth.getTime() && v.dateClosed <= endOfLastMonth.getTime());

    // Calculate team metrics
    const teamMetrics = ALL_TEAMS.map(team => {
        const teamVideos = allVideos.filter(v => {
            const memberTeam = getTeamByMemberName(v.editorName);
            return memberTeam?.id === team.id && v.phaseTime;
        });

        const videosWithAlteration = teamVideos.filter(v => v.phaseTime?.alterationTimeMs && v.phaseTime.alterationTimeMs > 0).length;
        const alterationRate = teamVideos.length > 0 ? (videosWithAlteration / teamVideos.length) * 100 : 0;

        return {
            teamName: team.name,
            teamColor: team.color,
            totalVideos: teamVideos.length,
            alterationRate: parseFloat(alterationRate.toFixed(1)),
        };
    });

    // Average alteration rate
    const avgAlterationRate = teamMetrics.reduce((acc, t) => acc + t.alterationRate, 0) / teamMetrics.length;

    const handleGeneratePDF = async (type: ReportType) => {
        setIsGenerating(true);
        setSelectedReport(type);

        // Simulate PDF generation (in real implementation, this would call a PDF generation service)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // For now, just show preview
        setShowPreview(true);
        setIsGenerating(false);
    };

    const handleDownload = () => {
        // In real implementation, this would generate and download the PDF
        alert('Funcionalidade de download PDF será implementada na próxima fase.');
    };

    const colorClasses: Record<string, { bg: string; border: string; text: string }> = {
        purple: { bg: 'bg-purple-600/20', border: 'border-purple-500/30', text: 'text-purple-400' },
        blue: { bg: 'bg-blue-600/20', border: 'border-blue-500/30', text: 'text-blue-400' },
        green: { bg: 'bg-green-600/20', border: 'border-green-500/30', text: 'text-green-400' },
        amber: { bg: 'bg-amber-600/20', border: 'border-amber-500/30', text: 'text-amber-400' },
    };

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-white">Central de Relatórios</h1>
                    <p className="text-gray-400 mt-1">
                        Gere relatórios em PDF para diferentes períodos e públicos
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-sm text-gray-500">Dados atualizados em</div>
                    <div className="text-lg text-purple-400">
                        {new Date(lastUpdated).toLocaleString('pt-BR')}
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-6">
                <div className="bg-[#12121a] border border-purple-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center">
                            <Video className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Esta Semana</p>
                            <p className="text-2xl font-bold text-white">{thisWeekVideos.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#12121a] border border-blue-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Este Mês</p>
                            <p className="text-2xl font-bold text-white">{thisMonthVideos.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#12121a] border border-green-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Total Geral</p>
                            <p className="text-2xl font-bold text-white">{kpis.totalVideos}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#12121a] border border-amber-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-amber-600/20 flex items-center justify-center">
                            <Target className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Taxa Alteração</p>
                            <p className="text-2xl font-bold text-white">{avgAlterationRate.toFixed(1)}%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Report Types */}
            <div>
                <h2 className="text-lg font-semibold text-white mb-4">Tipos de Relatório</h2>
                <div className="grid grid-cols-2 gap-6">
                    {reportConfigs.map(config => {
                        const colors = colorClasses[config.color];
                        const Icon = config.icon;

                        return (
                            <div
                                key={config.type}
                                className={`bg-[#12121a] border ${colors.border} rounded-xl p-6 hover:border-opacity-100 transition-colors`}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-lg ${colors.bg} flex items-center justify-center`}>
                                            <Icon className={`w-6 h-6 ${colors.text}`} />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-semibold">{config.label}</h3>
                                            <p className="text-gray-500 text-sm">{config.frequency}</p>
                                        </div>
                                    </div>
                                    <span className={`text-xs ${colors.text} ${colors.bg} px-2 py-1 rounded-full`}>
                                        {config.audience}
                                    </span>
                                </div>

                                <p className="text-gray-400 text-sm mb-4">{config.description}</p>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleGeneratePDF(config.type)}
                                        disabled={isGenerating}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg ${colors.bg} ${colors.text} hover:opacity-80 transition-opacity disabled:opacity-50`}
                                    >
                                        {isGenerating && selectedReport === config.type ? (
                                            <>
                                                <Clock className="w-4 h-4 animate-spin" />
                                                Gerando...
                                            </>
                                        ) : (
                                            <>
                                                <Eye className="w-4 h-4" />
                                                Visualizar
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleDownload}
                                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Preview Section */}
            {showPreview && selectedReport && (
                <div className="bg-[#12121a] border border-purple-900/30 rounded-xl overflow-hidden">
                    <div className="bg-purple-950/50 px-6 py-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">
                            Preview: {reportConfigs.find(r => r.type === selectedReport)?.label}
                        </h2>
                        <button
                            onClick={() => setShowPreview(false)}
                            className="text-gray-400 hover:text-white"
                        >
                            Fechar
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Report Header */}
                        <div className="text-center pb-6 border-b border-purple-900/30">
                            <h1 className="text-2xl font-bold text-white">XMX Corp - Setor de Vídeo</h1>
                            <p className="text-purple-400 mt-1">
                                {selectedReport === 'weekly' && 'Relatório Semanal'}
                                {selectedReport === 'monthly' && 'Relatório Mensal'}
                                {selectedReport === 'bimonthly' && 'Relatório Bimestral'}
                                {selectedReport === 'quarterly' && 'Relatório Trimestral'}
                            </p>
                            <p className="text-gray-500 text-sm mt-2">
                                Gerado em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </p>
                        </div>

                        {/* Summary */}
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-4">Resumo Executivo</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                                    <p className="text-3xl font-bold text-purple-400">
                                        {selectedReport === 'weekly' ? thisWeekVideos.length :
                                            selectedReport === 'monthly' ? thisMonthVideos.length :
                                                kpis.totalVideos}
                                    </p>
                                    <p className="text-gray-400 text-sm">Vídeos Entregues</p>
                                </div>
                                <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                                    <p className="text-3xl font-bold text-blue-400">{kpis.avgHoursPerVideo.toFixed(1)}h</p>
                                    <p className="text-gray-400 text-sm">Tempo Médio/Vídeo</p>
                                </div>
                                <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                                    <p className={`text-3xl font-bold ${avgAlterationRate > 30 ? 'text-red-400' : avgAlterationRate > 20 ? 'text-amber-400' : 'text-green-400'}`}>
                                        {avgAlterationRate.toFixed(1)}%
                                    </p>
                                    <p className="text-gray-400 text-sm">Taxa de Alteração</p>
                                </div>
                            </div>
                        </div>

                        {/* Team Performance */}
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-4">Performance por Equipe</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left text-gray-400 text-sm border-b border-purple-900/30">
                                            <th className="pb-3">Equipe</th>
                                            <th className="pb-3">Vídeos</th>
                                            <th className="pb-3">Taxa Alteração</th>
                                            <th className="pb-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teamMetrics.map(team => (
                                            <tr key={team.teamName} className="border-b border-purple-900/20">
                                                <td className="py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.teamColor }} />
                                                        <span className="text-white">{team.teamName}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 text-white">{team.totalVideos}</td>
                                                <td className={`py-3 ${team.alterationRate > 30 ? 'text-red-400' : team.alterationRate > 20 ? 'text-amber-400' : 'text-green-400'}`}>
                                                    {team.alterationRate}%
                                                </td>
                                                <td className="py-3">
                                                    {team.alterationRate <= 20 ? (
                                                        <span className="flex items-center gap-1 text-green-400 text-sm">
                                                            <CheckCircle className="w-4 h-4" /> Ótimo
                                                        </span>
                                                    ) : team.alterationRate <= 30 ? (
                                                        <span className="flex items-center gap-1 text-amber-400 text-sm">
                                                            <AlertCircle className="w-4 h-4" /> Atenção
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-red-400 text-sm">
                                                            <AlertCircle className="w-4 h-4" /> Crítico
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Action Items */}
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-4">Ações Sugeridas</h3>
                            <div className="space-y-3">
                                {teamMetrics.filter(t => t.alterationRate > 25).map(team => (
                                    <div key={team.teamName} className="flex items-start gap-3 p-3 bg-amber-950/30 border border-amber-900/30 rounded-lg">
                                        <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
                                        <div>
                                            <p className="text-white">Realizar treinamento com equipe <strong>{team.teamName}</strong></p>
                                            <p className="text-gray-400 text-sm">Taxa de alteração em {team.alterationRate}% - acima da meta de 20%</p>
                                        </div>
                                    </div>
                                ))}
                                {teamMetrics.filter(t => t.alterationRate > 25).length === 0 && (
                                    <div className="flex items-start gap-3 p-3 bg-green-950/30 border border-green-900/30 rounded-lg">
                                        <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                                        <div>
                                            <p className="text-white">Todas as equipes dentro da meta!</p>
                                            <p className="text-gray-400 text-sm">Manter o ritmo atual de trabalho</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Download Button */}
                        <div className="pt-6 border-t border-purple-900/30 flex justify-center">
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                <Download className="w-5 h-5" />
                                Baixar PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Report History (Placeholder) */}
            <div className="bg-[#12121a] border border-purple-900/30 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Histórico de Relatórios</h2>
                <p className="text-gray-400 text-sm">
                    O histórico de relatórios gerados será armazenado aqui para consulta futura.
                </p>
                <div className="mt-4 text-center py-8 border border-dashed border-purple-900/30 rounded-lg">
                    <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhum relatório gerado ainda</p>
                </div>
            </div>
        </div>
    );
}
