import { clickupService } from '@/lib/clickup.service';
import { FeedbacksView } from './feedbacks-view';

export const revalidate = 300;

export default async function FeedbacksPage() {
    // Fetch tasks that have been in ALTERAÇÃO status
    const tasks = await clickupService.fetchTasks();

    // Filter tasks that had alteration (went through revision process)
    const tasksWithAlteration = tasks.filter(task => {
        const statusUpper = task.status.status.toUpperCase();
        return statusUpper.includes('ALTERA') ||
            statusUpper.includes('REVIS') ||
            statusUpper === 'APROVADO' ||
            statusUpper === 'CONCLUÍDO';
    });

    return (
        <FeedbacksView
            tasks={tasksWithAlteration}
            lastUpdated={Date.now()}
        />
    );
}
