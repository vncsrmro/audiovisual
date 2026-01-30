import { clickupService } from '@/lib/clickup.service';
import { dataService } from '@/lib/data-service';
import { timeTrackingService } from '@/lib/time-tracking.service';
import { TaskPhaseTime } from '@/types';
import { RelatoriosView } from './relatorios-view';

export const revalidate = 300;

export default async function RelatoriosPage() {
    // Fetch tasks from ClickUp
    const tasks = await clickupService.fetchTasks();

    // Get phase time data
    const taskIds = tasks.map(t => t.id);
    let phaseTimeMap: Map<string, TaskPhaseTime>;

    try {
        phaseTimeMap = await timeTrackingService.getPhaseTimeForTasks(taskIds);

        const tasksWithoutTime = taskIds.filter(id => {
            const phaseTime = phaseTimeMap.get(id);
            return !phaseTime || (phaseTime.editingTimeMs === 0 && phaseTime.revisionTimeMs === 0);
        });

        if (tasksWithoutTime.length > 0) {
            const clickupPhaseMap = await clickupService.fetchPhaseTimeForTasks(tasksWithoutTime);
            for (const [taskId, phaseTime] of clickupPhaseMap) {
                const existing = phaseTimeMap.get(taskId);
                if (!existing || (existing.editingTimeMs === 0 && existing.revisionTimeMs === 0)) {
                    phaseTimeMap.set(taskId, phaseTime);
                }
            }
        }
    } catch (error) {
        console.error('[Relatorios] Error fetching phase time:', error);
        phaseTimeMap = new Map();
    }

    // Normalize and calculate
    const normalized = dataService.normalizeTasks(tasks, phaseTimeMap);
    const kpis = dataService.calculateDashboardKPIs(normalized);

    return (
        <RelatoriosView
            kpis={kpis}
            allVideos={normalized}
            lastUpdated={Date.now()}
        />
    );
}
