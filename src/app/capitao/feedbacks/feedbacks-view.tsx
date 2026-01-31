'use client';

import { useState } from 'react';
import { ClickUpTask } from '@/types';
import { getMemberById } from '@/lib/constants';
import { FeedbackCategory } from '@/lib/frameio-api.service';
import {
    MessageSquare,
    ExternalLink,
    AlertCircle,
    CheckCircle,
    Video,
    TrendingUp,
    Users,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Link2,
    Play,
    Volume2,
    Type,
    Scissors,
    Palette,
    Timer,
    Tag,
    DollarSign,
    Film,
    HelpCircle,
    BarChart3
} from 'lucide-react';

interface FrameIoCommentWithCategory {
    author: string;
    text: string;
    timestamp: string;
    commentNumber: number;
    category: FeedbackCategory;
}

interface FeedbackAuditData {
    task: ClickUpTask;
    hadAlteration: boolean;
    frameIoLinks: string[];
    googleDocsLinks: string[];
    comments: any[];
    frameIoComments?: FrameIoCommentWithCategory[];
}

interface CurrentAlterationTask {
    task: ClickUpTask;
    frameIoLinks: string[];
    comments: any[];
}

interface FeedbacksViewProps {
    tasks: ClickUpTask[];
    feedbackData: FeedbackAuditData[];
    currentAlterationTasks: CurrentAlterationTask[];
    lastUpdated: number;
}

interface EditorStats {
    name: string;
    color: string;
    totalCompleted: number;
    withAlteration: number;
    alterationRate: number;
    tasks: FeedbackAuditData[];
    frameIoLinksCount: number;
    errorPatterns: Record<FeedbackCategory, number>;
    totalErrors: number;
}

const CATEGORY_ICONS: Record<FeedbackCategory, any> = {
    'Áudio/Voz': Volume2,
    'Legenda/Texto': Type,
    'Corte/Transição': Scissors,
    'Fonte/Tipografia': Type,
    'Cor/Imagem': Palette,
    'Timing/Sincronização': Timer,
    'Logo/Marca': Tag,
    'CTA/Preço': DollarSign,
    'Footage/Vídeo': Film,
    'Outros': HelpCircle
};

const CATEGORY_COLORS: Record<FeedbackCategory, string> = {
    'Áudio/Voz': 'text-purple-400 bg-purple-600/20',
    'Legenda/Texto': 'text-blue-400 bg-blue-600/20',
    'Corte/Transição': 'text-amber-400 bg-amber-600/20',
    'Fonte/Tipografia': 'text-cyan-400 bg-cyan-600/20',
    'Cor/Imagem': 'text-pink-400 bg-pink-600/20',
    'Timing/Sincronização': 'text-orange-400 bg-orange-600/20',
    'Logo/Marca': 'text-green-400 bg-green-600/20',
    'CTA/Preço': 'text-yellow-400 bg-yellow-600/20',
    'Footage/Vídeo': 'text-red-400 bg-red-600/20',
    'Outros': 'text-gray-400 bg-gray-600/20'
};

const ALL_CATEGORIES: FeedbackCategory[] = [
    'Áudio/Voz',
    'Legenda/Texto',
    'Corte/Transição',
    'Fonte/Tipografia',
    'Cor/Imagem',
    'Timing/Sincronização',
    'Logo/Marca',
    'CTA/Preço',
    'Footage/Vídeo',
    'Outros'
];

