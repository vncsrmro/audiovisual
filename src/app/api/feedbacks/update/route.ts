import { NextResponse } from 'next/server';
import { clickupService } from '@/lib/clickup.service';
import { AUDIOVISUAL_TEAM_IDS } from '@/lib/constants';
import { extractFrameIoComments, categorizeComment } from '@/lib/frameio-api.service';

export const maxDuration = 60;

export async function POST() {
    try {
        console.log('[Feedbacks Update] Starting extraction...');

        if (!process.env.BROWSERLESS_API_KEY) {
            return NextResponse.json({
                success: false,
                error: 'BROWSERLESS_API_KEY not configured'
            }, { status: 500 });
        }

        // Fetch tasks to get Frame.io links
        const allTasks = await clickupService.fetchTasks();
        const audiovisualTasks = allTasks.filter(task =>
            task.assignees?.some(a => AUDIOVISUAL_TEAM_IDS.includes(a.id))
        );

        const taskIds = audiovisualTasks.map(t => t.id);
        const phaseTimeMap = await clickupService.fetchPhaseTimeForTasks(taskIds);
        const feedbackData = await clickupService.fetchFeedbackAuditDataOptimized(audiovisualTasks, phaseTimeMap);

        // Get Frame.io links
        const tasksWithAlteration = feedbackData.filter(d => d.hadAlteration && d.frameIoLinks.length > 0);
        const allFrameIoUrls = [...new Set(tasksWithAlteration.flatMap(d => d.frameIoLinks))];

        console.log(`[Feedbacks Update] Found ${allFrameIoUrls.length} Frame.io URLs`);

        // Extract comments from first 2 links only (to avoid timeout)
        const urlsToProcess = allFrameIoUrls.slice(0, 2);
        const results = [];

        for (const url of urlsToProcess) {
            console.log(`[Feedbacks Update] Extracting: ${url}`);
            const feedback = await extractFrameIoComments(url);
            results.push({
                url,
                comments: feedback.comments.map(c => ({
                    ...c,
                    category: categorizeComment(c.text)
                })),
                error: feedback.error
            });
        }

        const totalComments = results.reduce((acc, r) => acc + r.comments.length, 0);

        return NextResponse.json({
            success: true,
            stats: {
                totalUrls: allFrameIoUrls.length,
                processedUrls: urlsToProcess.length,
                commentsExtracted: totalComments
            },
            results,
            message: `${totalComments} feedbacks extraídos de ${urlsToProcess.length} links`
        });

    } catch (error) {
        console.error('[Feedbacks Update] Error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function GET() {
    return POST();
}
