import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Drop old table if exists
        await sql`DROP TABLE IF EXISTS task_history;`;

        // Create new table with expanded schema for time tracking
        const result = await sql`
            CREATE TABLE IF NOT EXISTS task_status_history (
                id SERIAL PRIMARY KEY,
                task_id VARCHAR(50) NOT NULL,
                task_name TEXT,
                previous_status VARCHAR(100),
                new_status VARCHAR(100) NOT NULL,
                editor_id VARCHAR(50),
                editor_name VARCHAR(100),
                event_timestamp BIGINT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;

        // Create indexes for efficient queries
        await sql`CREATE INDEX IF NOT EXISTS idx_task_status_task_id ON task_status_history(task_id);`;
        await sql`CREATE INDEX IF NOT EXISTS idx_task_status_timestamp ON task_status_history(event_timestamp);`;

        return NextResponse.json({
            success: true,
            message: 'Table task_status_history created successfully with indexes'
        }, { status: 200 });
    } catch (error) {
        console.error('Error setting up database:', error);
        return NextResponse.json({ error }, { status: 500 });
    }
}
