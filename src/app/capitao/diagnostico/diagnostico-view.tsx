'use client';

import { DashboardKPIs, NormalizedTask } from '@/types';
import { ALL_TEAMS, getTeamByMemberName, getMemberByName } from '@/lib/constants';
import {
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Legend
} from 'recharts';
import {
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Clock,
    Video,
    Users,
    Target,
    Zap
} from 'lucide-react';

interface DiagnosticoViewProps {
    kpis: DashboardKPIs;
    thisWeekVideos: NormalizedTask[];
    lastWeekVideos: NormalizedTask[];
    allVideos: NormalizedTask[];
    lastUpdated: number;
}

interface TeamMetrics {
    teamId: string;
    teamName: string;
    teamColor: string;
    videosThisWeek: number;
    videosLastWeek: number;
    avgEditingTime: number;
    alterationRate: number;
    efficiency: number;
}

interface EditorAlert {
    name: string;
    teamName: string;
    type: 'alteration' | 'productivity' | 'vsl';
    value: number;
    threshold: number;
    color: string;
}

export function DiagnosticoView({
    kpis,
    thisWeekVideos,
    lastWeekVideos,
    allVideos,
    lastUpdated
}: DiagnosticoViewProps) {

    // Calculate team metrics
    const teamMetrics: TeamMetrics[] = ALL_TEAMS.map(team => {
        const teamVideosThisWeek = thisWeekVideos.filter(v => {
            const memberTeam = getTeamByMemberName(v.editorName);
            return memberTeam?.id === team.id;
        });

        const teamVideosLastWeek = lastWeekVideos.filter(v => {
            const memberTeam = getTeamByMemberName(v.editorName);
            return memberTeam?.id === team.id;
        });

        const teamVideosAll = allVideos.filter(v => {
            const memberTeam = getTeamByMemberName(v.editorName);
            return memberTeam?.id === team.id && v.phaseTime;
        });

        const avgEditingTime = teamVideosAll.length > 0
            ? teamVideosAll.reduce((acc, v) => acc + (v.phaseTime?.editingTimeMs || 0), 0) / teamVideosAll.length / 3600000
            : 0;

        const videosWithAlteration = teamVideosAll.filter(v => v.phaseTime?.alterationTimeMs && v.phaseTime.alterationTimeMs > 0).length;
        const alterationRate = teamVideosAll.length > 0 ? (videosWithAlteration / teamVideosAll.length) * 100 : 0;

        const totalHours = teamVideosThisWeek.reduce((acc, v) => acc + v.timeTrackedHours, 0);
        const efficiency = teamVideosThisWeek.length > 0 ? totalHours / teamVideosThisWeek.length : 0;

        return {
            teamId: team.id,
            teamName: team.name,
            teamColor: team.color,
            videosThisWeek: teamVideosThisWeek.length,
            videosLastWeek: teamVideosLastWeek.length,
            avgEditingTime: parseFloat(avgEditingTime.toFixed(2)),
            alterationRate: parseFloat(alterationRate.toFixed(1)),
            efficiency: parseFloat(efficiency.toFixed(2)),
        };
    });

    // Calculate average alteration rate
    const avgAlterationRate = teamMetrics.reduce((acc, t) => acc + t.alterationRate, 0) / teamMetrics.length;

    // Generate alerts
    const alerts: EditorAlert[] = [];

    kpis.editors.forEach(editor => {
        const member = getMemberByName(editor.editorName);
        const team = getTeamByMemberName(editor.editorName);
        if (!member || !team) return;

        const alterationRate = editor.phaseMetrics?.alterationRate || 0;

        // Alert: High alteration rate (above average + 10%)
        if (alterationRate > avgAlterationRate + 10) {
            alerts.push({
                name: editor.editorName,
                teamName: team.name,
                type: 'alteration',
                value: alterationRate,
                threshold: avgAlterationRate,
                color: member.color,
            });
        }

        // Alert: VSL with high alteration (critical focus)
        if (team.id === 'vsl' && alterationRate > 30) {
            alerts.push({
                name: editor.editorName,
                teamName: team.name,
                type: 'vsl',
                value: alterationRate,
                threshold: 30,
                color: member.color,
            });
        }
    });

    // Radar data for gargalos
    const radarData = teamMetrics.map(t => ({
        team: t.teamName,
        'Taxa Alteração': t.alterationRate,
        'Tempo Edição': t.avgEditingTime * 10, // Scale for visibility
        'Volume': t.videosThisWeek * 5, // Scale for visibility
    }));

    // Bar chart data for weekly comparison
    const weeklyComparisonData = teamMetrics.map(t => ({
        name: t.teamName,
        'Esta Semana': t.videosThisWeek,
        'Semana Anterior': t.videosLastWeek,
        fill: t.teamColor,
    }));

    // Global stats
    const totalThisWeek = thisWeekVideos.length;
    const totalLastWeek = lastWeekVideos.length;
    const weeklyChange = totalLastWeek > 0 ? ((totalThisWeek - totalLastWeek) / totalLastWeek) * 100 : 0;

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-white">Diagnóstico Semanal</h1>
                    <p className="text-gray-400 mt-1">
                        Última atualização: {new Date(lastUpdated).toLocaleString('pt-BR')}
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-sm text-gray-500">Semana atual</div>
                    <div className="text-2xl font-bold text-purple-400">
                        {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-6">
                <div className="bg-[#12121a] border border-purple-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center">
                            <Video className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Vídeos Esta Semana</p>
                            <p className="text-2xl font-bold text-white">{totalThisWeek}</p>
                        </div>
                    </div>
                    <div className={`flex items-center gap-1 mt-3 text-sm ${weeklyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {weeklyChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {weeklyChange >= 0 ? '+' : ''}{weeklyChange.toFixed(1)}% vs semana anterior
                    </div>
                </div>

                <div className="bg-[#12121a] border border-purple-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Tempo Médio Edição</p>
                            <p className="text-2xl font-bold text-white">
                                {(teamMetrics.reduce((a, t) => a + t.avgEditingTime, 0) / teamMetrics.length).toFixed(1)}h
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#12121a] border border-purple-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-amber-600/20 flex items-center justify-center">
                            <Target className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Taxa Alteração Média</p>
                            <p className="text-2xl font-bold text-white">{avgAlterationRate.toFixed(1)}%</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#12121a] border border-purple-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center">
                            <Users className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Editores Ativos</p>
                            <p className="text-2xl font-bold text-white">{kpis.editors.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alerts Section */}
            {alerts.length > 0 && (
                <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <h2 className="text-lg font-semibold text-red-400">Alertas Automáticos</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {alerts.map((alert, idx) => (
                            <div
                                key={idx}
                                className="bg-[#12121a] border border-red-900/30 rounded-lg p-4 flex items-center gap-4"
                            >
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: alert.color }}
                                />
                                <div className="flex-1">
                                    <p className="text-white font-medium">{alert.name}</p>
                                    <p className="text-sm text-gray-400">{alert.teamName}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-red-400 font-bold">{alert.value.toFixed(1)}%</p>
                                    <p className="text-xs text-gray-500">
                                        {alert.type === 'alteration' && 'Alta taxa alteração'}
                                        {alert.type === 'vsl' && 'VSL crítico'}
                                        {alert.type === 'productivity' && 'Queda produtividade'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-6">
                {/* Radar de Gargalos */}
                <div className="bg-[#12121a] border border-purple-900/30 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-purple-400" />
                        Radar de Gargalos
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <RadarChart data={radarData}>
                            <PolarGrid stroke="#333" />
                            <PolarAngleAxis dataKey="team" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                            <PolarRadiusAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                            <Radar
                                name="Taxa Alteração"
                                dataKey="Taxa Alteração"
                                stroke="#ef4444"
                                fill="#ef4444"
                                fillOpacity={0.3}
                            />
                            <Radar
                                name="Tempo Edição"
                                dataKey="Tempo Edição"
                                stroke="#8b5cf6"
                                fill="#8b5cf6"
                                fillOpacity={0.3}
                            />
                            <Legend />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#12121a',
                                    border: '1px solid #3b0764',
                                    borderRadius: '8px',
                                }}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>

                {/* Weekly Comparison */}
                <div className="bg-[#12121a] border border-purple-900/30 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-purple-400" />
                        Comparativo Semanal por Equipe
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={weeklyComparisonData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                            <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#12121a',
                                    border: '1px solid #3b0764',
                                    borderRadius: '8px',
                                }}
                            />
                            <Legend />
                            <Bar dataKey="Esta Semana" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Semana Anterior" fill="#4b5563" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Team Cards */}
            <div>
                <h2 className="text-lg font-semibold text-white mb-4">Métricas por Equipe</h2>
                <div className="grid grid-cols-4 gap-4">
                    {teamMetrics.map(team => {
                        const weekChange = team.videosLastWeek > 0
                            ? ((team.videosThisWeek - team.videosLastWeek) / team.videosLastWeek) * 100
                            : 0;

                        return (
                            <div
                                key={team.teamId}
                                className="bg-[#12121a] border border-purple-900/30 rounded-xl p-5"
                            >
                                <div className="flex items-center gap-2 mb-4">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: team.teamColor }}
                                    />
                                    <h3 className="font-semibold text-white">{team.teamName}</h3>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400 text-sm">Vídeos</span>
                                        <span className="text-white font-medium">{team.videosThisWeek}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400 text-sm">Tempo Edição</span>
                                        <span className="text-white font-medium">{team.avgEditingTime}h</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400 text-sm">Taxa Alteração</span>
                                        <span className={`font-medium ${team.alterationRate > 30 ? 'text-red-400' : team.alterationRate > 20 ? 'text-amber-400' : 'text-green-400'}`}>
                                            {team.alterationRate}%
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400 text-sm">Variação</span>
                                        <span className={`text-sm flex items-center gap-1 ${weekChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {weekChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                            {weekChange >= 0 ? '+' : ''}{weekChange.toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
