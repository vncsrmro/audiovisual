import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { event, task_id, history_items } = body;

        console.log(`[Webhook] Received event: ${event} for task ${task_id}`);
        console.log(`[Webhook] Full payload:`, JSON.stringify(body, null, 2));

        // Verify it's a status update
        if (event === 'taskStatusUpdated' && history_items) {
            const statusChange = history_items.find((item: any) => item.field === 'status');

            if (statusChange) {
                // Extract previous and new status
                const previousStatus = statusChange.before?.status?.toUpperCase() || null;
                const newStatus = statusChange.after?.status?.toUpperCase() || 'UNKNOWN';

                // Extract user who made the change
                const user = statusChange.user || body.user || {};
                const editorId = user.id?.toString() || null;
                const editorName = user.username || user.email || null;

                // Extract timestamp from ClickUp event (in ms)
                // Falls back to current time if not available
                const eventTimestamp = statusChange.date || body.date || Date.now();

                // Extract task name if available
                const taskName = body.task?.name || null;

                // Insert into new table with complete data
                await sql`
                    INSERT INTO task_status_history (
                        task_id,
                        task_name,
                        previous_status,
                        new_status,
                        editor_id,
                        editor_name,
                        event_timestamp
                    )
                    VALUES (
                        ${task_id},
                        ${taskName},
                        ${previousStatus},
                        ${newStatus},
                        ${editorId},
                        ${editorName},
                        ${eventTimestamp}
                    )
                `;

                console.log(`[Webhook] Saved status change for task ${task_id}: ${previousStatus} -> ${newStatus} by ${editorName} at ${new Date(eventTimestamp).toISOString()}`);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Webhook] Error processing request:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
