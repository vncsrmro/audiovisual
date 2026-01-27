import { ClickUpTask } from '@/types';
import { AUDIOVISUAL_TEAM_IDS } from './constants';

const CLICKUP_API_URL = 'https://api.clickup.com/api/v2';
const MAX_PAGES = 10; // Safety limit for pagination

export class ClickUpService {
    private apiKey: string;
    private listId: string;

    constructor() {
        this.apiKey = process.env.CLICKUP_API_KEY || '';
        this.listId = process.env.CLICKUP_LIST_ID || '';
    }

    /**
     * Fetches all tasks from the configured list, handling pagination.
     * Filters by "AUDIOVISUAL" tag OR if assignee is in the AUDIOVISUAL_TEAM_IDS list.
     */
    async fetchTasks(): Promise<ClickUpTask[]> {
        if (!this.apiKey || !this.listId) {
            console.error('ClickUp credentials missing');
            return [];
        }

        let allTasks: ClickUpTask[] = [];
        let page = 0;
        let hasMore = true;

        try {
            while (hasMore && page < MAX_PAGES) {
                const url = `${CLICKUP_API_URL}/list/${this.listId}/task?page=${page}&include_closed=true&subtasks=true`;
                console.log(`[ClickUp] Fetching page ${page}... URL: ${url}`);

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': this.apiKey,
                        'Content-Type': 'application/json',
                    },
                    cache: 'no-store', // Always fetch fresh data
                });

                if (!response.ok) {
                    const body = await response.text();
                    console.error(`[ClickUp] API Error: ${response.status} ${response.statusText} - Body: ${body}`);
                    throw new Error(`ClickUp API Error: ${response.statusText}`);
                }

                const data = await response.json();
                const tasks: ClickUpTask[] = data.tasks || [];

                console.log(`[ClickUp] Page ${page} fetched. Count: ${tasks.length}`);

                if (tasks.length > 0) {
                    // DEBUG: Log key fields of the first task to find where "Hours" are stored
                    const t = tasks[0];
                    console.log(`[ClickUp] Debug Task [${t.name}]:`, JSON.stringify({
                        status: t.status,
                        time_spent: t.time_spent,
                        date_created: t.date_created,
                        date_closed: t.date_closed,
                        custom_fields: t.custom_fields.map(f => ({ name: f.name, value: f.value, type: f.type }))
                    }, null, 2));
                }

                if (tasks.length === 0) {
                    hasMore = false;
                } else {
                    allTasks = [...allTasks, ...tasks];
                    page++;
                }
            }

            console.log(`[ClickUp] Total raw tasks fetched: ${allTasks.length}`);

            // MODIFIED FILTER: Check Tag OR Assignee ID
            const filteredTasks = allTasks.filter(task => {
                // Condition 1: Has "AUDIOVISUAL" Tag
                const hasTag = task.tags.some(tag => tag.name.toUpperCase() === 'AUDIOVISUAL');

                // Condition 2: Assigned to one of the Team Members
                const hasTeamMember = task.assignees.some(user => AUDIOVISUAL_TEAM_IDS.includes(user.id));

                const isValid = hasTag || hasTeamMember;

                if (!isValid && allTasks.length < 50) {
                    // console.log(`[ClickUp] Task '${task.name}' REJECTED. Tags: [${task.tags.map(t => t.name).join(', ')}] Assignees: [${task.assignees.map(u => u.id).join(', ')}]`);
                }
                return isValid;
            });

            console.log(`[ClickUp] Valid tasks after filter (Tag OR Team Member): ${filteredTasks.length}`);

            return filteredTasks;

        } catch (error) {
            console.error('Failed to fetch ClickUp tasks:', error);
            return [];
        }
    }
}

export const clickupService = new ClickUpService();
