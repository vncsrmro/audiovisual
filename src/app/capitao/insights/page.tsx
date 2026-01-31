import { getInsightsData } from '@/lib/cached-data.service';
import { InsightsView } from './insights-view';

// Force dynamic rendering to always fetch fresh data
export const dynamic = 'force-dynamic';

export default async function InsightsPage() {
    const data = await getInsightsData();

    return (
        <InsightsView
            critical={data.critical}
            attention={data.attention}
            ok={data.ok}
            summary={data.summary}
            periodLabel={data.periodLabel}
            comparisonLabel={data.comparisonLabel}
            lastUpdated={data.lastUpdated}
        />
    );
}
