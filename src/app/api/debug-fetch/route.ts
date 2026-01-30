import { NextResponse } from 'next/server';

const CLICKUP_API_URL = 'https://api.clickup.com/api/v2';
const MAX_PAGES = 10;

// IDs dos editores válidos (mesmos do constants.ts)
const VALID_EDITOR_IDS = [
    248675265,  // Nathan Soares (VSL)
    84070913,   // Victor Mazzine (VSL)
    112053206,  // Moises Ramalho (Funil)
    152605916,  // Victor Mendes (Funil)
    3258937,    // Renato Fernandes (Funil)
    3272897,    // Douglas Prado (Funil)
    96683026,   // Leonardo da Silva (ADs - líder)
    84241154,   // Rafael Andrade (ADs)
    82093531,   // Loren Gayoso (TP/MIC/LEAD)
    82074101,   // Bruno Cesar (TP/MIC/LEAD)
];

// Extract numeric list ID from various ClickUp URL formats
function extractListId(input: string): string {
    const dashMatch = input.match(/^6-(\d+)-\d+$/);
    if (dashMatch) {
        return dashMatch[1];
    }
    if (/^\d+$/.test(input)) {
        return input;
    }
    return input;
}

export async function GET(request: Request) {
    const apiKey = process.env.CLICKUP_API_KEY || '';
    const rawListId = process.env.CLICKUP_LIST_ID || '';

    const listIds = rawListId
        .split(/[\n,\s]+/)
        .map(id => id.trim())
        .filter(id => id.length > 0)
        .map(id => extractListId(id));

    if (!apiKey || listIds.length === 0) {
        return NextResponse.json({
            error: 'ClickUp credentials missing',
            hasApiKey: !!apiKey,
            listIds: listIds,
            rawListIdValue: rawListId || 'EMPTY',
        });
    }

    try {
        const START_DATE_2026 = new Date('2026-01-01T00:00:00Z').getTime();

        // Fetch from ALL lists with pagination
        const allTasks: any[] = [];
        const listResults: any[] = [];

        for (const listId of listIds) {
            let page = 0;
            let hasMore = true;
            let listTaskCount = 0;
            let listName = '';

            // Get list info
            const listInfoRes = await fetch(`${CLICKUP_API_URL}/list/${listId}`, {
                headers: { 'Authorization': apiKey },
                cache: 'no-store',
            });
            if (listInfoRes.ok) {
                const listInfo = await listInfoRes.json();
                listName = listInfo.name;
            }

            while (hasMore && page < MAX_PAGES) {
                const url = `${CLICKUP_API_URL}/list/${listId}/task?page=${page}&include_closed=true&subtasks=true&date_created_gt=${START_DATE_2026}`;

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': apiKey,
                        'Content-Type': 'application/json',
                    },
                    cache: 'no-store',
                });

                if (!response.ok) {
                    break;
                }

                const data = await response.json();
                const tasks = data.tasks || [];

                if (tasks.length === 0) {
                    hasMore = false;
                } else {
                    allTasks.push(...tasks);
                    listTaskCount += tasks.length;
                    page++;
                }
            }

            listResults.push({
                listId,
                listName,
                taskCount: listTaskCount,
                pages: page
            });
        }

        // Collect ALL assignees from ALL tasks
        const assigneeCounts: Record<string, { id: number; username: string; count: number; isValidEditor: boolean }> = {};
        for (const task of allTasks) {
            for (const assignee of (task.assignees || [])) {
                const key = String(assignee.id);
                if (!assigneeCounts[key]) {
                    assigneeCounts[key] = {
                        id: assignee.id,
                        username: assignee.username,
                        count: 0,
                        isValidEditor: VALID_EDITOR_IDS.includes(assignee.id)
                    };
                }
                assigneeCounts[key].count++;
            }
        }

        // Status distribution
        const statusCounts: Record<string, number> = {};
        for (const task of allTasks) {
            const status = task.status?.status?.toLowerCase() || 'unknown';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        }

        // Filter tasks that have at least one valid editor
        const tasksWithValidEditors = allTasks.filter(task =>
            task.assignees?.some((a: any) => VALID_EDITOR_IDS.includes(a.id))
        );

        // Get approved/completed tasks with valid editors
        const completedStatuses = ['aprovado', 'concluído', 'concluido', 'completed', 'done', 'closed'];
        const completedTasksWithEditors = tasksWithValidEditors.filter(task =>
            completedStatuses.includes(task.status?.status?.toLowerCase() || '')
        );

        // Sample completed tasks
        const sampleCompletedTasks = completedTasksWithEditors.slice(0, 10).map((t: any) => ({
            id: t.id,
            name: t.name,
            status: t.status?.status,
            date_created: new Date(parseInt(t.date_created)).toISOString(),
            date_closed: t.date_closed ? new Date(parseInt(t.date_closed)).toISOString() : null,
            assignees: t.assignees?.map((a: any) => ({
                id: a.id,
                name: a.username,
                isValidEditor: VALID_EDITOR_IDS.includes(a.id)
            }))
        }));

        return NextResponse.json({
            configDebug: {
                rawEnvValue: rawListId,
                parsedListIds: listIds,
                filterDate: new Date(START_DATE_2026).toISOString()
            },
            listResults,
            totalTasksFromAllLists: allTasks.length,
            tasksWithValidEditors: tasksWithValidEditors.length,
            completedTasksWithEditors: completedTasksWithEditors.length,
            statusDistribution: statusCounts,
            allAssignees: Object.values(assigneeCounts).sort((a, b) => b.count - a.count),
            validEditorIds: VALID_EDITOR_IDS,
            sampleCompletedTasks,
            currentTimestamp: Date.now(),
            currentDate: new Date().toISOString()
        });
    } catch (error) {
        return NextResponse.json({
            error: String(error),
            stack: error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}
