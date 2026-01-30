import { NextResponse } from 'next/server';
import { clickupService } from '@/lib/clickup.service';

export const maxDuration = 60;

export async function GET() {
    try {
        // Fetch all tasks
        const tasks = await clickupService.fetchTasks();

        // Filter tasks that are likely to have Frame.io links
        const tasksWithAlteration = tasks.filter(task => {
            const statusUpper = task.status.status.toUpperCase();
            return statusUpper.includes('ALTERA') ||
                statusUpper.includes('REVIS') ||
                statusUpper === 'APROVADO' ||
                statusUpper === 'CONCLUÍDO' ||
                statusUpper === 'FALTA SUBIR';
        });

        // Get sample of 5 tasks to check comments
        const sampleTasks = tasksWithAlteration.slice(0, 5);

        const results = [];

        for (const task of sampleTasks) {
            // Fetch comments for this task
            const comments = await clickupService.fetchTaskComments(task.id);

            // Check for Frame.io links
            const frameIoRegex = /https?:\/\/(?:f\.io|frame\.io|next\.frame\.io)\/[^\s<>"']+/gi;

            // Check description
            const description = task.description || task.text_content || '';
            const descLinks = description.match(frameIoRegex) || [];

            // Check comments
            const commentLinks: string[] = [];
            const commentDetails: { user: string; text: string; links: string[] }[] = [];

            for (const comment of comments) {
                const commentText = comment.comment_text || '';
                const links = commentText.match(frameIoRegex) || [];
                commentLinks.push(...links);

                commentDetails.push({
                    user: comment.user?.username || 'Unknown',
                    text: commentText.substring(0, 200) + (commentText.length > 200 ? '...' : ''),
                    links: links,
                });
            }

            results.push({
                taskId: task.id,
                taskName: task.name,
                status: task.status.status,
                assignees: task.assignees?.map((a: any) => a.username) || [],
                descriptionLength: description.length,
                descriptionPreview: description.substring(0, 100) + (description.length > 100 ? '...' : ''),
                descriptionLinks: descLinks,
                commentsCount: comments.length,
                commentDetails: commentDetails,
                allFrameIoLinks: [...new Set([...descLinks, ...commentLinks])],
            });
        }

        return NextResponse.json({
            totalTasks: tasks.length,
            tasksWithAlteration: tasksWithAlteration.length,
            sampleChecked: sampleTasks.length,
            results,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        return NextResponse.json({
            error: String(error),
            stack: error instanceof Error ? error.stack : undefined,
        }, { status: 500 });
    }
}
