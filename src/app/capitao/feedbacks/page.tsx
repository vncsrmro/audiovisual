import { getFeedbacksData } from '@/lib/cached-data.service';
import { FeedbacksView } from './feedbacks-view';

export const revalidate = 300;

export default async function FeedbacksPage() {
    const data = await getFeedbacksData();

    return (
        <FeedbacksView
            tasks={data.tasks}
            feedbackData={data.feedbackData}
            currentAlterationTasks={data.currentAlterationTasks}
            lastUpdated={data.lastUpdated}
        />
    );
}
