// ============================================
// ESTRUTURA DE EQUIPES AUDIOVISUAL
// ============================================

// Tipos de função na equipe
export type TeamRole = 'leader' | 'editor';

// Interface para membro da equipe
export interface TeamMember {
    id: number;
    name: string;
    role: TeamRole;
}

// Interface para equipe
export interface Team {
    id: string;
    name: string;
    shortName: string;
    description: string;
    color: string;
    members: TeamMember[];
    // IDs dos editores para cálculo de média (exclui líderes)
    editorIds: number[];
    // ID do líder (se houver)
    leaderId?: number;
}

// ============================================
// EQUIPE VSL
// ============================================
export const TEAM_VSL: Team = {
    id: 'vsl',
    name: 'VSL',
    shortName: 'VSL',
    description: 'Video Sales Letter - Vídeos de vendas longos',
    color: '#8b5cf6', // violet
    members: [
        { id: 96683006, name: 'Luma Viegas', role: 'leader' },
        { id: 248675265, name: 'Nathan Soares', role: 'editor' },
        { id: 84070913, name: 'Victor Mazzine', role: 'editor' },
    ],
    editorIds: [248675265, 84070913], // Média só entre Nathan e Mazzine
    leaderId: 96683006, // Luma é líder
};

// ============================================
// EQUIPE FUNIL
// ============================================
export const TEAM_FUNIL: Team = {
    id: 'funil',
    name: 'Funil',
    shortName: 'Funil',
    description: 'Vídeos para funis de vendas',
    color: '#3b82f6', // blue
    members: [
        { id: 112053206, name: 'Moises Ramalho', role: 'editor' },
        { id: 152605916, name: 'Victor Mendes', role: 'editor' },
        { id: 3258937, name: 'Renato Fernandes', role: 'editor' },
        { id: 3272897, name: 'Douglas Prado', role: 'editor' },
    ],
    editorIds: [112053206, 152605916, 3258937, 3272897], // Todos são editores
};

// ============================================
// EQUIPE ADS
// ============================================
export const TEAM_ADS: Team = {
    id: 'ads',
    name: 'ADs',
    shortName: 'ADs',
    description: 'Criativos para anúncios',
    color: '#10b981', // emerald
    members: [
        { id: 96683026, name: 'Leonardo da Silva', role: 'leader' },
        { id: 84241154, name: 'Rafael Andrade', role: 'editor' },
    ],
    editorIds: [84241154], // Média só do Rafael
    leaderId: 96683026, // Leonardo é líder
};

// ============================================
// EQUIPE TP/MIC/LEAD
// ============================================
export const TEAM_TP_MIC_LEAD: Team = {
    id: 'tp-mic-lead',
    name: 'TP/MIC/LEAD',
    shortName: 'TP/MIC',
    description: 'Troca de Pote, Microlead e Lead',
    color: '#f59e0b', // amber
    members: [
        { id: 82093531, name: 'Loren Gayoso', role: 'editor' },
        { id: 82074101, name: 'Bruno Cesar', role: 'editor' },
    ],
    editorIds: [82093531, 82074101], // Média entre os dois
};

// ============================================
// TODAS AS EQUIPES
// ============================================
export const ALL_TEAMS: Team[] = [
    TEAM_VSL,
    TEAM_FUNIL,
    TEAM_ADS,
    TEAM_TP_MIC_LEAD,
];

// Mapa de equipe por ID do membro
export const MEMBER_TO_TEAM_MAP: Map<number, Team> = new Map();
ALL_TEAMS.forEach(team => {
    team.members.forEach(member => {
        MEMBER_TO_TEAM_MAP.set(member.id, team);
    });
});

// Função para obter equipe de um membro
export function getTeamByMemberId(memberId: number): Team | undefined {
    return MEMBER_TO_TEAM_MAP.get(memberId);
}

// Função para obter membro por ID
export function getMemberById(memberId: number): TeamMember | undefined {
    for (const team of ALL_TEAMS) {
        const member = team.members.find(m => m.id === memberId);
        if (member) return member;
    }
    return undefined;
}

// Função para verificar se é líder
export function isLeader(memberId: number): boolean {
    const member = getMemberById(memberId);
    return member?.role === 'leader';
}

// ============================================
// IDs CONSOLIDADOS (para compatibilidade)
// ============================================

// IDs dos editores válidos da equipe Audiovisual (todos os membros)
export const AUDIOVISUAL_TEAM_IDS = ALL_TEAMS.flatMap(team =>
    team.members.map(m => m.id)
);

// IDs de usuários a serem EXCLUÍDOS das métricas (não são editores)
export const EXCLUDED_USER_IDS = [
    55083349,     // Exclusão anterior
    224505888,    // João Pedro Xavier Millen Penedo
    230468751,    // Jamile Castro Félix
    89254046,     // Leonardo Cruz
    230468665,    // Denner Silva
    2142641513,   // Isaías Deodato
];
