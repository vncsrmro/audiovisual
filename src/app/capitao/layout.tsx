import { CapitaoSidebar } from '@/components/capitao/CapitaoSidebar';

export const metadata = {
    title: 'Capitão | XMX Corp',
    description: 'Central de Inteligência do Setor de Vídeo',
};

export default function CapitaoLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#0a0a0f] flex">
            <CapitaoSidebar />
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    );
}
