import { ClickUpTask, NormalizedTask, EditorStats, DashboardKPIs } from '@/types';

export class DataService {

    /**
     * Normalizes raw ClickUp tasks into a clean format.
     * Handles time conversions and field extraction.
     */
    normalizeTasks(tasks: ClickUpTask[]): NormalizedTask[] {
        return tasks.map(task => {
            // 1. Extract Lead Time (Closed - Created)
            // Dates in ClickUp are Unix timestamps in milliseconds (string)
            const created = parseInt(task.date_created);
            const closed = task.date_closed ? parseInt(task.date_closed) : null;

            // 2. Extract Editor (First Assignee)
            const assignee = task.assignees.length > 0 ? task.assignees[0] : null;

            // 3. Extract Time Tracked (Convert ms to Hours)
            // Note: ClickUp 'time_spent' is in milliseconds
            const timeTrackedMs = task.time_spent || 0;
            const timeTrackedHours = parseFloat((timeTrackedMs / (1000 * 60 * 60)).toFixed(2));

            // 4. Custom Fields (Example: Video Type)
            // You'll need to inspect your actual custom_fields IDs to map this correctly.
            // For now, we leave it generic or look for a field named "Type"
            const typeField = task.custom_fields.find(f => f.name.toLowerCase().includes('tipo'));
            const videoType = typeField?.type_config?.options
                ? typeField.type_config.options[typeField.value]?.name
                : (typeof typeField?.value === 'string' ? typeField.value : 'Unknown');

            return {
                id: task.id,
                title: task.name,
                status: task.status.status.toUpperCase(),
                editorName: assignee ? assignee.username : 'Unassigned',
                editorId: assignee ? assignee.id : null,
                dateCreated: created,
                dateClosed: closed,
                timeTrackedHours,
                videoType,
                tags: task.tags.map(t => t.name),
            };
        });
    }

    /**
     * Aggregates normalized tasks into Editor KPIs.
     */
    calculateDashboardKPIs(tasks: NormalizedTask[]): DashboardKPIs {
        const editorsMap = new Map<string, EditorStats>(); // Key: EditorName for simplicity, usually ID

        // Initialize Global Counters
        let globalTotalVideos = 0;
        let globalTotalHours = 0;
        const tasksByStatus: { [key: string]: number } = {};
        const tasksByType: { [key: string]: number } = {};

        tasks.forEach(task => {
            // Filter for Completed/Closed tasks only for Performance Metrics? 
            // User asked for "Volume: Videos Entregues (Status Completed/Closed)"
            // So we consider "Entregues" as closed or completed.
            const isCompleted = ['COMPLETED', 'CLOSED', 'DONE'].includes(task.status);

            if (!editorsMap.has(task.editorName)) {
                editorsMap.set(task.editorName, {
                    editorId: task.editorId || 0,
                    editorName: task.editorName,
                    totalVideos: 0,
                    totalHours: 0,
                    avgHoursPerVideo: 0,
                    avgLeadTimeHours: 0,
                    videos: []
                });
            }

            const stats = editorsMap.get(task.editorName)!;
            stats.videos.push(task);

            // Global Status Counts
            tasksByStatus[task.status] = (tasksByStatus[task.status] || 0) + 1;

            // Global Type Counts
            if (task.videoType) {
                tasksByType[task.videoType] = (tasksByType[task.videoType] || 0) + 1;
            }

            if (isCompleted) {
                stats.totalVideos += 1;
                stats.totalHours += task.timeTrackedHours;

                globalTotalVideos += 1;
                globalTotalHours += task.timeTrackedHours;

                // Lead Time: DateClosed - DateCreated
                if (task.dateClosed) {
                    const leadTimeMs = task.dateClosed - task.dateCreated;
                    const leadTimeHours = leadTimeMs / (1000 * 60 * 60);
                    // We store sum temporarily in avgLeadTimeHours to calculate avg later
                    stats.avgLeadTimeHours += leadTimeHours;
                }
            }
        });

        // Finalize Averages
        const editors = Array.from(editorsMap.values()).map(stats => {
            if (stats.totalVideos > 0) {
                stats.avgHoursPerVideo = parseFloat((stats.totalHours / stats.totalVideos).toFixed(2));
                stats.avgLeadTimeHours = parseFloat((stats.avgLeadTimeHours / stats.totalVideos).toFixed(2)); // Divide sum by count
            }
            return stats;
        });

        // Find Top Performer (by Volume)
        const topPerformer = editors.reduce((prev, current) =>
            (current.totalVideos > prev.totalVideos) ? current : prev
            , { editorName: '', totalVideos: -1 });

        return {
            totalVideos: globalTotalVideos,
            totalHours: parseFloat(globalTotalHours.toFixed(2)),
            avgHoursPerVideo: globalTotalVideos > 0 ? parseFloat((globalTotalHours / globalTotalVideos).toFixed(2)) : 0,
            topPerformer: topPerformer.totalVideos >= 0 ? { name: topPerformer.editorName, count: topPerformer.totalVideos } : null,
            editors,
            tasksByStatus,
            tasksByType
        };
    }
}

export const dataService = new DataService();
