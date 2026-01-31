import { clickupService } from '@/lib/clickup.service';
import { FeedbacksView } from './feedbacks-view';
import { AUDIOVISUAL_TEAM_IDS } from '@/lib/constants';

export const revalidate = 300;
export const maxDuration = 60;

export default async function FeedbacksPage() {
    // Fetch all tasks from editors
    const allTasks = await clickupService.fetchTasks();

    // Filter only tasks from audiovisual editors
    const audiovisualTasks = allTasks.filter(task =>
        task.assignees?.some(a => AUDIOVISUAL_TEAM_IDS.includes(a.id))
    );

    console.log(`[Feedbacks] Total tasks: ${allTasks.length}, Audiovisual: ${audiovisualTasks.length}`);

    // Fetch feedback audit data (includes alteration history and links)
    const feedbackData = await clickupService.fetchFeedbackAuditData(audiovisualTasks);

    // Also get tasks currently in "ALTERAÇÃO" status
    const tasksInAlteration = audiovisualTasks.filter(task => {
        const statusUpper = task.status.status.toUpperCase();
        return statusUpper.includes('ALTERA');
    });

    // Fetch Frame.io links for tasks currently in alteration
    const currentAlterationData = await clickupService.fetchTasksWithFrameIoLinks(tasksInAlteration.slice(0, 20));

    console.log(`[Feedbacks] Completed tasks analyzed: ${feedbackData.length}`);
    console.log(`[Feedbacks] With alteration history: ${feedbackData.filter(t => t.hadAlteration).length}`);
    console.log(`[Feedbacks] Currently in alteration: ${tasksInAlteration.length}`);

    return (
        <FeedbacksView
            tasks={audiovisualTasks}
            feedbackData={feedbackData}
            currentAlterationTasks={currentAlterationData}
            lastUpdated={Date.now()}
        />
    );
}