export function FeedbacksView({ tasks, feedbackData, currentAlterationTasks, lastUpdated }: FeedbacksViewProps) {
    const [expandedEditor, setExpandedEditor] = useState<string | null>(null);

    // Calculate stats by editor
    const editorStatsMap: Record<string, EditorStats> = {};

    feedbackData.forEach(data => {
        const assignee = data.task.assignees?.[0];
        if (!assignee) return;

        const member = getMemberById(assignee.id);
        const editorName = member?.name || assignee.username;
        const editorColor = member?.color || '#6b7280';

        if (!editorStatsMap[editorName]) {
            editorStatsMap[editorName] = {
                name: editorName,
                color: editorColor,
                totalCompleted: 0,
                withAlteration: 0,
                alterationRate: 0,
                tasks: [],
                frameIoLinksCount: 0,
                errorPatterns: ALL_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: 0 }), {} as Record<FeedbackCategory, number>),
                totalErrors: 0
            };
        }

        editorStatsMap[editorName].totalCompleted++;
        if (data.hadAlteration) {
            editorStatsMap[editorName].withAlteration++;
            editorStatsMap[editorName].frameIoLinksCount += data.frameIoLinks.length;
        }

        // Count error patterns from Frame.io comments
        if (data.frameIoComments) {
            data.frameIoComments.forEach(comment => {
                editorStatsMap[editorName].errorPatterns[comment.category]++;
                editorStatsMap[editorName].totalErrors++;
            });
        }

        editorStatsMap[editorName].tasks.push(data);
    });

    // Calculate alteration rates
    Object.values(editorStatsMap).forEach(stats => {
        stats.alterationRate = stats.totalCompleted > 0
            ? (stats.withAlteration / stats.totalCompleted) * 100
            : 0;
    });

    const editorStats = Object.values(editorStatsMap)
        .filter(e => e.totalCompleted > 0)
        .sort((a, b) => b.alterationRate - a.alterationRate);

    // Overall stats
    const totalCompleted = feedbackData.length;
    const totalWithAlteration = feedbackData.filter(d => d.hadAlteration).length;
    const overallRate = totalCompleted > 0 ? (totalWithAlteration / totalCompleted) * 100 : 0;
    const totalFrameIoLinks = feedbackData.reduce((acc, d) => acc + d.frameIoLinks.length, 0);
    const totalComments = feedbackData.reduce((acc, d) => acc + (d.frameIoComments?.length || 0), 0);

    // Global error patterns
    const globalErrorPatterns: Record<FeedbackCategory, number> = ALL_CATEGORIES.reduce(
        (acc, cat) => ({ ...acc, [cat]: 0 }),
        {} as Record<FeedbackCategory, number>
    );
    feedbackData.forEach(data => {
        data.frameIoComments?.forEach(comment => {
            globalErrorPatterns[comment.category]++;
        });
    });

    const topGlobalErrors = Object.entries(globalErrorPatterns)
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const getAlterationRateColor = (rate: number) => {
        if (rate <= 15) return 'text-green-400';
        if (rate <= 30) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getAlterationRateBg = (rate: number) => {
        if (rate <= 15) return 'bg-green-600/20';
        if (rate <= 30) return 'bg-yellow-600/20';
        return 'bg-red-600/20';
    };

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-white">Auditoria de Feedbacks</h1>
                    <p className="text-gray-400 mt-1">
                        Análise de alterações e padrões de erros por editor
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-sm text-gray-500">Última atualização</div>
                    <div className="text-lg text-purple-400">
                        {new Date(lastUpdated).toLocaleString('pt-BR')}
                    </div>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-5 gap-4">
                <div className="bg-[#12121a] border border-purple-900/30 rounded-xl p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs">Concluídas</p>
                            <p className="text-xl font-bold text-white">{totalCompleted}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#12121a] border border-amber-900/30 rounded-xl p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs">Alterações</p>
                            <p className="text-xl font-bold text-white">{totalWithAlteration}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#12121a] border border-blue-900/30 rounded-xl p-5">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${getAlterationRateBg(overallRate)} flex items-center justify-center`}>
                            <TrendingUp className={`w-5 h-5 ${getAlterationRateColor(overallRate)}`} />
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs">Taxa Geral</p>
                            <p className={`text-xl font-bold ${getAlterationRateColor(overallRate)}`}>
                                {overallRate.toFixed(1)}%
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#12121a] border border-green-900/30 rounded-xl p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
                            <Link2 className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs">Links Frame.io</p>
                            <p className="text-xl font-bold text-white">{totalFrameIoLinks}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#12121a] border border-cyan-900/30 rounded-xl p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-cyan-600/20 flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs">Feedbacks</p>
                            <p className="text-xl font-bold text-white">{totalComments}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Global Error Patterns */}
            {topGlobalErrors.length > 0 && (
                <div className="bg-[#12121a] border border-red-900/30 rounded-xl p-6">
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-red-400" />
                        Principais Tipos de Erro (Geral)
                    </h2>
                    <div className="flex flex-wrap gap-3">
                        {topGlobalErrors.map(([category, count]) => {
                            const Icon = CATEGORY_ICONS[category as FeedbackCategory];
                            const colors = CATEGORY_COLORS[category as FeedbackCategory];
                            return (
                                <div
                                    key={category}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg ${colors}`}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="font-medium">{category}</span>
                                    <span className="bg-black/20 px-2 py-0.5 rounded text-sm">{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Editor Rankings */}
            <div className="bg-[#12121a] border border-purple-900/30 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-400" />
                    Taxa de Alteração por Editor
                </h2>

                {editorStats.length === 0 ? (
                    <div className="text-center py-12">
                        <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">Nenhum editor encontrado</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {editorStats.map(editor => {
                            const topErrors = Object.entries(editor.errorPatterns)
                                .filter(([_, count]) => count > 0)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 3);

                            return (
                                <div key={editor.name} className="bg-gray-900/50 rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => setExpandedEditor(expandedEditor === editor.name ? null : editor.name)}
                                        className="w-full p-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                                                style={{ backgroundColor: editor.color }}
                                            >
                                                {editor.name.charAt(0)}
                                            </div>
                                            <div className="text-left">
                                                <p className="text-white font-medium">{editor.name}</p>
                                                <p className="text-gray-500 text-sm">
                                                    {editor.totalCompleted} concluídas • {editor.withAlteration} alterações
                                                    {editor.totalErrors > 0 && (
                                                        <span className="text-cyan-400"> • {editor.totalErrors} feedbacks</span>
                                                    )}
                                                </p>

                                                {/* Top errors for this editor */}
                                                {topErrors.length > 0 && (
                                                    <div className="flex gap-2 mt-2">
                                                        {topErrors.map(([cat, count]) => {
                                                            const Icon = CATEGORY_ICONS[cat as FeedbackCategory];
                                                            const colors = CATEGORY_COLORS[cat as FeedbackCategory];
                                                            return (
                                                                <div
                                                                    key={cat}
                                                                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${colors}`}
                                                                    title={cat}
                                                                >
                                                                    <Icon className="w-3 h-3" />
                                                                    <span>{count}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {/* Progress bar */}
                                            <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${editor.alterationRate <= 15
                                                        ? 'bg-green-500'
                                                        : editor.alterationRate <= 30
                                                            ? 'bg-yellow-500'
                                                            : 'bg-red-500'
                                                        }`}
                                                    style={{ width: `${Math.min(editor.alterationRate, 100)}%` }}
                                                />
                                            </div>

                                            <div className="text-right min-w-[80px]">
                                                <p className={`text-xl font-bold ${getAlterationRateColor(editor.alterationRate)}`}>
                                                    {editor.alterationRate.toFixed(1)}%
                                                </p>
                                                <p className="text-gray-500 text-xs">taxa</p>
                                            </div>

                                            {expandedEditor === editor.name
                                                ? <ChevronUp className="w-5 h-5 text-gray-400" />
                                                : <ChevronDown className="w-5 h-5 text-gray-400" />
                                            }
                                        </div>
                                    </button>

                                    {/* Expanded details - Tasks with alterations */}
                                    {expandedEditor === editor.name && (
                                        <div className="border-t border-gray-800 p-4">
                                            {/* Error patterns breakdown */}
                                            {editor.totalErrors > 0 && (
                                                <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
                                                    <h4 className="text-sm text-white font-medium mb-2">
                                                        Padrões de Erro:
                                                    </h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {Object.entries(editor.errorPatterns)
                                                            .filter(([_, count]) => count > 0)
                                                            .sort((a, b) => b[1] - a[1])
                                                            .map(([cat, count]) => {
                                                                const Icon = CATEGORY_ICONS[cat as FeedbackCategory];
                                                                const colors = CATEGORY_COLORS[cat as FeedbackCategory];
                                                                const percentage = ((count / editor.totalErrors) * 100).toFixed(0);
                                                                return (
                                                                    <div
                                                                        key={cat}
                                                                        className={`flex items-center gap-2 px-3 py-1.5 rounded ${colors}`}
                                                                    >
                                                                        <Icon className="w-4 h-4" />
                                                                        <span className="text-sm">{cat}</span>
                                                                        <span className="text-xs bg-black/20 px-1.5 rounded">
                                                                            {count} ({percentage}%)
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                    </div>
                                                </div>
                                            )}

                                            <h4 className="text-sm text-gray-400 mb-3">
                                                Tasks com alteração ({editor.withAlteration}):
                                            </h4>

                                            {editor.tasks.filter(t => t.hadAlteration).length === 0 ? (
                                                <p className="text-gray-500 text-sm text-center py-4">
                                                    Nenhuma alteração encontrada
                                                </p>
                                            ) : (
                                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                                    {editor.tasks.filter(t => t.hadAlteration).map(data => (
                                                        <div
                                                            key={data.task.id}
                                                            className="bg-gray-800/50 rounded-lg p-3"
                                                        >
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-white text-sm font-medium truncate">
                                                                        {data.task.name}
                                                                    </p>
                                                                    <p className="text-gray-500 text-xs mt-1">
                                                                        {new Date(parseInt(data.task.date_created)).toLocaleDateString('pt-BR')}
                                                                    </p>

                                                                    {/* Show comments for this task */}
                                                                    {data.frameIoComments && data.frameIoComments.length > 0 && (
                                                                        <div className="mt-2 space-y-1">
                                                                            {data.frameIoComments.slice(0, 3).map((comment, idx) => {
                                                                                const Icon = CATEGORY_ICONS[comment.category];
                                                                                const colors = CATEGORY_COLORS[comment.category];
                                                                                return (
                                                                                    <div key={idx} className="flex items-start gap-2 text-xs">
                                                                                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${colors} flex-shrink-0`}>
                                                                                            <Icon className="w-3 h-3" />
                                                                                        </div>
                                                                                        <span className="text-gray-400 truncate">
                                                                                            {comment.text.substring(0, 80)}
                                                                                            {comment.text.length > 80 && '...'}
                                                                                        </span>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                            {data.frameIoComments.length > 3 && (
                                                                                <p className="text-gray-500 text-xs">
                                                                                    +{data.frameIoComments.length - 3} mais
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                                    {data.frameIoLinks.length > 0 && (
                                                                        <div className="flex gap-1">
                                                                            {data.frameIoLinks.slice(0, 2).map((link, idx) => (
                                                                                <a
                                                                                    key={idx}
                                                                                    href={link.startsWith('http') ? link : `https://${link}`}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="flex items-center gap-1 px-2 py-1 bg-purple-600/20 text-purple-400 rounded text-xs hover:bg-purple-600/30 transition-colors"
                                                                                    title={`Abrir feedback ${idx + 1}`}
                                                                                >
                                                                                    <Play className="w-3 h-3" />
                                                                                    {data.frameIoLinks.length > 1 ? `#${idx + 1}` : 'Ver'}
                                                                                </a>
                                                                            ))}
                                                                            {data.frameIoLinks.length > 2 && (
                                                                                <span className="text-purple-400 text-xs px-1">
                                                                                    +{data.frameIoLinks.length - 2}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    <a
                                                                        href={`https://app.clickup.com/t/${data.task.id}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex items-center gap-1 px-2 py-1 bg-gray-600/20 text-gray-400 rounded text-xs hover:bg-gray-600/30 transition-colors"
                                                                    >
                                                                        <ExternalLink className="w-3 h-3" />
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Current Alterations */}
            {currentAlterationTasks.length > 0 && (
                <div className="bg-[#12121a] border border-red-900/30 rounded-xl p-6">
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        Aguardando Alteração Agora ({currentAlterationTasks.length})
                    </h2>

                    <div className="grid gap-3">
                        {currentAlterationTasks.map(({ task, frameIoLinks }) => {
                            const assignee = task.assignees?.[0];
                            const member = assignee ? getMemberById(assignee.id) : null;
                            const editorName = member?.name || assignee?.username || 'Não atribuído';
                            const editorColor = member?.color || '#6b7280';

                            return (
                                <div
                                    key={task.id}
                                    className="bg-gray-900/50 rounded-lg p-4 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                                            style={{ backgroundColor: editorColor }}
                                        >
                                            {editorName.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">{task.name}</p>
                                            <p className="text-gray-500 text-sm">{editorName}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {frameIoLinks.length > 0 && (
                                            <a
                                                href={frameIoLinks[0].startsWith('http') ? frameIoLinks[0] : `https://${frameIoLinks[0]}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-3 py-2 bg-purple-600/20 text-purple-400 rounded-lg text-sm hover:bg-purple-600/30 transition-colors"
                                            >
                                                <Video className="w-4 h-4" />
                                                Ver Feedback
                                            </a>
                                        )}
                                        <a
                                            href={`https://app.clickup.com/t/${task.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-3 py-2 bg-gray-600/20 text-gray-400 rounded-lg text-sm hover:bg-gray-600/30 transition-colors"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            ClickUp
                                        </a>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Info about Frame.io analysis */}
            <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <Video className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div>
                        <h3 className="text-blue-400 font-medium">Análise de Feedbacks</h3>
                        <p className="text-gray-400 text-sm mt-1">
                            {totalComments > 0
                                ? `${totalComments} feedbacks do Frame.io foram analisados e categorizados automaticamente. Os padrões de erro são identificados pelo conteúdo dos comentários.`
                                : 'Configure a variável BROWSERLESS_API_KEY para ativar a extração automática de comentários do Frame.io.'
                            }
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
