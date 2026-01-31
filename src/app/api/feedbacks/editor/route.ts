import { NextResponse } from 'next/server';
import { clickupService } from '@/lib/clickup.service';
import { AUDIOVISUAL_TEAM_IDS, getMemberById } from '@/lib/constants';
import { extractFrameIoComments, categorizeComment, FeedbackCategory } from '@/lib/frameio-api.service';

export const maxDuration = 60;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { editorId } = body;

        if (!editorId) {
            return NextResponse.json({ error: 'editorId required' }, { status: 400 });
        }

        if (!process.env.BROWSERLESS_API_KEY) {
            return NextResponse.json({ error: 'BROWSERLESS_API_KEY not configured' }, { status: 500 });
        }

        // Convert to number for comparison (ClickUp IDs are numbers)
        const editorIdNum = Number(editorId);
        const member = getMemberById(editorIdNum);
        console.log(`[Editor Feedback] Fetching for: ${member?.name || editorId} (ID: ${editorIdNum})`);

        // Fetch tasks
        const allTasks = await clickupService.fetchTasks();
        const editorTasks = allTasks.filter(task =>
            task.assignees?.some(a => a.id === editorIdNum)
        );

        console.log(`[Editor Feedback] Found ${editorTasks.length} tasks for editor`);

        // Get phase time to detect alterations
        const taskIds = editorTasks.map(t => t.id);
        const phaseTimeMap = await clickupService.fetchPhaseTimeForTasks(taskIds);
        const feedbackData = await clickupService.fetchFeedbackAuditDataOptimized(editorTasks, phaseTimeMap);

        // Get Frame.io links from tasks with alterations
        const tasksWithAlteration = feedbackData.filter(d => d.hadAlteration && d.frameIoLinks.length > 0);
        const frameIoUrls = [...new Set(tasksWithAlteration.flatMap(d => d.frameIoLinks))];

        console.log(`[Editor Feedback] ${tasksWithAlteration.length} tasks with alteration, ${frameIoUrls.length} Frame.io links`);

        // Extract comments (limit to 5 links to avoid timeout)
        const urlsToProcess = frameIoUrls.slice(0, 5);
        const errorPatterns: Record<FeedbackCategory, number> = {
            'Áudio/Voz': 0,
            'Legenda/Texto': 0,
            'Corte/Transição': 0,
            'Fonte/Tipografia': 0,
            'Cor/Imagem': 0,
            'Timing/Sincronização': 0,
            'Logo/Marca': 0,
            'CTA/Preço': 0,
            'Footage/Vídeo': 0,
            'Outros': 0
        };

        const allComments: Array<{
            text: string;
            category: FeedbackCategory;
            timestamp: string;
            taskName: string;
        }> = [];

        for (const url of urlsToProcess) {
            console.log(`[Editor Feedback] Extracting: ${url}`);
            const feedback = await extractFrameIoComments(url);

            // Find which task this URL belongs to
            const task = tasksWithAlteration.find(t => t.frameIoLinks.includes(url));

            feedback.comments.forEach(c => {
                const category = categorizeComment(c.text);
                errorPatterns[category]++;
                allComments.push({
                    text: c.text,
                    category,
                    timestamp: c.timestamp,
                    taskName: task?.task.name || 'Unknown'
                });
            });
        }

        const totalErrors = Object.values(errorPatterns).reduce((a, b) => a + b, 0);

        // Get top errors sorted
        const topErrors = Object.entries(errorPatterns)
            .filter(([_, count]) => count > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([category, count]) => ({
                category,
                count,
                percentage: totalErrors > 0 ? Math.round((count / totalErrors) * 100) : 0
            }));

        return NextResponse.json({
            success: true,
            editor: {
                id: editorIdNum,
                name: member?.name || 'Unknown',
                color: member?.color || '#666'
            },
            stats: {
                totalTasks: editorTasks.length,
                tasksWithAlteration: tasksWithAlteration.length,
                alterationRate: editorTasks.length > 0
                    ? Math.round((tasksWithAlteration.length / editorTasks.length) * 100)
                    : 0,
                totalFrameIoLinks: frameIoUrls.length,
                linksProcessed: urlsToProcess.length,
                totalFeedbacks: totalErrors
            },
            errorPatterns: topErrors,
            recentComments: allComments.slice(0, 10), // Last 10 comments
            updatedAt: Date.now()
        });

    } catch (error) {
        console.error('[Editor Feedback] Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
