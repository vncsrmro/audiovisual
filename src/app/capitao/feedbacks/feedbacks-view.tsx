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
    Clock
} from 'lucide-react';

interface FeedbacksViewProps {
    tasks: ClickUpTask[];
    lastUpdated: number;
}

// Simulated feedback categories (in real implementation, this would come from Frame.io scraping + AI)
type FeedbackCategory = 'technical' | 'copy' | 'aesthetic';

interface ExtractedFeedback {
    taskId: string;
    taskName: string;
    editorName: string;
    editorColor: string;
    teamName: string;
    frameIoLink: string | null;
    feedbacks: {
        text: string;
        timecode: string;
        author: string;
        category: FeedbackCategory;
    }[];
    status: string;
    dateCreated: number;
}

const categoryConfig: Record<FeedbackCategory, { label: string; color: string; bgColor: string; icon: typeof Wrench }> = {
    technical: { label: 'Erro Técnico', color: 'text-red-400', bgColor: 'bg-red-600/20', icon: Wrench },
    copy: { label: 'Ajuste Copy/Conversão', color: 'text-blue-400', bgColor: 'bg-blue-600/20', icon: FileText },
    aesthetic: { label: 'Estética', color: 'text-purple-400', bgColor: 'bg-purple-600/20', icon: Palette },
};

