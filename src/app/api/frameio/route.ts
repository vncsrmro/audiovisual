import { NextRequest, NextResponse } from 'next/server';
import { extractFrameIoComments, extractMultipleFrameIoComments, categorizeComment } from '@/lib/frameio.service';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { urls } = body;

        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return NextResponse.json(
                { error: 'Missing or invalid urls array' },
                { status: 400 }
            );
        }

        // Limit to 10 URLs per request
        const limitedUrls = urls.slice(0, 10);

        console.log(`[API] Extracting comments from ${limitedUrls.length} Frame.io links...`);

        const feedbacks = await extractMultipleFrameIoComments(limitedUrls);

        // Add categories to each comment
        const feedbacksWithCategories = feedbacks.map(feedback => ({
            ...feedback,
            comments: feedback.comments.map(comment => ({
                ...comment,
                category: categorizeComment(comment.text)
            }))
        }));

        return NextResponse.json({
            success: true,
            feedbacks: feedbacksWithCategories
        });

    } catch (error) {
        console.error('[API] Frame.io extraction error:', error);
        return NextResponse.json(
            { error: 'Failed to extract Frame.io comments' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
        return NextResponse.json(
            { error: 'Missing url parameter' },
            { status: 400 }
        );
    }

    try {
        console.log(`[API] Extracting comments from: ${url}`);

        const feedback = await extractFrameIoComments(url);

        // Add categories
        const feedbackWithCategories = {
            ...feedback,
            comments: feedback.comments.map(comment => ({
                ...comment,
                category: categorizeComment(comment.text)
            }))
        };

        return NextResponse.json({
            success: true,
            feedback: feedbackWithCategories
        });

    } catch (error) {
        console.error('[API] Frame.io extraction error:', error);
        return NextResponse.json(
            { error: 'Failed to extract Frame.io comments' },
            { status: 500 }
        );
    }
}
