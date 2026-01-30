import { clickupService } from '@/lib/clickup.service';
import { dataService } from '@/lib/data-service';
import { timeTrackingService } from '@/lib/time-tracking.service';
import { TaskPhaseTime } from '@/types';
import { DiagnosticoView } from './diagnostico-view';

export const revalidate = 300;

export default async function DiagnosticoPage() {
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
        console.error('[Diagnostico] Error fetching phase time:', error);
        phaseTimeMap = new Map();
    }

    // Normalize and calculate
    const normalized = dataService.normalizeTasks(tasks, phaseTimeMap);
    const kpis = dataService.calculateDashboardKPIs(normalized);

    // Calculate weekly data
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    // Filter videos by week
    const thisWeekVideos = normalized.filter(v => {
        if (!v.dateClosed) return false;
        return v.dateClosed >= startOfWeek.getTime();
    });

    const lastWeekVideos = normalized.filter(v => {
        if (!v.dateClosed) return false;
        return v.dateClosed >= startOfLastWeek.getTime() && v.dateClosed < startOfWeek.getTime();
    });

    return (
        <DiagnosticoView
            kpis={kpis}
            thisWeekVideos={thisWeekVideos}
            lastWeekVideos={lastWeekVideos}
            allVideos={normalized}
            lastUpdated={Date.now()}
        />
    );
}
