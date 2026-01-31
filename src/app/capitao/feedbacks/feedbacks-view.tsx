'use client';

import { useState } from 'react';
import { ClickUpTask } from '@/types';
import { getTeamByMemberName, getMemberByName, getMemberById, ALL_TEAMS } from '@/lib/constants';
import {
    MessageSquare,
    ExternalLink,
    Search,
    AlertCircle,
    CheckCircle,
    Clock,
    Video,
    Link2,
    FileText,
    TrendingUp,
    TrendingDown,
    Users,
    AlertTriangle,
    ChevronDown,
    ChevronUp
} from 'lucide-react';

interface FeedbackAuditData {
    task: ClickUpTask;
    hadAlteration: boolean;
    frameIoLinks: string[];
    googleDocsLinks: string[];
    comments: any[];
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
}

export function FeedbacksView({ tasks, feedbackData, currentAlterationTasks, lastUpdated }: FeedbacksViewProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [editorFilter, setEditorFilter] = useState<string>('all');
    const [expandedEditor, setExpandedEditor] = useState<string | null>(null);
    const [showOnlyWithAlteration, setShowOnlyWithAlteration] = useState(true);

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
                tasks: []
            };
        }

        editorStatsMap[editorName].totalCompleted++;
        if (data.hadAlteration) {
            editorStatsMap[editorName].withAlteration++;
        }
        editorStatsMap[editorName].tasks.push(data);
    });

    // Calculate alteration rates
    Object.values(editorStatsMap).forEach(stats => {
        stats.alterationRate = stats.totalCompleted > 0
            ? (stats.withAlteration / stats.totalCompleted) * 100
            : 0;
    });

    const editorStats = Object.values(editorStatsMap).sort((a, b) => b.alterationRate - a.alterationRate);

    // Overall stats
    const totalCompleted = feedbackData.length;
    const totalWithAlteration = feedbackData.filter(d => d.hadAlteration).length;
    const overallRate = totalCompleted > 0 ? (totalWithAlteration / totalCompleted) * 100 : 0;
    const currentInAlteration = currentAlterationTasks.length;

    // Filter tasks for display
    const tasksWithAlteration = feedbackData.filter(d => d.hadAlteration);
    const filteredTasks = tasksWithAlteration.filter(data => {
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            if (!data.task.name.toLowerCase().includes(searchLower)) {
                return false;
            }
        }
        if (editorFilter !== 'all') {
            const assignee = data.task.assignees?.[0];
            const member = assignee ? getMemberById(assignee.id) : null;
            const editorName = member?.name || assignee?.username || '';
            if (editorName !== editorFilter) {
                return false;
            }
        }
        return true;
    });

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
                        Análise de alterações e padrões de erro por editor
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
            <div className="grid grid-cols-4 gap-6">
                <div className="bg-[#12121a] border border-purple-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Tasks Concluídas</p>
                            <p className="text-2xl font-bold text-white">{totalCompleted}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#12121a] border border-amber-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-amber-600/20 flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Com Alteração</p>
                            <p className="text-2xl font-bold text-white">{totalWithAlteration}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#12121a] border border-blue-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg ${getAlterationRateBg(overallRate)} flex items-center justify-center`}>
                            <TrendingUp className={`w-6 h-6 ${getAlterationRateColor(overallRate)}`} />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Taxa de Alteração</p>
                            <p className={`text-2xl font-bold ${getAlterationRateColor(overallRate)}`}>
                                {overallRate.toFixed(1)}%
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#12121a] border border-red-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-red-600/20 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-red-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Aguardando Alteração</p>
                            <p className="text-2xl font-bold text-white">{currentInAlteration}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Editor Rankings */}
            <div className="bg-[#12121a] border border-purple-900/30 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-400" />
                    Taxa de Alteração por Editor
                </h2>

                <div className="space-y-3">
                    {editorStats.map(editor => (
                        <div key={editor.name} className="bg-gray-900/50 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setExpandedEditor(expandedEditor === editor.name ? null : editor.name)}
                                className="w-full p-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                                        style={{ backgroundColor: editor.color }}
                                    >
                                        {editor.name.charAt(0)}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-white font-medium">{editor.name}</p>
                                        <p className="text-gray-500 text-sm">
                                            {editor.totalCompleted} concluídas • {editor.withAlteration} com alteração
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className={`text-xl font-bold ${getAlterationRateColor(editor.alterationRate)}`}>
                                            {editor.alterationRate.toFixed(1)}%
                                        </p>
                                        <p className="text-gray-500 text-xs">taxa de alteração</p>
                                    </div>

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

                                    {expandedEditor === editor.name
                                        ? <ChevronUp className="w-5 h-5 text-gray-400" />
                                        : <ChevronDown className="w-5 h-5 text-gray-400" />
                                    }
                                </div>
                            </button>

                            {/* Expanded details */}
                            {expandedEditor === editor.name && (
                                <div className="border-t border-gray-800 p-4 space-y-3">
                                    <h4 className="text-sm text-gray-400 mb-3">
                                        Tasks com alteração ({editor.withAlteration}):
                                    </h4>
                                    {editor.tasks.filter(t => t.hadAlteration).map(data => (
                                        <div
                                            key={data.task.id}
                                            className="bg-gray-800/50 rounded-lg p-3"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="text-white text-sm font-medium">
                                                        {data.task.name}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-gray-500 text-xs">
                                                            {new Date(parseInt(data.task.date_created)).toLocaleDateString('pt-BR')}
                                                        </span>
                                                        {data.frameIoLinks.length > 0 && (
                                                            <span className="flex items-center gap-1 text-purple-400 text-xs">
                                                                <Video className="w-3 h-3" />
                                                                {data.frameIoLinks.length} Frame.io
                                                            </span>
                                                        )}
                                                        {data.googleDocsLinks.length > 0 && (
                                                            <span className="flex items-center gap-1 text-blue-400 text-xs">
                                                                <FileText className="w-3 h-3" />
                                                                {data.googleDocsLinks.length} Docs
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {data.googleDocsLinks.length > 0 && (
                                                        <a
                                                            href={data.googleDocsLinks[0]}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs hover:bg-blue-600/30 transition-colors"
                                                        >
                                                            Ver Feedback
                                                        </a>
                                                    )}
                                                    {data.frameIoLinks.length > 0 && (
                                                        <a
                                                            href={data.frameIoLinks[0]}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded text-xs hover:bg-purple-600/30 transition-colors"
                                                        >
                                                            Frame.io
                                                        </a>
                                                    )}
                                                    <a
                                                        href={`https://app.clickup.com/t/${data.task.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-2 py-1 bg-gray-600/20 text-gray-400 rounded text-xs hover:bg-gray-600/30 transition-colors"
                                                    >
                                                        ClickUp
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {editor.withAlteration === 0 && (
                                        <p className="text-gray-500 text-sm text-center py-4">
                                            Nenhuma task com alteração encontrada
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Current Alterations */}
            {currentAlterationTasks.length > 0 && (
                <div className="bg-[#12121a] border border-red-900/30 rounded-xl p-6">
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        Aguardando Alteração Agora ({currentAlterationTasks.length})
                    </h2>

                    <div className="grid gap-4">
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
                                                href={frameIoLinks[0]}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-3 py-2 bg-purple-600/20 text-purple-400 rounded-lg text-sm hover:bg-purple-600/30 transition-colors"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                                Ver no Frame.io
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

            {/* Search and Filters */}
            <div className="flex gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Buscar por nome da tarefa..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#12121a] border border-purple-900/30 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    />
                </div>

                <select
                    value={editorFilter}
                    onChange={(e) => setEditorFilter(e.target.value)}
                    className="bg-[#12121a] border border-purple-900/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                >
                    <option value="all">Todos os Editores</option>
                    {editorStats.map(editor => (
                        <option key={editor.name} value={editor.name}>{editor.name}</option>
                    ))}
                </select>
            </div>

            {/* All Tasks with Alteration */}
            <div className="bg-[#12121a] border border-purple-900/30 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-purple-400" />
                    Histórico de Alterações ({filteredTasks.length})
                </h2>

                {filteredTasks.length === 0 ? (
                    <div className="text-center py-12">
                        <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">Nenhuma tarefa com alteração encontrada</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredTasks.map(data => {
                            const assignee = data.task.assignees?.[0];
                            const member = assignee ? getMemberById(assignee.id) : null;
                            const editorName = member?.name || assignee?.username || 'Não atribuído';
                            const editorColor = member?.color || '#6b7280';

                            return (
                                <div
                                    key={data.task.id}
                                    className="bg-gray-900/50 rounded-lg p-4"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div
                                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                                                style={{ backgroundColor: editorColor }}
                                            >
                                                {editorName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">{data.task.name}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-gray-400 text-sm">{editorName}</span>
                                                    <span className="text-gray-600">•</span>
                                                    <span className="text-gray-500 text-sm flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(parseInt(data.task.date_created)).toLocaleDateString('pt-BR')}
                                                    </span>
                                                    <span className="text-gray-600">•</span>
                                                    <span className="px-2 py-0.5 rounded-full text-xs bg-green-600/20 text-green-400">
                                                        {data.task.status.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {data.googleDocsLinks.length > 0 && (
                                                <a
                                                    href={data.googleDocsLinks[0]}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-sm hover:bg-blue-600/30 transition-colors"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                    Feedback
                                                </a>
                                            )}
                                            {data.frameIoLinks.length > 0 && (
                                                <a
                                                    href={data.frameIoLinks[0]}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 px-3 py-2 bg-purple-600/20 text-purple-400 rounded-lg text-sm hover:bg-purple-600/30 transition-colors"
                                                >
                                                    <Video className="w-4 h-4" />
                                                    Frame.io
                                                </a>
                                            )}
                                            <a
                                                href={`https://app.clickup.com/t/${data.task.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-3 py-2 bg-gray-600/20 text-gray-400 rounded-lg text-sm hover:bg-gray-600/30 transition-colors"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                                ClickUp
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
