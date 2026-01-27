"use client";

import { useState, useMemo, useEffect } from 'react';
import { DashboardKPIs, NormalizedTask, EditorStats } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from "@/components/ui/separator";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    Legend, LabelList
} from 'recharts';
import {
    Users, TrendingUp, Target, Award, Clock, Zap, BarChart3, GitCompare,
    ArrowUp, ArrowDown, Calendar, RefreshCw, Timer, ClipboardList, Edit3, RotateCcw, CheckCircle, AlertCircle,
    Lightbulb, AlertTriangle, ThumbsUp, TrendingDown, Activity, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { subDays } from 'date-fns';

// --- CORES FIXAS POR EDITOR (baseado no índice alfabético do nome) ---
const EDITOR_COLORS = [
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
    '#6366f1', // indigo
    '#14b8a6', // teal
    '#a855f7', // purple
    '#eab308', // yellow
];

// Função para obter cor fixa baseada no nome do editor
function getEditorColor(editorName: string, editorList: string[]): string {
    const sortedEditors = [...editorList].sort();
    const index = sortedEditors.indexOf(editorName);
    return EDITOR_COLORS[index % EDITOR_COLORS.length];
}

interface DashboardViewProps {
    initialData: DashboardKPIs;
    lastUpdated: number;
}

// --- CUSTOM TOOLTIP ---
function CustomTooltip({ active, payload, label, editorColors }: any) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl">
                <p className="font-semibold text-white mb-3 pb-2 border-b border-slate-700">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center justify-between gap-6 py-1">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                            <span className="text-slate-300 text-sm">{entry.name}</span>
                        </div>
                        <span className="font-bold text-white text-sm">
                            {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
}

export default function DashboardView({ initialData, lastUpdated }: DashboardViewProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [timeRange, setTimeRange] = useState("all");
    const [viewMode, setViewMode] = useState<'team' | 'compare' | 'details' | 'analysis'>('team');
    const [selectedEditors, setSelectedEditors] = useState<string[]>([]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Lista de todos os editores para cores consistentes
    const allEditorNames = useMemo(() =>
        initialData.editors.map(e => e.editorName),
        [initialData.editors]
    );

    // Mapa de cores por editor
    const editorColorMap = useMemo(() => {
        const map = new Map<string, string>();
        allEditorNames.forEach(name => {
            map.set(name, getEditorColor(name, allEditorNames));
        });
        return map;
    }, [allEditorNames]);

    const ChartWrapper = ({ children }: { children: React.ReactNode }) => {
        if (!isMounted) return <div className="h-full w-full flex items-center justify-center text-slate-400">Carregando...</div>;
        return <>{children}</>;
    };

    // --- FILTER BY TIME RANGE ---
    const filteredVideos = useMemo(() => {
        let videos = initialData.editors.flatMap(e => e.videos);
        const now = new Date();

        if (timeRange === "month") {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            videos = videos.filter(v => new Date(v.dateCreated).getTime() >= startOfMonth.getTime());
        } else if (timeRange === "quarter") {
            const startOfQuarter = subDays(now, 90);
            videos = videos.filter(v => new Date(v.dateCreated).getTime() >= startOfQuarter.getTime());
        } else if (timeRange === "week") {
            const startOfWeek = subDays(now, 7);
            videos = videos.filter(v => new Date(v.dateCreated).getTime() >= startOfWeek.getTime());
        }

        return videos;
    }, [initialData, timeRange]);

    // --- TEAM METRICS ---
    const teamMetrics = useMemo(() => {
        const completedVideos = filteredVideos.filter(v => ['COMPLETED', 'CLOSED', 'DONE'].includes(v.status));
        const totalVideos = completedVideos.length;
        const totalHours = completedVideos.reduce((acc, v) => acc + v.timeTrackedHours, 0);
        const avgEfficiency = totalVideos > 0 ? totalHours / totalVideos : 0;

        // Lead time médio (tempo até conclusão)
        const videosWithLeadTime = completedVideos.filter(v => v.dateClosed && v.dateCreated);
        const avgLeadTime = videosWithLeadTime.length > 0
            ? videosWithLeadTime.reduce((acc, v) => acc + (v.dateClosed! - v.dateCreated) / (1000 * 60 * 60), 0) / videosWithLeadTime.length
            : 0;

        return { totalVideos, totalHours, avgEfficiency, avgLeadTime, activeEditors: initialData.editors.length };
    }, [filteredVideos, initialData.editors]);

    // --- EDITOR STATS (Recalculated based on time filter) ---
    const editorStats = useMemo(() => {
        const statsMap = new Map<string, {
            name: string;
            videos: number;
            hours: number;
            efficiency: number;
            leadTime: number;
            avgTimeToComplete: number;
            inProgress: number;
            color: string;
            // Phase metrics
            avgEditingTime: number;
            avgRevisionTime: number;
            avgAlterationTime: number;
            totalEditingTime: number;
            totalRevisionTime: number;
            totalAlterationTime: number;
            videosWithRevision: number;
            videosWithAlteration: number;
            revisionRate: number;
            alterationRate: number;
        }>();

        filteredVideos.forEach(video => {
            if (!statsMap.has(video.editorName)) {
                statsMap.set(video.editorName, {
                    name: video.editorName,
                    videos: 0,
                    hours: 0,
                    efficiency: 0,
                    leadTime: 0,
                    avgTimeToComplete: 0,
                    inProgress: 0,
                    color: editorColorMap.get(video.editorName) || '#6b7280',
                    avgEditingTime: 0,
                    avgRevisionTime: 0,
                    avgAlterationTime: 0,
                    totalEditingTime: 0,
                    totalRevisionTime: 0,
                    totalAlterationTime: 0,
                    videosWithRevision: 0,
                    videosWithAlteration: 0,
                    revisionRate: 0,
                    alterationRate: 0
                });
            }

            const stats = statsMap.get(video.editorName)!;

            if (['COMPLETED', 'CLOSED', 'DONE'].includes(video.status)) {
                stats.videos += 1;
                stats.hours += video.timeTrackedHours;

                // Tempo até conclusão (lead time)
                if (video.dateClosed && video.dateCreated) {
                    const timeToComplete = (video.dateClosed - video.dateCreated) / (1000 * 60 * 60);
                    stats.leadTime += timeToComplete;
                }

                // Phase time metrics
                if (video.phaseTime) {
                    stats.totalEditingTime += video.phaseTime.editingTimeMs / (1000 * 60 * 60);
                    stats.totalRevisionTime += video.phaseTime.revisionTimeMs / (1000 * 60 * 60);
                    stats.totalAlterationTime += (video.phaseTime.alterationTimeMs || 0) / (1000 * 60 * 60);
                    if (video.phaseTime.revisionTimeMs > 0) {
                        stats.videosWithRevision += 1;
                    }
                    if (video.phaseTime.alterationTimeMs && video.phaseTime.alterationTimeMs > 0) {
                        stats.videosWithAlteration += 1;
                    }
                }
            } else if (['IN PROGRESS', 'DOING', 'REVIEW'].includes(video.status)) {
                stats.inProgress += 1;
            }
        });

        // Calculate averages
        return Array.from(statsMap.values()).map(s => ({
            ...s,
            efficiency: s.videos > 0 ? s.hours / s.videos : 0,
            avgTimeToComplete: s.videos > 0 ? s.leadTime / s.videos : 0,
            avgEditingTime: s.videos > 0 ? s.totalEditingTime / s.videos : 0,
            avgRevisionTime: s.videos > 0 ? s.totalRevisionTime / s.videos : 0,
            avgAlterationTime: s.videos > 0 ? s.totalAlterationTime / s.videos : 0,
            revisionRate: s.videos > 0 ? (s.videosWithRevision / s.videos) * 100 : 0,
            alterationRate: s.videos > 0 ? (s.videosWithAlteration / s.videos) * 100 : 0
        })).sort((a, b) => b.videos - a.videos);
    }, [filteredVideos, editorColorMap]);

    // --- COMPARISON DATA ---
    const comparisonData = useMemo(() => {
        if (selectedEditors.length < 2) return null;

        const editors = selectedEditors.map(name => editorStats.find(e => e.name === name)).filter(Boolean) as typeof editorStats;
        const teamAvg = {
            videos: teamMetrics.totalVideos / teamMetrics.activeEditors,
            efficiency: teamMetrics.avgEfficiency,
            leadTime: teamMetrics.avgLeadTime
        };

        return { editors, teamAvg };
    }, [selectedEditors, editorStats, teamMetrics]);

    // --- RADAR DATA FOR COMPARISON ---
    const radarData = useMemo(() => {
        if (!comparisonData) return [];

        const maxVideos = Math.max(...editorStats.map(e => e.videos), 1);
        const maxEfficiency = Math.max(...editorStats.map(e => e.efficiency), 1);
        const maxLeadTime = Math.max(...editorStats.map(e => e.avgTimeToComplete), 1);

        return [
            {
                metric: 'Volume',
                ...Object.fromEntries(comparisonData.editors.map(e => [e.name, (e.videos / maxVideos) * 100])),
                'Média Equipe': (comparisonData.teamAvg.videos / maxVideos) * 100
            },
            {
                metric: 'Eficiência',
                ...Object.fromEntries(comparisonData.editors.map(e => [e.name, e.efficiency > 0 ? (1 - e.efficiency / maxEfficiency) * 100 : 0])),
                'Média Equipe': comparisonData.teamAvg.efficiency > 0 ? (1 - comparisonData.teamAvg.efficiency / maxEfficiency) * 100 : 0
            },
            {
                metric: 'Agilidade',
                ...Object.fromEntries(comparisonData.editors.map(e => [e.name, e.avgTimeToComplete > 0 ? (1 - e.avgTimeToComplete / maxLeadTime) * 100 : 0])),
                'Média Equipe': comparisonData.teamAvg.leadTime > 0 ? (1 - comparisonData.teamAvg.leadTime / maxLeadTime) * 100 : 0
            },
            {
                metric: 'Consistência',
                ...Object.fromEntries(comparisonData.editors.map(e => [e.name, e.videos > 0 ? Math.min((e.videos / (e.hours || 1)) * 30, 100) : 0])),
                'Média Equipe': teamMetrics.totalVideos > 0 ? Math.min((teamMetrics.totalVideos / (teamMetrics.totalHours || 1)) * 30, 100) : 0
            }
        ];
    }, [comparisonData, editorStats, teamMetrics]);

    // --- ANÁLISE DE INSIGHTS E PONTOS DE MELHORIA ---
    const analysisData = useMemo(() => {
        if (editorStats.length === 0) return null;

        // Calcular médias da equipe
        const teamAvgEditing = editorStats.reduce((acc, e) => acc + e.avgEditingTime, 0) / editorStats.length;
        const teamAvgRevision = editorStats.reduce((acc, e) => acc + e.avgRevisionTime, 0) / editorStats.length;
        const teamAvgAlteration = editorStats.reduce((acc, e) => acc + e.avgAlterationTime, 0) / editorStats.length;
        const teamAvgEfficiency = editorStats.reduce((acc, e) => acc + e.efficiency, 0) / editorStats.length;
        const teamAvgLeadTime = editorStats.reduce((acc, e) => acc + e.avgTimeToComplete, 0) / editorStats.length;
        const teamAvgVideos = editorStats.reduce((acc, e) => acc + e.videos, 0) / editorStats.length;
        const teamAvgRevisionRate = editorStats.reduce((acc, e) => acc + e.revisionRate, 0) / editorStats.length;
        const teamAvgAlterationRate = editorStats.reduce((acc, e) => acc + e.alterationRate, 0) / editorStats.length;

        // Análise individual de cada editor
        const editorAnalysis = editorStats.filter(e => e.videos > 0).map(editor => {
            const strengths: string[] = [];
            const improvements: string[] = [];
            let score = 50; // Score base

            // Análise de Volume
            if (editor.videos > teamAvgVideos * 1.2) {
                strengths.push('Alto volume de entregas');
                score += 15;
            } else if (editor.videos < teamAvgVideos * 0.7) {
                improvements.push('Aumentar volume de entregas');
                score -= 10;
            }

            // Análise de Tempo de Edição
            if (editor.avgEditingTime > 0 && editor.avgEditingTime < teamAvgEditing * 0.8) {
                strengths.push('Edição rápida');
                score += 10;
            } else if (editor.avgEditingTime > teamAvgEditing * 1.3) {
                improvements.push('Reduzir tempo de edição');
                score -= 10;
            }

            // Análise de Taxa de Revisão
            if (editor.revisionRate < teamAvgRevisionRate * 0.7) {
                strengths.push('Baixa taxa de revisão (qualidade)');
                score += 15;
            } else if (editor.revisionRate > teamAvgRevisionRate * 1.3) {
                improvements.push('Reduzir retrabalhos (revisão)');
                score -= 15;
            }

            // Análise de Taxa de Alteração
            if (editor.alterationRate < teamAvgAlterationRate * 0.7) {
                strengths.push('Poucas alterações necessárias');
                score += 10;
            } else if (editor.alterationRate > teamAvgAlterationRate * 1.3) {
                improvements.push('Reduzir alterações pós-revisão');
                score -= 10;
            }

            // Análise de Lead Time
            if (editor.avgTimeToComplete > 0 && editor.avgTimeToComplete < teamAvgLeadTime * 0.8) {
                strengths.push('Entregas rápidas');
                score += 10;
            } else if (editor.avgTimeToComplete > teamAvgLeadTime * 1.3) {
                improvements.push('Acelerar ciclo de entrega');
                score -= 10;
            }

            // Análise de Eficiência (h/vídeo)
            if (editor.efficiency > 0 && editor.efficiency < teamAvgEfficiency * 0.8) {
                strengths.push('Alta eficiência (menos horas por vídeo)');
                score += 10;
            } else if (editor.efficiency > teamAvgEfficiency * 1.3) {
                improvements.push('Melhorar eficiência');
                score -= 5;
            }

            // Garantir score entre 0 e 100
            score = Math.max(0, Math.min(100, score));

            return {
                name: editor.name,
                color: editor.color,
                score,
                strengths,
                improvements,
                metrics: {
                    videos: editor.videos,
                    avgEditingTime: editor.avgEditingTime,
                    avgRevisionTime: editor.avgRevisionTime,
                    avgAlterationTime: editor.avgAlterationTime,
                    revisionRate: editor.revisionRate,
                    alterationRate: editor.alterationRate,
                    efficiency: editor.efficiency,
                    avgTimeToComplete: editor.avgTimeToComplete
                },
                vsTeam: {
                    videos: ((editor.videos - teamAvgVideos) / teamAvgVideos) * 100,
                    editingTime: teamAvgEditing > 0 ? ((editor.avgEditingTime - teamAvgEditing) / teamAvgEditing) * 100 : 0,
                    revisionRate: teamAvgRevisionRate > 0 ? ((editor.revisionRate - teamAvgRevisionRate) / teamAvgRevisionRate) * 100 : 0,
                    alterationRate: teamAvgAlterationRate > 0 ? ((editor.alterationRate - teamAvgAlterationRate) / teamAvgAlterationRate) * 100 : 0,
                    efficiency: teamAvgEfficiency > 0 ? ((editor.efficiency - teamAvgEfficiency) / teamAvgEfficiency) * 100 : 0
                }
            };
        }).sort((a, b) => b.score - a.score);

        // Insights da equipe
        const teamInsights: { type: 'positive' | 'warning' | 'info'; message: string }[] = [];

        // Taxa de revisão alta da equipe
        if (teamAvgRevisionRate > 50) {
            teamInsights.push({
                type: 'warning',
                message: `Taxa de revisão alta (${teamAvgRevisionRate.toFixed(0)}%) - considere melhorar briefings ou checkpoints intermediários`
            });
        }

        // Taxa de alteração alta
        if (teamAvgAlterationRate > 30) {
            teamInsights.push({
                type: 'warning',
                message: `Taxa de alteração de ${teamAvgAlterationRate.toFixed(0)}% - revisar processo de aprovação`
            });
        }

        // Editores com performance muito abaixo
        const lowPerformers = editorAnalysis.filter(e => e.score < 40);
        if (lowPerformers.length > 0) {
            teamInsights.push({
                type: 'warning',
                message: `${lowPerformers.length} editor(es) precisam de atenção: ${lowPerformers.map(e => e.name).join(', ')}`
            });
        }

        // Editores destaque
        const topPerformers = editorAnalysis.filter(e => e.score >= 70);
        if (topPerformers.length > 0) {
            teamInsights.push({
                type: 'positive',
                message: `${topPerformers.length} editor(es) com excelente performance: ${topPerformers.map(e => e.name).join(', ')}`
            });
        }

        // Distribuição de carga
        const maxVideos = Math.max(...editorStats.map(e => e.videos));
        const minVideos = Math.min(...editorStats.filter(e => e.videos > 0).map(e => e.videos));
        if (maxVideos > minVideos * 3) {
            teamInsights.push({
                type: 'info',
                message: 'Distribuição de tarefas desigual - considere balancear carga entre editores'
            });
        }

        return {
            editors: editorAnalysis,
            teamInsights,
            teamAverages: {
                editingTime: teamAvgEditing,
                revisionTime: teamAvgRevision,
                alterationTime: teamAvgAlteration,
                efficiency: teamAvgEfficiency,
                leadTime: teamAvgLeadTime,
                videos: teamAvgVideos,
                revisionRate: teamAvgRevisionRate,
                alterationRate: teamAvgAlterationRate
            }
        };
    }, [editorStats]);

    // Toggle editor selection for comparison (até 6 editores)
    const toggleEditorSelection = (editorName: string) => {
        setSelectedEditors(prev => {
            if (prev.includes(editorName)) {
                return prev.filter(e => e !== editorName);
            }
            if (prev.length >= 6) {
                return [...prev.slice(1), editorName];
            }
            return [...prev, editorName];
        });
    };

    // Formatar horas para exibição
    const formatHours = (hours: number) => {
        if (hours < 24) return `${hours.toFixed(0)}h`;
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return `${days}d ${remainingHours.toFixed(0)}h`;
    };

    // --- RENDER ---
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-6 lg:p-8">

            {/* HEADER */}
            <header className="mb-8">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                            Painel de Gestão
                            <span className="text-blue-500 ml-2">Audiovisual</span>
                        </h1>
                        <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                            <RefreshCw className="w-3 h-3" />
                            Atualizado: {new Date(lastUpdated).toLocaleString('pt-BR')}
                        </p>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap gap-2">
                        {/* View Mode Toggle */}
                        <div className="flex bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewMode('team')}
                                className={cn(
                                    "rounded-md px-4 transition-all",
                                    viewMode === 'team'
                                        ? "bg-blue-600 text-white hover:bg-blue-700"
                                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                                )}
                            >
                                <Users className="w-4 h-4 mr-2" />
                                Equipe
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewMode('compare')}
                                className={cn(
                                    "rounded-md px-4 transition-all",
                                    viewMode === 'compare'
                                        ? "bg-blue-600 text-white hover:bg-blue-700"
                                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                                )}
                            >
                                <GitCompare className="w-4 h-4 mr-2" />
                                Comparar
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewMode('details')}
                                className={cn(
                                    "rounded-md px-4 transition-all",
                                    viewMode === 'details'
                                        ? "bg-blue-600 text-white hover:bg-blue-700"
                                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                                )}
                            >
                                <ClipboardList className="w-4 h-4 mr-2" />
                                Detalhes
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewMode('analysis')}
                                className={cn(
                                    "rounded-md px-4 transition-all",
                                    viewMode === 'analysis'
                                        ? "bg-blue-600 text-white hover:bg-blue-700"
                                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                                )}
                            >
                                <Lightbulb className="w-4 h-4 mr-2" />
                                Análise
                            </Button>
                        </div>

                        {/* Time Range */}
                        <Select value={timeRange} onValueChange={setTimeRange}>
                            <SelectTrigger className="w-[140px] bg-slate-800/50 border-slate-700/50 text-slate-200">
                                <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="all">Todo Período</SelectItem>
                                <SelectItem value="week">Esta Semana</SelectItem>
                                <SelectItem value="month">Este Mês</SelectItem>
                                <SelectItem value="quarter">Trimestre</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </header>

            {/* TEAM VIEW */}
            {viewMode === 'team' && (
                <>
                    {/* KPI CARDS */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                        <MetricCard
                            title="Entregas"
                            value={teamMetrics.totalVideos}
                            icon={Target}
                            color="blue"
                            subtitle="vídeos concluídos"
                        />
                        <MetricCard
                            title="Horas Totais"
                            value={teamMetrics.totalHours.toFixed(0)}
                            suffix="h"
                            icon={Clock}
                            color="violet"
                            subtitle="tempo registrado"
                        />
                        <MetricCard
                            title="Eficiência"
                            value={teamMetrics.avgEfficiency.toFixed(1)}
                            suffix="h/vídeo"
                            icon={Zap}
                            color="emerald"
                            subtitle="média da equipe"
                        />
                        <MetricCard
                            title="Tempo Médio"
                            value={formatHours(teamMetrics.avgLeadTime)}
                            icon={Timer}
                            color="amber"
                            subtitle="até conclusão"
                        />
                        <MetricCard
                            title="Editores"
                            value={teamMetrics.activeEditors}
                            icon={Users}
                            color="cyan"
                            subtitle="ativos no período"
                        />
                    </div>

                    {/* MAIN CONTENT */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-6">

                        {/* GRÁFICO DE BARRAS VERTICAL */}
                        <Card className="xl:col-span-8 bg-slate-900/50 border-slate-800/50 backdrop-blur">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-medium text-slate-200 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-blue-500" />
                                    Volume de Entregas por Editor
                                </CardTitle>
                                <CardDescription className="text-slate-500">
                                    Cada editor possui uma cor fixa para identificação
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-[400px]">
                                <ChartWrapper>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={editorStats} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                            <XAxis
                                                dataKey="name"
                                                stroke="#64748b"
                                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                                axisLine={false}
                                                tickLine={false}
                                                angle={-45}
                                                textAnchor="end"
                                                height={60}
                                                interval={0}
                                            />
                                            <YAxis
                                                stroke="#64748b"
                                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                            <Bar dataKey="videos" name="Concluídos" radius={[6, 6, 0, 0]} maxBarSize={50}>
                                                {editorStats.map((entry) => (
                                                    <Cell key={entry.name} fill={entry.color} />
                                                ))}
                                                <LabelList dataKey="videos" position="top" fill="#fff" fontSize={12} fontWeight="bold" />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartWrapper>
                            </CardContent>
                        </Card>

                        {/* RANKING DOS EDITORES */}
                        <Card className="xl:col-span-4 bg-slate-900/50 border-slate-800/50 backdrop-blur">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-medium text-slate-200 flex items-center gap-2">
                                    <Award className="w-4 h-4 text-amber-500" />
                                    Ranking de Performance
                                </CardTitle>
                                <CardDescription className="text-slate-500">
                                    Clique para selecionar e comparar
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-1 max-h-[360px] overflow-y-auto">
                                {editorStats.map((editor, index) => (
                                    <div
                                        key={editor.name}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer group",
                                            "hover:bg-slate-800/70",
                                            selectedEditors.includes(editor.name) && "bg-slate-800/50 ring-1 ring-blue-500/50"
                                        )}
                                        onClick={() => toggleEditorSelection(editor.name)}
                                    >
                                        {/* Posição */}
                                        <div className={cn(
                                            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                                            index === 0 ? "bg-amber-500 text-black" :
                                                index === 1 ? "bg-slate-300 text-black" :
                                                    index === 2 ? "bg-amber-700 text-white" :
                                                        "bg-slate-700 text-slate-400"
                                        )}>
                                            {index + 1}
                                        </div>

                                        {/* Cor do editor */}
                                        <div
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: editor.color }}
                                        />

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-200 truncate text-sm">{editor.name}</p>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span>{editor.efficiency.toFixed(1)}h/vídeo</span>
                                                <span>•</span>
                                                <span>{formatHours(editor.avgTimeToComplete)} até concluir</span>
                                            </div>
                                        </div>

                                        {/* Volume */}
                                        <div className="text-right flex-shrink-0">
                                            <p className="font-bold text-lg text-white">{editor.videos}</p>
                                            <p className="text-xs text-slate-500">vídeos</p>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    {/* TABELA DETALHADA */}
                    <Card className="bg-slate-900/50 border-slate-800/50 backdrop-blur overflow-hidden">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-medium text-slate-200 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                                Métricas Individuais vs Equipe
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-800/50">
                                        <tr>
                                            <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Editor</th>
                                            <th className="text-center px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Entregas</th>
                                            <th className="text-center px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Horas</th>
                                            <th className="text-center px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Eficiência</th>
                                            <th className="text-center px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Tempo até Conclusão</th>
                                            <th className="text-center px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Em Andamento</th>
                                            <th className="text-center px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">vs Equipe</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {editorStats.map((editor, index) => {
                                            const efficiencyDiff = teamMetrics.avgEfficiency > 0
                                                ? ((editor.efficiency - teamMetrics.avgEfficiency) / teamMetrics.avgEfficiency) * 100
                                                : 0;
                                            const isAboveAvg = editor.efficiency < teamMetrics.avgEfficiency;

                                            return (
                                                <tr
                                                    key={editor.name}
                                                    className={cn(
                                                        "hover:bg-slate-800/30 transition-colors",
                                                        selectedEditors.includes(editor.name) && "bg-blue-500/5"
                                                    )}
                                                >
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className="w-3 h-8 rounded-full"
                                                                style={{ backgroundColor: editor.color }}
                                                            />
                                                            <div>
                                                                <p className="font-medium text-white">{editor.name}</p>
                                                                <p className="text-xs text-slate-500">#{index + 1} no ranking</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-center px-4 py-3">
                                                        <span className="font-bold text-white text-lg">{editor.videos}</span>
                                                    </td>
                                                    <td className="text-center px-4 py-3 text-slate-300">
                                                        {editor.hours.toFixed(0)}h
                                                    </td>
                                                    <td className="text-center px-4 py-3">
                                                        <span className="font-medium text-white">{editor.efficiency.toFixed(1)}h</span>
                                                        <span className="text-slate-500 text-xs">/vídeo</span>
                                                    </td>
                                                    <td className="text-center px-4 py-3 text-slate-300">
                                                        {formatHours(editor.avgTimeToComplete)}
                                                    </td>
                                                    <td className="text-center px-4 py-3">
                                                        {editor.inProgress > 0 ? (
                                                            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                                                                {editor.inProgress}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-slate-600">-</span>
                                                        )}
                                                    </td>
                                                    <td className="text-center px-4 py-3">
                                                        {editor.videos > 0 && (
                                                            <Badge
                                                                variant="outline"
                                                                className={cn(
                                                                    "border-0",
                                                                    isAboveAvg
                                                                        ? "bg-emerald-500/10 text-emerald-400"
                                                                        : "bg-red-500/10 text-red-400"
                                                                )}
                                                            >
                                                                {isAboveAvg ? (
                                                                    <ArrowUp className="w-3 h-3 mr-1" />
                                                                ) : (
                                                                    <ArrowDown className="w-3 h-3 mr-1" />
                                                                )}
                                                                {Math.abs(efficiencyDiff).toFixed(0)}%
                                                            </Badge>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {/* Linha da média da equipe */}
                                        <tr className="bg-slate-800/30 font-medium">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-3 h-8 rounded-full bg-gradient-to-b from-blue-500 to-violet-500" />
                                                    <p className="text-slate-300">Média da Equipe</p>
                                                </div>
                                            </td>
                                            <td className="text-center px-4 py-3 text-slate-300">
                                                {(teamMetrics.totalVideos / teamMetrics.activeEditors).toFixed(1)}
                                            </td>
                                            <td className="text-center px-4 py-3 text-slate-300">
                                                {(teamMetrics.totalHours / teamMetrics.activeEditors).toFixed(0)}h
                                            </td>
                                            <td className="text-center px-4 py-3 text-slate-300">
                                                {teamMetrics.avgEfficiency.toFixed(1)}h/vídeo
                                            </td>
                                            <td className="text-center px-4 py-3 text-slate-300">
                                                {formatHours(teamMetrics.avgLeadTime)}
                                            </td>
                                            <td className="text-center px-4 py-3 text-slate-300">-</td>
                                            <td className="text-center px-4 py-3 text-slate-400">Base</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            {/* COMPARISON VIEW */}
            {viewMode === 'compare' && (
                <>
                    {/* Editor Selection */}
                    <Card className="mb-6 bg-slate-900/50 border-slate-800/50 backdrop-blur">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-medium text-slate-200">
                                Selecione até 6 editores para comparar
                            </CardTitle>
                            <CardDescription className="text-slate-500">
                                {selectedEditors.length}/6 selecionados
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {editorStats.map(editor => (
                                    <Button
                                        key={editor.name}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => toggleEditorSelection(editor.name)}
                                        className={cn(
                                            "transition-all gap-2",
                                            selectedEditors.includes(editor.name)
                                                ? "border-2 text-white"
                                                : "bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800"
                                        )}
                                        style={{
                                            borderColor: selectedEditors.includes(editor.name) ? editor.color : undefined,
                                            backgroundColor: selectedEditors.includes(editor.name) ? `${editor.color}20` : undefined
                                        }}
                                    >
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: editor.color }}
                                        />
                                        {editor.name}
                                        {selectedEditors.includes(editor.name) && (
                                            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
                                                {selectedEditors.indexOf(editor.name) + 1}
                                            </span>
                                        )}
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {selectedEditors.length >= 2 && comparisonData ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Radar Chart */}
                            <Card className="bg-slate-900/50 border-slate-800/50 backdrop-blur">
                                <CardHeader>
                                    <CardTitle className="text-base font-medium text-slate-200">
                                        Análise Comparativa
                                    </CardTitle>
                                    <CardDescription className="text-slate-500">
                                        Performance relativa em múltiplas dimensões (quanto maior, melhor)
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="h-[400px]">
                                    <ChartWrapper>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart data={radarData}>
                                                <PolarGrid stroke="#334155" />
                                                <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                                                {comparisonData.editors.map((editor) => (
                                                    <Radar
                                                        key={editor.name}
                                                        name={editor.name}
                                                        dataKey={editor.name}
                                                        stroke={editor.color}
                                                        fill={editor.color}
                                                        fillOpacity={0.2}
                                                        strokeWidth={2}
                                                    />
                                                ))}
                                                <Radar
                                                    name="Média Equipe"
                                                    dataKey="Média Equipe"
                                                    stroke="#6b7280"
                                                    fill="#6b7280"
                                                    fillOpacity={0.1}
                                                    strokeWidth={2}
                                                    strokeDasharray="5 5"
                                                />
                                                <Legend />
                                                <Tooltip content={<CustomTooltip />} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </ChartWrapper>
                                </CardContent>
                            </Card>

                            {/* Comparison Table */}
                            <Card className="bg-slate-900/50 border-slate-800/50 backdrop-blur">
                                <CardHeader>
                                    <CardTitle className="text-base font-medium text-slate-200">
                                        Métricas Detalhadas
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {/* Headers */}
                                        <div className={cn("grid gap-4 pb-3 border-b border-slate-700", `grid-cols-${comparisonData.editors.length + 2}`)}>
                                            <div className="text-sm text-slate-500">Métrica</div>
                                            {comparisonData.editors.map((editor) => (
                                                <div key={editor.name} className="text-sm font-medium text-center flex items-center justify-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: editor.color }} />
                                                    <span style={{ color: editor.color }}>{editor.name}</span>
                                                </div>
                                            ))}
                                            <div className="text-sm text-slate-500 text-center">Equipe</div>
                                        </div>

                                        {/* Rows */}
                                        <ComparisonRow
                                            label="Vídeos Entregues"
                                            values={comparisonData.editors.map(e => e.videos)}
                                            teamValue={comparisonData.teamAvg.videos}
                                            format="number"
                                            colors={comparisonData.editors.map(e => e.color)}
                                        />
                                        <ComparisonRow
                                            label="Horas Totais"
                                            values={comparisonData.editors.map(e => e.hours)}
                                            teamValue={teamMetrics.totalHours / teamMetrics.activeEditors}
                                            format="hours"
                                            colors={comparisonData.editors.map(e => e.color)}
                                        />
                                        <ComparisonRow
                                            label="Eficiência"
                                            values={comparisonData.editors.map(e => e.efficiency)}
                                            teamValue={comparisonData.teamAvg.efficiency}
                                            format="efficiency"
                                            lowerIsBetter
                                            colors={comparisonData.editors.map(e => e.color)}
                                        />
                                        <ComparisonRow
                                            label="Tempo até Conclusão"
                                            values={comparisonData.editors.map(e => e.avgTimeToComplete)}
                                            teamValue={comparisonData.teamAvg.leadTime}
                                            format="hours"
                                            lowerIsBetter
                                            colors={comparisonData.editors.map(e => e.color)}
                                        />
                                        <ComparisonRow
                                            label="Em Andamento"
                                            values={comparisonData.editors.map(e => e.inProgress)}
                                            teamValue={filteredVideos.filter(v => ['IN PROGRESS', 'DOING', 'REVIEW'].includes(v.status)).length / teamMetrics.activeEditors}
                                            format="number"
                                            colors={comparisonData.editors.map(e => e.color)}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Individual Cards */}
                            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {comparisonData.editors.map((editor) => (
                                    <Card key={editor.name} className="bg-slate-900/50 border-slate-800/50 backdrop-blur overflow-hidden">
                                        <div className="h-1" style={{ backgroundColor: editor.color }} />
                                        <CardContent className="pt-4">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div
                                                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white"
                                                    style={{ backgroundColor: editor.color }}
                                                >
                                                    {editor.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-white">{editor.name}</p>
                                                    <p className="text-xs text-slate-500">Performance Individual</p>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <StatRow
                                                    label="Entregas"
                                                    value={editor.videos}
                                                    comparison={comparisonData.teamAvg.videos}
                                                    color={editor.color}
                                                />
                                                <StatRow
                                                    label="Eficiência"
                                                    value={editor.efficiency}
                                                    comparison={comparisonData.teamAvg.efficiency}
                                                    suffix="h/vídeo"
                                                    lowerIsBetter
                                                    color={editor.color}
                                                />
                                                <StatRow
                                                    label="Tempo até Conclusão"
                                                    value={editor.avgTimeToComplete}
                                                    comparison={comparisonData.teamAvg.leadTime}
                                                    suffix="h"
                                                    lowerIsBetter
                                                    color={editor.color}
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                            <GitCompare className="w-16 h-16 mb-4 opacity-50" />
                            <p className="text-lg">Selecione pelo menos 2 editores para comparar</p>
                            <p className="text-sm mt-2">Clique nos nomes acima para selecionar</p>
                        </div>
                    )}
                </>
            )}

            {/* DETAILS VIEW - Phase Metrics */}
            {viewMode === 'details' && (
                <>
                    {/* Phase KPIs */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/20 backdrop-blur">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Tempo Médio Edição</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold text-white">
                                                {formatHours(editorStats.reduce((acc, e) => acc + e.avgEditingTime, 0) / (editorStats.length || 1))}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">média da equipe</p>
                                    </div>
                                    <Edit3 className="w-8 h-8 opacity-50 text-blue-500" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-amber-500/20 backdrop-blur">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Tempo Médio Revisão</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold text-white">
                                                {formatHours(editorStats.reduce((acc, e) => acc + e.avgRevisionTime, 0) / (editorStats.length || 1))}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">média da equipe</p>
                                    </div>
                                    <RotateCcw className="w-8 h-8 opacity-50 text-amber-500" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border-orange-500/20 backdrop-blur">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Tempo Médio Alteração</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold text-white">
                                                {formatHours(editorStats.reduce((acc, e) => acc + e.avgAlterationTime, 0) / (editorStats.length || 1))}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">média da equipe</p>
                                    </div>
                                    <AlertCircle className="w-8 h-8 opacity-50 text-orange-500" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 backdrop-blur">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Taxa de Alteração</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold text-white">
                                                {(editorStats.reduce((acc, e) => acc + e.alterationRate, 0) / (editorStats.length || 1)).toFixed(0)}
                                            </span>
                                            <span className="text-sm text-slate-400">%</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">vídeos com alteração</p>
                                    </div>
                                    <CheckCircle className="w-8 h-8 opacity-50 text-emerald-500" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Second Row of KPIs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="bg-gradient-to-br from-violet-500/20 to-violet-500/5 border-violet-500/20 backdrop-blur">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Total Horas Edição</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold text-white">
                                                {editorStats.reduce((acc, e) => acc + e.totalEditingTime, 0).toFixed(0)}
                                            </span>
                                            <span className="text-sm text-slate-400">h</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">toda a equipe</p>
                                    </div>
                                    <Clock className="w-8 h-8 opacity-50 text-violet-500" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-amber-500/20 backdrop-blur">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Total Horas Revisão</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold text-white">
                                                {editorStats.reduce((acc, e) => acc + e.totalRevisionTime, 0).toFixed(0)}
                                            </span>
                                            <span className="text-sm text-slate-400">h</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">toda a equipe</p>
                                    </div>
                                    <RotateCcw className="w-8 h-8 opacity-50 text-amber-500" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border-orange-500/20 backdrop-blur">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Total Horas Alteração</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold text-white">
                                                {editorStats.reduce((acc, e) => acc + e.totalAlterationTime, 0).toFixed(0)}
                                            </span>
                                            <span className="text-sm text-slate-400">h</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">toda a equipe</p>
                                    </div>
                                    <AlertCircle className="w-8 h-8 opacity-50 text-orange-500" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 backdrop-blur">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Taxa de Revisão</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold text-white">
                                                {(editorStats.reduce((acc, e) => acc + e.revisionRate, 0) / (editorStats.length || 1)).toFixed(0)}
                                            </span>
                                            <span className="text-sm text-slate-400">%</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">vídeos com revisão</p>
                                    </div>
                                    <CheckCircle className="w-8 h-8 opacity-50 text-emerald-500" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Detailed Table */}
                    <Card className="bg-slate-900/50 border-slate-800/50 backdrop-blur overflow-hidden">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-medium text-slate-200 flex items-center gap-2">
                                <ClipboardList className="w-4 h-4 text-blue-500" />
                                Métricas por Fase do Workflow
                            </CardTitle>
                            <CardDescription className="text-slate-500">
                                Tempo em cada etapa: Edição → Revisão → Alteração → Aprovação
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-800/50">
                                        <tr>
                                            <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Editor</th>
                                            <th className="text-center px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Vídeos</th>
                                            <th className="text-center px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Edit3 className="w-3 h-3" />
                                                    Tempo Edição
                                                </div>
                                            </th>
                                            <th className="text-center px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                <div className="flex items-center justify-center gap-1">
                                                    <RotateCcw className="w-3 h-3" />
                                                    Tempo Revisão
                                                </div>
                                            </th>
                                            <th className="text-center px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                <div className="flex items-center justify-center gap-1">
                                                    <AlertCircle className="w-3 h-3" />
                                                    Tempo Alteração
                                                </div>
                                            </th>
                                            <th className="text-center px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Taxa Revisão</th>
                                            <th className="text-center px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Taxa Alteração</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {editorStats.map((editor, index) => (
                                            <tr key={editor.name} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-3 h-8 rounded-full"
                                                            style={{ backgroundColor: editor.color }}
                                                        />
                                                        <div>
                                                            <p className="font-medium text-white">{editor.name}</p>
                                                            <p className="text-xs text-slate-500">#{index + 1} no ranking</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="text-center px-4 py-3">
                                                    <span className="font-bold text-white text-lg">{editor.videos}</span>
                                                </td>
                                                <td className="text-center px-4 py-3">
                                                    <span className="font-medium text-blue-400">{formatHours(editor.avgEditingTime)}</span>
                                                    <span className="text-slate-500 text-xs ml-1">média</span>
                                                </td>
                                                <td className="text-center px-4 py-3">
                                                    {editor.avgRevisionTime > 0 ? (
                                                        <span className="font-medium text-amber-400">{formatHours(editor.avgRevisionTime)}</span>
                                                    ) : (
                                                        <span className="text-slate-600">-</span>
                                                    )}
                                                </td>
                                                <td className="text-center px-4 py-3">
                                                    {editor.avgAlterationTime > 0 ? (
                                                        <span className="font-medium text-orange-400">{formatHours(editor.avgAlterationTime)}</span>
                                                    ) : (
                                                        <span className="text-slate-600">-</span>
                                                    )}
                                                </td>
                                                <td className="text-center px-4 py-3">
                                                    {editor.revisionRate > 0 ? (
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                "border-0",
                                                                editor.revisionRate < 30
                                                                    ? "bg-emerald-500/10 text-emerald-400"
                                                                    : editor.revisionRate < 60
                                                                    ? "bg-amber-500/10 text-amber-400"
                                                                    : "bg-red-500/10 text-red-400"
                                                            )}
                                                        >
                                                            {editor.revisionRate.toFixed(0)}%
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-0">
                                                            0%
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="text-center px-4 py-3">
                                                    {editor.alterationRate > 0 ? (
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                "border-0",
                                                                editor.alterationRate < 30
                                                                    ? "bg-emerald-500/10 text-emerald-400"
                                                                    : editor.alterationRate < 60
                                                                    ? "bg-orange-500/10 text-orange-400"
                                                                    : "bg-red-500/10 text-red-400"
                                                            )}
                                                        >
                                                            {editor.alterationRate.toFixed(0)}%
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-0">
                                                            0%
                                                        </Badge>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {/* Team average row */}
                                        <tr className="bg-slate-800/30 font-medium">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-3 h-8 rounded-full bg-gradient-to-b from-blue-500 to-violet-500" />
                                                    <p className="text-slate-300">Média da Equipe</p>
                                                </div>
                                            </td>
                                            <td className="text-center px-4 py-3 text-slate-300">
                                                {(editorStats.reduce((acc, e) => acc + e.videos, 0) / (editorStats.length || 1)).toFixed(1)}
                                            </td>
                                            <td className="text-center px-4 py-3 text-slate-300">
                                                {formatHours(editorStats.reduce((acc, e) => acc + e.avgEditingTime, 0) / (editorStats.length || 1))}
                                            </td>
                                            <td className="text-center px-4 py-3 text-slate-300">
                                                {formatHours(editorStats.reduce((acc, e) => acc + e.avgRevisionTime, 0) / (editorStats.length || 1))}
                                            </td>
                                            <td className="text-center px-4 py-3 text-slate-300">
                                                {formatHours(editorStats.reduce((acc, e) => acc + e.avgAlterationTime, 0) / (editorStats.length || 1))}
                                            </td>
                                            <td className="text-center px-4 py-3 text-slate-300">
                                                {(editorStats.reduce((acc, e) => acc + e.revisionRate, 0) / (editorStats.length || 1)).toFixed(0)}%
                                            </td>
                                            <td className="text-center px-4 py-3 text-slate-300">
                                                {(editorStats.reduce((acc, e) => acc + e.alterationRate, 0) / (editorStats.length || 1)).toFixed(0)}%
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stacked Bar Chart - Phase Time Distribution */}
                    <Card className="mt-6 bg-slate-900/50 border-slate-800/50 backdrop-blur">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-medium text-slate-200 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-blue-500" />
                                Distribuição de Tempo por Editor
                            </CardTitle>
                            <CardDescription className="text-slate-500">
                                Comparativo de tempo em edição vs revisão vs alteração
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                            <ChartWrapper>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={editorStats.map(e => ({
                                            name: e.name,
                                            'Tempo Edição': e.avgEditingTime,
                                            'Tempo Revisão': e.avgRevisionTime,
                                            'Tempo Alteração': e.avgAlterationTime,
                                            color: e.color
                                        }))}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            stroke="#64748b"
                                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                                            axisLine={false}
                                            tickLine={false}
                                            angle={-45}
                                            textAnchor="end"
                                            height={60}
                                            interval={0}
                                        />
                                        <YAxis
                                            stroke="#64748b"
                                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                                            axisLine={false}
                                            tickLine={false}
                                            label={{ value: 'Horas', angle: -90, position: 'insideLeft', fill: '#64748b' }}
                                        />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                        <Legend />
                                        <Bar dataKey="Tempo Edição" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="Tempo Revisão" fill="#f59e0b" stackId="a" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="Tempo Alteração" fill="#f97316" stackId="a" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartWrapper>
                        </CardContent>
                    </Card>
                </>
            )}

            {/* ANALYSIS VIEW */}
            {viewMode === 'analysis' && analysisData && (
                <>
                    {/* Team Insights */}
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-500" />
                            Insights da Equipe
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {analysisData.teamInsights.map((insight, index) => (
                                <Card
                                    key={index}
                                    className={cn(
                                        "backdrop-blur border",
                                        insight.type === 'positive' && "bg-emerald-500/10 border-emerald-500/20",
                                        insight.type === 'warning' && "bg-amber-500/10 border-amber-500/20",
                                        insight.type === 'info' && "bg-blue-500/10 border-blue-500/20"
                                    )}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            {insight.type === 'positive' && <ThumbsUp className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />}
                                            {insight.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />}
                                            {insight.type === 'info' && <Lightbulb className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />}
                                            <p className="text-sm text-slate-200">{insight.message}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {analysisData.teamInsights.length === 0 && (
                                <Card className="bg-slate-900/50 border-slate-800/50 backdrop-blur col-span-full">
                                    <CardContent className="p-6 text-center">
                                        <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                        <p className="text-slate-300">Nenhum insight especial no momento. A equipe está com performance equilibrada!</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>

                    {/* Team Averages Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/20 backdrop-blur">
                            <CardContent className="p-4">
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Média Edição</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-white">{formatHours(analysisData.teamAverages.editingTime)}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">por vídeo</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-amber-500/20 backdrop-blur">
                            <CardContent className="p-4">
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Taxa Revisão</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-white">{analysisData.teamAverages.revisionRate.toFixed(0)}</span>
                                    <span className="text-sm text-slate-400">%</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">média da equipe</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border-orange-500/20 backdrop-blur">
                            <CardContent className="p-4">
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Taxa Alteração</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-white">{analysisData.teamAverages.alterationRate.toFixed(0)}</span>
                                    <span className="text-sm text-slate-400">%</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">média da equipe</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 backdrop-blur">
                            <CardContent className="p-4">
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Lead Time</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-white">{formatHours(analysisData.teamAverages.leadTime)}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">até conclusão</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Editor Performance Cards */}
                    <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                        <Award className="w-5 h-5 text-amber-500" />
                        Performance Individual
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                        {analysisData.editors.map((editor, index) => (
                            <Card
                                key={editor.name}
                                className={cn(
                                    "bg-slate-900/50 border-slate-800/50 backdrop-blur overflow-hidden",
                                    editor.score >= 70 && "ring-1 ring-emerald-500/30",
                                    editor.score < 40 && "ring-1 ring-red-500/30"
                                )}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-4 h-12 rounded-full"
                                                style={{ backgroundColor: editor.color }}
                                            />
                                            <div>
                                                <CardTitle className="text-base font-medium text-white">{editor.name}</CardTitle>
                                                <CardDescription className="text-slate-500">#{index + 1} no ranking</CardDescription>
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold",
                                            editor.score >= 70 ? "bg-emerald-500/20 text-emerald-400" :
                                            editor.score >= 50 ? "bg-amber-500/20 text-amber-400" :
                                            "bg-red-500/20 text-red-400"
                                        )}>
                                            {editor.score}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Metrics Summary */}
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="bg-slate-800/50 rounded-lg p-2">
                                            <p className="text-slate-500 text-xs">Vídeos</p>
                                            <p className="font-bold text-white">{editor.metrics.videos}</p>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg p-2">
                                            <p className="text-slate-500 text-xs">Eficiência</p>
                                            <p className="font-bold text-white">{editor.metrics.efficiency.toFixed(1)}h/vídeo</p>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg p-2">
                                            <p className="text-slate-500 text-xs">Taxa Revisão</p>
                                            <p className={cn(
                                                "font-bold",
                                                editor.metrics.revisionRate < 30 ? "text-emerald-400" :
                                                editor.metrics.revisionRate < 60 ? "text-amber-400" : "text-red-400"
                                            )}>{editor.metrics.revisionRate.toFixed(0)}%</p>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg p-2">
                                            <p className="text-slate-500 text-xs">Taxa Alteração</p>
                                            <p className={cn(
                                                "font-bold",
                                                editor.metrics.alterationRate < 30 ? "text-emerald-400" :
                                                editor.metrics.alterationRate < 60 ? "text-amber-400" : "text-red-400"
                                            )}>{editor.metrics.alterationRate.toFixed(0)}%</p>
                                        </div>
                                    </div>

                                    {/* Comparison vs Team */}
                                    <div className="space-y-2">
                                        <p className="text-xs text-slate-400 uppercase tracking-wider">vs Média da Equipe</p>
                                        <div className="flex flex-wrap gap-2">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "border-0 text-xs",
                                                    editor.vsTeam.videos > 0
                                                        ? "bg-emerald-500/10 text-emerald-400"
                                                        : "bg-red-500/10 text-red-400"
                                                )}
                                            >
                                                Volume: {editor.vsTeam.videos > 0 ? '+' : ''}{editor.vsTeam.videos.toFixed(0)}%
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "border-0 text-xs",
                                                    editor.vsTeam.efficiency < 0
                                                        ? "bg-emerald-500/10 text-emerald-400"
                                                        : "bg-red-500/10 text-red-400"
                                                )}
                                            >
                                                Eficiência: {editor.vsTeam.efficiency > 0 ? '+' : ''}{editor.vsTeam.efficiency.toFixed(0)}%
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "border-0 text-xs",
                                                    editor.vsTeam.revisionRate < 0
                                                        ? "bg-emerald-500/10 text-emerald-400"
                                                        : "bg-red-500/10 text-red-400"
                                                )}
                                            >
                                                Revisão: {editor.vsTeam.revisionRate > 0 ? '+' : ''}{editor.vsTeam.revisionRate.toFixed(0)}%
                                            </Badge>
                                        </div>
                                    </div>

                                    <Separator className="bg-slate-800" />

                                    {/* Strengths */}
                                    {editor.strengths.length > 0 && (
                                        <div>
                                            <p className="text-xs text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                <ThumbsUp className="w-3 h-3" />
                                                Pontos Fortes
                                            </p>
                                            <div className="space-y-1">
                                                {editor.strengths.map((strength, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                                                        <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                                                        {strength}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Improvements */}
                                    {editor.improvements.length > 0 && (
                                        <div>
                                            <p className="text-xs text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                <TrendingUp className="w-3 h-3" />
                                                Pontos de Melhoria
                                            </p>
                                            <div className="space-y-1">
                                                {editor.improvements.map((improvement, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                                                        <AlertCircle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                                                        {improvement}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* No issues */}
                                    {editor.strengths.length === 0 && editor.improvements.length === 0 && (
                                        <p className="text-sm text-slate-500 text-center py-2">
                                            Performance dentro da média da equipe
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Performance Ranking Chart */}
                    <Card className="bg-slate-900/50 border-slate-800/50 backdrop-blur">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-medium text-slate-200 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-blue-500" />
                                Ranking de Performance (Score)
                            </CardTitle>
                            <CardDescription className="text-slate-500">
                                Score calculado com base em volume, eficiência, qualidade e velocidade
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                            <ChartWrapper>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={analysisData.editors}
                                        layout="vertical"
                                        margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={false} />
                                        <XAxis
                                            type="number"
                                            domain={[0, 100]}
                                            stroke="#64748b"
                                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            stroke="#64748b"
                                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                                            axisLine={false}
                                            tickLine={false}
                                            width={90}
                                        />
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl">
                                                            <p className="font-semibold text-white mb-2">{data.name}</p>
                                                            <p className="text-slate-300 text-sm">Score: <span className="font-bold text-white">{data.score}</span></p>
                                                            <p className="text-slate-400 text-xs mt-2">
                                                                {data.strengths.length} pontos fortes, {data.improvements.length} melhorias
                                                            </p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar
                                            dataKey="score"
                                            radius={[0, 6, 6, 0]}
                                            maxBarSize={30}
                                        >
                                            {analysisData.editors.map((entry) => (
                                                <Cell
                                                    key={entry.name}
                                                    fill={entry.score >= 70 ? '#10b981' : entry.score >= 50 ? '#f59e0b' : '#ef4444'}
                                                />
                                            ))}
                                            <LabelList
                                                dataKey="score"
                                                position="right"
                                                fill="#fff"
                                                fontSize={12}
                                                fontWeight="bold"
                                            />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartWrapper>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}

// --- COMPONENTS ---

function MetricCard({ title, value, suffix, icon: Icon, color, subtitle }: {
    title: string;
    value: string | number;
    suffix?: string;
    icon: any;
    color: 'blue' | 'violet' | 'emerald' | 'amber' | 'cyan';
    subtitle: string;
}) {
    const colorMap = {
        blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/20',
        violet: 'from-violet-500/20 to-violet-500/5 border-violet-500/20',
        emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20',
        amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/20',
        cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20',
    };

    const iconColorMap = {
        blue: 'text-blue-500',
        violet: 'text-violet-500',
        emerald: 'text-emerald-500',
        amber: 'text-amber-500',
        cyan: 'text-cyan-500',
    };

    return (
        <Card className={cn("bg-gradient-to-br border backdrop-blur", colorMap[color])}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">{title}</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl md:text-3xl font-bold text-white">{value}</span>
                            {suffix && <span className="text-sm text-slate-400">{suffix}</span>}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
                    </div>
                    <Icon className={cn("w-8 h-8 opacity-50", iconColorMap[color])} />
                </div>
            </CardContent>
        </Card>
    );
}

function ComparisonRow({ label, values, teamValue, format, lowerIsBetter = false, colors }: {
    label: string;
    values: number[];
    teamValue: number;
    format: 'number' | 'hours' | 'efficiency';
    lowerIsBetter?: boolean;
    colors: string[];
}) {
    const formatValue = (val: number) => {
        if (format === 'hours') return `${val.toFixed(1)}h`;
        if (format === 'efficiency') return `${val.toFixed(1)}h`;
        return val.toFixed(0);
    };

    const validValues = values.filter(v => v > 0);
    const bestValue = lowerIsBetter
        ? Math.min(...validValues)
        : Math.max(...validValues);

    return (
        <div className={cn("grid gap-4 py-2 border-b border-slate-800/50", `grid-cols-${values.length + 2}`)}>
            <div className="text-sm text-slate-400">{label}</div>
            {values.map((value, i) => (
                <div key={i} className={cn(
                    "text-sm font-medium text-center",
                    value === bestValue && value > 0 ? "text-emerald-400" : "text-white"
                )}>
                    {formatValue(value)}
                    {value === bestValue && value > 0 && <span className="ml-1 text-emerald-400">★</span>}
                </div>
            ))}
            <div className="text-sm text-slate-500 text-center">{formatValue(teamValue)}</div>
        </div>
    );
}

function StatRow({ label, value, comparison, suffix = '', lowerIsBetter = false, color }: {
    label: string;
    value: number;
    comparison: number;
    suffix?: string;
    lowerIsBetter?: boolean;
    color: string;
}) {
    const diff = comparison > 0 ? ((value - comparison) / comparison) * 100 : 0;
    const isPositive = lowerIsBetter ? diff < 0 : diff > 0;

    return (
        <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">{label}</span>
            <div className="flex items-center gap-2">
                <span className="font-medium text-white">
                    {value.toFixed(1)}{suffix}
                </span>
                {comparison > 0 && (
                    <span className={cn(
                        "text-xs flex items-center",
                        isPositive ? "text-emerald-400" : "text-red-400"
                    )}>
                        {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {Math.abs(diff).toFixed(0)}%
                    </span>
                )}
            </div>
        </div>
    );
}
