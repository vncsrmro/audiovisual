'use client';

import { useState, useEffect } from 'react';
import { ALL_TEAMS } from '@/lib/constants';
import {
    Users,
    Calendar,
    CheckCircle,
    AlertCircle,
    Clock,
    MessageSquare,
    ChevronDown,
    ChevronUp,
    Save,
    RefreshCw
} from 'lucide-react';

interface OneOnOneRecord {
    editorName: string;
    teamName: string;
    teamColor: string;
    lastOneOnOne: string | null; // ISO date string
    notes: string;
}

// Get all editors from teams
const getAllEditors = (): OneOnOneRecord[] => {
    const editors: OneOnOneRecord[] = [];
    ALL_TEAMS.forEach(team => {
        team.members.forEach(member => {
            editors.push({
                editorName: member.name,
                teamName: team.name,
                teamColor: team.color,
                lastOneOnOne: null,
                notes: ''
            });
        });
    });
    return editors;
};

const LOCAL_STORAGE_KEY = 'capitao-one-on-one-records';

export default function OneOnOnePage() {
    const [records, setRecords] = useState<OneOnOneRecord[]>([]);
    const [expandedEditor, setExpandedEditor] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved) as OneOnOneRecord[];
                // Merge with current editors (in case new editors were added)
                const allEditors = getAllEditors();
                const merged = allEditors.map(editor => {
                    const existing = parsed.find(p => p.editorName === editor.editorName);
                    return existing ? { ...editor, ...existing } : editor;
                });
                setRecords(merged);
            } catch {
                setRecords(getAllEditors());
            }
        } else {
            setRecords(getAllEditors());
        }
    }, []);

    // Save to localStorage
    const saveRecords = () => {
        setIsSaving(true);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
        setTimeout(() => setIsSaving(false), 500);
    };

    // Auto-save on changes
    useEffect(() => {
        if (records.length > 0) {
            const timeout = setTimeout(() => {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
            }, 1000);
            return () => clearTimeout(timeout);
        }
    }, [records]);

    // Calculate status based on last 1:1 date
    const getStatus = (lastDate: string | null): 'ok' | 'pending' | 'overdue' => {
        if (!lastDate) return 'overdue';

        const last = new Date(lastDate);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= 30) return 'ok';
        if (diffDays <= 45) return 'pending';
        return 'overdue';
    };

    const getStatusLabel = (status: 'ok' | 'pending' | 'overdue') => {
        switch (status) {
            case 'ok': return { label: 'Em dia', color: 'text-green-400', bg: 'bg-green-600/20', icon: CheckCircle };
            case 'pending': return { label: 'Pendente', color: 'text-amber-400', bg: 'bg-amber-600/20', icon: Clock };
            case 'overdue': return { label: 'Atrasado', color: 'text-red-400', bg: 'bg-red-600/20', icon: AlertCircle };
        }
    };

    const getNextSuggested = (lastDate: string | null): string => {
        if (!lastDate) return 'Agendar o mais rápido possível';

        const last = new Date(lastDate);
        const next = new Date(last);
        next.setDate(next.getDate() + 30);

        if (next < new Date()) {
            return 'Já deveria ter acontecido!';
        }

        return next.toLocaleDateString('pt-BR');
    };

    const updateRecord = (editorName: string, field: 'lastOneOnOne' | 'notes', value: string) => {
        setRecords(prev => prev.map(r =>
            r.editorName === editorName ? { ...r, [field]: value } : r
        ));
    };

    const markAsToday = (editorName: string) => {
        updateRecord(editorName, 'lastOneOnOne', new Date().toISOString().split('T')[0]);
    };

    // Group by team
    const groupedByTeam = records.reduce((acc, record) => {
        if (!acc[record.teamName]) {
            acc[record.teamName] = { color: record.teamColor, editors: [] };
        }
        acc[record.teamName].editors.push(record);
        return acc;
    }, {} as Record<string, { color: string; editors: OneOnOneRecord[] }>);

    // Stats
    const totalEditors = records.length;
    const okCount = records.filter(r => getStatus(r.lastOneOnOne) === 'ok').length;
    const pendingCount = records.filter(r => getStatus(r.lastOneOnOne) === 'pending').length;
    const overdueCount = records.filter(r => getStatus(r.lastOneOnOne) === 'overdue').length;

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <MessageSquare className="w-8 h-8 text-purple-400" />
                        Checklist de 1:1 Mensal
                    </h1>
                    <p className="text-gray-400 mt-1">
                        Acompanhe as conversas individuais com cada colaborador
                    </p>
                </div>
                <button
                    onClick={saveRecords}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                        isSaving
                            ? 'bg-green-600/20 text-green-400'
                            : 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/30'
                    }`}
                >
                    {isSaving ? (
                        <>
                            <CheckCircle className="w-4 h-4" />
                            Salvo!
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            Salvar
                        </>
                    )}
                </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-6">
                <div className="bg-[#12121a] border border-purple-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center">
                            <Users className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Total Editores</p>
                            <p className="text-2xl font-bold text-white">{totalEditors}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#12121a] border border-green-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Em Dia</p>
                            <p className="text-2xl font-bold text-green-400">{okCount}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#12121a] border border-amber-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-amber-600/20 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Pendente</p>
                            <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#12121a] border border-red-900/30 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-red-600/20 flex items-center justify-center">
                            <AlertCircle className="w-6 h-6 text-red-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Atrasado</p>
                            <p className="text-2xl font-bold text-red-400">{overdueCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="bg-[#12121a] border border-purple-900/30 rounded-xl p-4">
                <p className="text-gray-400 text-sm">
                    <span className="text-green-400 font-medium">Em dia</span> = 1:1 nos últimos 30 dias |{' '}
                    <span className="text-amber-400 font-medium">Pendente</span> = 30-45 dias |{' '}
                    <span className="text-red-400 font-medium">Atrasado</span> = mais de 45 dias ou nunca realizado
                </p>
            </div>

            {/* Teams */}
            <div className="space-y-6">
                {Object.entries(groupedByTeam).map(([teamName, { color, editors }]) => (
                    <div key={teamName} className="bg-[#12121a] border border-purple-900/30 rounded-xl overflow-hidden">
                        {/* Team Header */}
                        <div
                            className="p-4 border-b border-purple-900/30 flex items-center gap-3"
                            style={{ borderLeftColor: color, borderLeftWidth: 4 }}
                        >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}30` }}>
                                <Users className="w-4 h-4" style={{ color }} />
                            </div>
                            <h2 className="text-lg font-semibold text-white">{teamName}</h2>
                            <span className="text-gray-500 text-sm">({editors.length} membros)</span>
                        </div>

                        {/* Editors List */}
                        <div className="divide-y divide-purple-900/20">
                            {editors.map(editor => {
                                const status = getStatus(editor.lastOneOnOne);
                                const statusInfo = getStatusLabel(status);
                                const StatusIcon = statusInfo.icon;
                                const isExpanded = expandedEditor === editor.editorName;

                                return (
                                    <div key={editor.editorName}>
                                        <div
                                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-purple-900/10 transition-colors"
                                            onClick={() => setExpandedEditor(isExpanded ? null : editor.editorName)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full ${statusInfo.bg} flex items-center justify-center`}>
                                                    <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">{editor.editorName}</p>
                                                    <p className="text-gray-500 text-sm">
                                                        Último 1:1: {editor.lastOneOnOne
                                                            ? new Date(editor.lastOneOnOne).toLocaleDateString('pt-BR')
                                                            : 'Nunca registrado'
                                                        }
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                                                        {statusInfo.label}
                                                    </span>
                                                    <p className="text-gray-500 text-xs mt-1">
                                                        Próximo: {getNextSuggested(editor.lastOneOnOne)}
                                                    </p>
                                                </div>
                                                {isExpanded ? (
                                                    <ChevronUp className="w-5 h-5 text-gray-500" />
                                                ) : (
                                                    <ChevronDown className="w-5 h-5 text-gray-500" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Expanded Details */}
                                        {isExpanded && (
                                            <div className="p-4 bg-[#0a0a0f] border-t border-purple-900/20 space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-gray-400 text-sm mb-2">
                                                            <Calendar className="w-4 h-4 inline mr-1" />
                                                            Data do Último 1:1
                                                        </label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="date"
                                                                value={editor.lastOneOnOne || ''}
                                                                onChange={(e) => updateRecord(editor.editorName, 'lastOneOnOne', e.target.value)}
                                                                className="flex-1 bg-[#12121a] border border-purple-900/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                                                            />
                                                            <button
                                                                onClick={() => markAsToday(editor.editorName)}
                                                                className="px-3 py-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-colors text-sm whitespace-nowrap"
                                                            >
                                                                Marcar Hoje
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-gray-400 text-sm mb-2">
                                                            <MessageSquare className="w-4 h-4 inline mr-1" />
                                                            Notas / Observações
                                                        </label>
                                                        <textarea
                                                            value={editor.notes}
                                                            onChange={(e) => updateRecord(editor.editorName, 'notes', e.target.value)}
                                                            placeholder="Pontos discutidos, feedbacks, metas..."
                                                            className="w-full bg-[#12121a] border border-purple-900/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 h-20 resize-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Tip */}
            <div className="bg-purple-600/10 border border-purple-500/30 rounded-xl p-4">
                <p className="text-purple-300 text-sm">
                    <strong>Dica:</strong> Realize 1:1 mensais com cada colaborador para feedback contínuo.
                    Os dados são salvos automaticamente no navegador.
                </p>
            </div>
        </div>
    );
}
