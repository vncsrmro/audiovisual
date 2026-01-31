import { getRelatoriosData } from '@/lib/cached-data.service';
import { RelatoriosView } from './relatorios-view';

export const revalidate = 300;

export default async function RelatoriosPage() {
    const data = await getRelatoriosData();

    return (
        <RelatoriosView
            kpis={data.kpis}
            allVideos={data.allVideos}
            lastUpdated={data.lastUpdated}
        />
    );
}
