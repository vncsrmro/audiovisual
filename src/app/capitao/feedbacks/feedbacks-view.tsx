'use client';

import { useState } from 'react';
import { ClickUpTask } from '@/types';
import { getTeamByMemberName, getMemberByName } from '@/lib/constants';
import {
    MessageSquare,
    ExternalLink,
    Search,
    Filter,
    RefreshCw,
    AlertCircle,
    CheckCircle,
    Palette,
    Wrench,
    FileText,
    Clock,
    Video,
    Link2
} from 'lucide-react';

interface TaskWithFrameIo {
    task: ClickUpTask;
    frameIoLinks: string[];
    comments: any[];
}

interface FeedbacksViewProps {
    tasks: ClickUpTask[];
    tasksWithFrameIo: TaskWithFrameIo[];
    lastUpdated: number;
}

export function FeedbacksView({ tasks, tasksWithFrameIo, lastUpdated }: FeedbacksViewProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [editorFilter, setEditorFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Process tasks with Frame.io links
    const processedTasks = tasksWithFrameIo.map(({ task, frameIoLinks, comments }) => {
        const assignee = task.assignees[0];
        const editorName = assignee?.username || 'Não Atribuído';
        const member = getMemberByName(editorName);
        const team = getTeamByMemberName(editorName);

        return {
            taskId: task.id,
            taskName: task.name,
            editorName,
            editorColor: member?.color || '#6b7280',
            teamName: team?.name || 'Sem Equipe',
            frameIoLinks,
            comments,
            commentCount: comments.length,
            status: task.status.status,
            dateCreated: parseInt(task.date_created),
        };
    });

    // Get unique editors and statuses for filters
    const uniqueEditors = [...new Set(processedTasks.map(t => t.editorName))].sort();
    const uniqueStatuses = [...new Set(processedTasks.map(t => t.status))].sort();

    // Apply filters
    const filteredTasks = processedTasks.filter(task => {
        if (searchTerm && !task.taskName.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
        }
        if (editorFilter !== 'all' && task.editorName !== editorFilter) {
            return false;
        }
        if (statusFilter !== 'all' && task.status !== statusFilter) {
            return false;
        }
        return true;
    });

    // Stats
    const totalWithFrameIo = processedTasks.length;
    const totalLinks = processedTasks.reduce((acc, t) => acc + t.frameIoLinks.length, 0);
    const totalComments = processedTasks.reduce((acc, t) => acc + t.commentCount, 0);
    const tasksByEditor = processedTasks.reduce((acc, t) => {
        acc[t.editorName] = (acc[t.editorName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-white">Auditório de Feedbacks</h1>
                    <p className="text-gray-400 mt-1">
                        Links do Frame.io encontrados nos comentários das tarefas
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-sm text-gray-500">Última atualização</div>
                    <div className="text-lg text-purple-400">
                        {new Date(lastUpdated).toLocaleString('pt-BR')}
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-6">
                <div className="bg-[#12121a] border border-purple-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center">
                            <Video className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Tarefas Analisadas</p>
                            <p className="text-2xl font-bold text-white">{Math.min(50, tasks.length)}</p>
                            <p className="text-xs text-gray-500">de {tasks.length} total</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#12121a] border border-blue-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center">
                            <Link2 className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Com Frame.io</p>
                            <p className="text-2xl font-bold text-white">{totalWithFrameIo}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#12121a] border border-green-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center">
                            <ExternalLink className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Total de Links</p>
                            <p className="text-2xl font-bold text-white">{totalLinks}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#12121a] border border-amber-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-amber-600/20 flex items-center justify-center">
                            <MessageSquare className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Comentários</p>
                            <p className="text-2xl font-bold text-white">{totalComments}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Banner */}
            {totalWithFrameIo === 0 && (
                <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                        <div>
                            <h3 className="text-blue-400 font-medium">Nenhum link do Frame.io encontrado</h3>
                            <p className="text-gray-400 text-sm mt-1">
                                Os links do Frame.io são buscados nos comentários das tarefas do ClickUp.
                                Verifique se os links estão sendo adicionados nos comentários das tarefas.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
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
                    {uniqueEditors.map(editor => (
                        <option key={editor} value={editor}>{editor}</option>
                    ))}
                </select>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-[#12121a] border border-purple-900/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                >
                    <option value="all">Todos os Status</option>
                    {uniqueStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
            </div>

            {/* Tasks List */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">
                    Tarefas com Links do Frame.io ({filteredTasks.length})
                </h2>

                {filteredTasks.length === 0 ? (
                    <div className="bg-[#12121a] border border-purple-900/30 rounded-xl p-12 text-center">
                        <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">Nenhuma tarefa encontrada com links do Frame.io</p>
                        <p className="text-gray-500 text-sm mt-2">
                            Certifique-se de que os links do Frame.io estão nos comentários das tarefas
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredTasks.map(task => (
                            <div
                                key={task.taskId}
                                className="bg-[#12121a] border border-purple-900/30 rounded-xl p-5 hover:border-purple-500/50 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div
                                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                                            style={{ backgroundColor: task.editorColor }}
                                        >
                                            {task.editorName.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-white font-medium">{task.taskName}</h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-gray-400 text-sm">{task.editorName}</span>
                                                <span className="text-gray-600">•</span>
                                                <span className="text-gray-500 text-sm">{task.teamName}</span>
                                                <span className="text-gray-600">•</span>
                                                <span className="text-gray-500 text-sm flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(task.dateCreated).toLocaleDateString('pt-BR')}
                                                </span>
                                                <span className="text-gray-600">•</span>
                                                <span className="text-gray-500 text-sm flex items-center gap-1">
                                                    <MessageSquare className="w-3 h-3" />
                                                    {task.commentCount} comentários
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${task.status.toUpperCase().includes('APROVADO')
                                            ? 'bg-green-600/20 text-green-400'
                                            : task.status.toUpperCase().includes('ALTERA')
                                                ? 'bg-amber-600/20 text-amber-400'
                                                : task.status.toUpperCase().includes('REVIS')
                                                    ? 'bg-blue-600/20 text-blue-400'
                                                    : 'bg-gray-600/20 text-gray-400'
                                            }`}>
                                            {task.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Frame.io Links */}
                                <div className="mt-4 pt-4 border-t border-purple-900/30">
                                    <h4 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                                        <Link2 className="w-4 h-4" />
                                        Links do Frame.io ({task.frameIoLinks.length})
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {task.frameIoLinks.map((link, idx) => (
                                            <a
                                                key={idx}
                                                href={link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-colors text-sm"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                                Abrir Frame.io {task.frameIoLinks.length > 1 ? `#${idx + 1}` : ''}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Editor Summary */}
            {Object.keys(tasksByEditor).length > 0 && (
                <div className="bg-[#12121a] border border-purple-900/30 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Resumo por Editor</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {Object.entries(tasksByEditor)
                            .sort((a, b) => b[1] - a[1])
                            .map(([editor, count]) => {
                                const member = getMemberByName(editor);
                                return (
                                    <div key={editor} className="bg-gray-900/50 rounded-lg p-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                                style={{ backgroundColor: member?.color || '#6b7280' }}
                                            >
                                                {editor.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-white font-medium text-sm">{editor.split(' ')[0]}</p>
                                                <p className="text-gray-500 text-xs">{count} tarefas</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}
        </div>
    );
}
