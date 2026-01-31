import { getEvolucaoData } from '@/lib/cached-data.service';
import { EvolucaoView } from './evolucao-view';

export const revalidate = 300;

export default async function EvolucaoPage() {
    const data = await getEvolucaoData();

    return (
        <EvolucaoView
            kpis={data.kpis}
            allVideos={data.allVideos}
            lastUpdated={data.lastUpdated}
        />
    );
}
