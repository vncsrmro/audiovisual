import { getCachedDashboardData } from '@/lib/cached-data.service';
import { EvolucaoSetorView } from './evolucao-setor-view';

export const dynamic = 'force-dynamic';

export default async function EvolucaoSetorPage() {
    const data = await getCachedDashboardData();

    return (
        <EvolucaoSetorView
            allVideos={data.normalized}
            lastUpdated={data.timestamp}
        />
    );
}