export function FeedbacksView({ tasks, lastUpdated }: FeedbacksViewProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<FeedbackCategory | 'all'>('all');
    const [editorFilter, setEditorFilter] = useState<string>('all');

    // Extract Frame.io links from task descriptions/comments
    // In real implementation, this would fetch from ClickUp comments API
    const extractedFeedbacks: ExtractedFeedback[] = tasks.map(task => {
        const assignee = task.assignees[0];
        const editorName = assignee?.username || 'Não Atribuído';
        const member = getMemberByName(editorName);
        const team = getTeamByMemberName(editorName);

        // Look for Frame.io links in description
        const frameIoRegex = /https?:\/\/(?:f\.io|frame\.io|next\.frame\.io)\/[^\s]+/gi;
        const description = task.description || task.text_content || '';
        const frameIoLinks = description.match(frameIoRegex);

        return {
            taskId: task.id,
            taskName: task.name,
            editorName,
            editorColor: member?.color || '#6b7280',
            teamName: team?.name || 'Sem Equipe',
            frameIoLink: frameIoLinks?.[0] || null,
            feedbacks: [], // Will be populated by Frame.io scraping in future
            status: task.status.status,
            dateCreated: parseInt(task.date_created),
        };
    }).filter(f => f.frameIoLink); // Only show tasks with Frame.io links

    // Get unique editors for filter
    const uniqueEditors = [...new Set(extractedFeedbacks.map(f => f.editorName))].sort();

    // Filter feedbacks
    const filteredFeedbacks = extractedFeedbacks.filter(feedback => {
        if (searchTerm && !feedback.taskName.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
        }
        if (editorFilter !== 'all' && feedback.editorName !== editorFilter) {
            return false;
        }
        return true;
    });

    // Stats
    const totalTasksWithFrameIo = extractedFeedbacks.length;
    const tasksByEditor = extractedFeedbacks.reduce((acc, f) => {
        acc[f.editorName] = (acc[f.editorName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-white">Auditório de Feedbacks</h1>
                    <p className="text-gray-400 mt-1">
                        Comentários do Frame.io extraídos das tarefas
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
                            <MessageSquare className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Tarefas com Frame.io</p>
                            <p className="text-2xl font-bold text-white">{totalTasksWithFrameIo}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#12121a] border border-red-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-red-600/20 flex items-center justify-center">
                            <Wrench className="w-6 h-6 text-red-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Erros Técnicos</p>
                            <p className="text-2xl font-bold text-white">-</p>
                            <p className="text-xs text-gray-500">Aguardando extração</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#12121a] border border-blue-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Ajustes de Copy</p>
                            <p className="text-2xl font-bold text-white">-</p>
                            <p className="text-xs text-gray-500">Aguardando extração</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#12121a] border border-purple-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center">
                            <Palette className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Ajustes Estéticos</p>
                            <p className="text-2xl font-bold text-white">-</p>
                            <p className="text-xs text-gray-500">Aguardando extração</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-6">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div>
                        <h3 className="text-blue-400 font-medium">Extração de Comentários</h3>
                        <p className="text-gray-400 text-sm mt-1">
                            Os links do Frame.io foram identificados nas tarefas. A extração automática dos comentários
                            e categorização por IA será implementada na próxima fase. Por enquanto, você pode acessar
                            os links diretamente para revisar os feedbacks.
                        </p>
                    </div>
                </div>
            </div>

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
            </div>

            {/* Tasks List */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">
                    Tarefas com Links do Frame.io ({filteredFeedbacks.length})
                </h2>

                {filteredFeedbacks.length === 0 ? (
                    <div className="bg-[#12121a] border border-purple-900/30 rounded-xl p-12 text-center">
                        <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">Nenhuma tarefa encontrada com links do Frame.io</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredFeedbacks.map(feedback => (
                            <div
                                key={feedback.taskId}
                                className="bg-[#12121a] border border-purple-900/30 rounded-xl p-5 hover:border-purple-500/50 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div
                                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                                            style={{ backgroundColor: feedback.editorColor }}
                                        >
                                            {feedback.editorName.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-white font-medium">{feedback.taskName}</h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-gray-400 text-sm">{feedback.editorName}</span>
                                                <span className="text-gray-600">•</span>
                                                <span className="text-gray-500 text-sm">{feedback.teamName}</span>
                                                <span className="text-gray-600">•</span>
                                                <span className="text-gray-500 text-sm flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(feedback.dateCreated).toLocaleDateString('pt-BR')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${feedback.status.toUpperCase().includes('APROVADO')
                                                ? 'bg-green-600/20 text-green-400'
                                                : feedback.status.toUpperCase().includes('ALTERA')
                                                    ? 'bg-amber-600/20 text-amber-400'
                                                    : 'bg-gray-600/20 text-gray-400'
                                            }`}>
                                            {feedback.status}
                                        </span>

                                        {feedback.frameIoLink && (
                                            <a
                                                href={feedback.frameIoLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-colors"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                                Abrir Frame.io
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* Placeholder for future extracted comments */}
                                {feedback.feedbacks.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-purple-900/30">
                                        <h4 className="text-sm text-gray-400 mb-3">Comentários Extraídos:</h4>
                                        <div className="space-y-2">
                                            {feedback.feedbacks.map((fb, idx) => {
                                                const config = categoryConfig[fb.category];
                                                const Icon = config.icon;
                                                return (
                                                    <div key={idx} className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg">
                                                        <div className={`p-1.5 rounded ${config.bgColor}`}>
                                                            <Icon className={`w-4 h-4 ${config.color}`} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-white text-sm">{fb.text}</p>
                                                            <div className="flex items-center gap-3 mt-1">
                                                                <span className="text-gray-500 text-xs">{fb.timecode}</span>
                                                                <span className="text-gray-500 text-xs">por {fb.author}</span>
                                                            </div>
                                                        </div>
                                                        <span className={`text-xs ${config.color}`}>{config.label}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Editor Pattern Analysis (Placeholder) */}
            <div className="bg-[#12121a] border border-purple-900/30 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Padrão de Erro por Editor</h2>
                <p className="text-gray-400 text-sm">
                    Esta análise será populada após a extração automática dos comentários do Frame.io.
                    O sistema identificará padrões de erros recorrentes por editor e sugerirá treinamentos específicos.
                </p>

                <div className="grid grid-cols-3 gap-4 mt-6">
                    {Object.entries(tasksByEditor).slice(0, 6).map(([editor, count]) => {
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
                                        <p className="text-white font-medium text-sm">{editor}</p>
                                        <p className="text-gray-500 text-xs">{count} tarefas com Frame.io</p>
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
