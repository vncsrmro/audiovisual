import { clickupService } from '@/lib/clickup.service';
import { FeedbacksView } from './feedbacks-view';

export const revalidate = 300;
export const maxDuration = 60; // Allow up to 60 seconds for fetching comments

export default async function FeedbacksPage() {
    // Fetch tasks that have been through revision/approval process
    const tasks = await clickupService.fetchTasks();

    // Filter tasks that had alteration or are completed (most likely to have Frame.io links)
    const tasksWithAlteration = tasks.filter(task => {
        const statusUpper = task.status.status.toUpperCase();
        return statusUpper.includes('ALTERA') ||
            statusUpper.includes('REVIS') ||
            statusUpper === 'APROVADO' ||
            statusUpper === 'CONCLUÍDO' ||
            statusUpper === 'FALTA SUBIR';
    });

    // Fetch comments for these tasks to find Frame.io links
    // Limit to first 50 tasks to avoid timeout
    const tasksToCheck = tasksWithAlteration.slice(0, 50);
    const tasksWithFrameIo = await clickupService.fetchTasksWithFrameIoLinks(tasksToCheck);

    // Filter only tasks that have Frame.io links
    const tasksWithLinks = tasksWithFrameIo.filter(t => t.frameIoLinks.length > 0);

    return (
        <FeedbacksView
            tasks={tasks}
            tasksWithFrameIo={tasksWithLinks}
            lastUpdated={Date.now()}
        />
    );
}
