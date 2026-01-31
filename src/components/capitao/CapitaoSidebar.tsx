'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    TrendingUp,
    MessageSquare,
    FileText,
    Anchor,
    Target,
    UserCheck,
    BarChart3
} from 'lucide-react';

const navItems = [
    {
        label: 'Insights',
        href: '/capitao/insights',
        icon: Target,
        description: 'Quem precisa de ajuda'
    },
    {
        label: 'Diagnóstico',
        href: '/capitao/diagnostico',
        icon: LayoutDashboard,
        description: 'Visão semanal'
    },
    {
        label: 'Evolução',
        href: '/capitao/evolucao',
        icon: TrendingUp,
        description: 'Tracker de cargo'
    },
    {
        label: 'Feedbacks',
        href: '/capitao/feedbacks',
        icon: MessageSquare,
        description: 'Frame.io'
    },
    {
        label: 'Relatórios',
        href: '/capitao/relatorios',
        icon: FileText,
        description: 'PDFs'
    },
    {
        label: '1:1 Mensal',
        href: '/capitao/one-on-one',
        icon: UserCheck,
        description: 'Checklist de conversas'
    },
    {
        label: 'Evolução do Setor',
        href: '/capitao/evolucao-setor',
        icon: BarChart3,
        description: 'Tendências e gráficos'
    },
];

export function CapitaoSidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 min-h-screen bg-[#0a0a0f] border-r border-purple-900/30 flex flex-col">
            {/* Header com Logo */}
            <div className="p-6 border-b border-purple-900/30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center">
                        <Anchor className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white">Capitão</h1>
                        <p className="text-xs text-gray-500">Central de Inteligência</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4">
                <ul className="space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={`
                                        flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                                        ${isActive
                                            ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                                            : 'text-gray-400 hover:bg-purple-900/10 hover:text-purple-300'
                                        }
                                    `}
                                >
                                    <Icon className={`w-5 h-5 ${isActive ? 'text-purple-400' : ''}`} />
                                    <div>
                                        <span className="font-medium">{item.label}</span>
                                        <p className={`text-xs ${isActive ? 'text-purple-400/70' : 'text-gray-600'}`}>
                                            {item.description}
                                        </p>
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-purple-900/30">
                <Link
                    href="/"
                    className="flex items-center gap-2 text-gray-500 hover:text-purple-400 transition-colors text-sm"
                >
                    ← Voltar ao Dashboard
                </Link>
            </div>
        </aside>
    );
}
