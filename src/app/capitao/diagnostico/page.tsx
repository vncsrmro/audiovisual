import { getDiagnosticoData } from '@/lib/cached-data.service';
import { DiagnosticoView } from './diagnostico-view';

export const revalidate = 300;

export default async function DiagnosticoPage() {
    const data = await getDiagnosticoData();

    return (
        <DiagnosticoView
            kpis={data.kpis}
            thisWeekVideos={data.thisWeekVideos}
            lastWeekVideos={data.lastWeekVideos}
            allVideos={data.allVideos}
            lastUpdated={data.lastUpdated}
        />
    );
}
