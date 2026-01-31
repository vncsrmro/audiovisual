import puppeteer, { Browser } from 'puppeteer';

export interface FrameIoComment {
    author: string;
    text: string;
    timestamp: string;
    commentNumber: number;
}

export interface FrameIoFeedback {
    url: string;
    assetName: string;
    comments: FrameIoComment[];
    error?: string;
}

export type FeedbackCategory =
    | 'Áudio/Voz'
    | 'Legenda/Texto'
    | 'Corte/Transição'
    | 'Fonte/Tipografia'
    | 'Cor/Imagem'
    | 'Timing/Sincronização'
    | 'Logo/Marca'
    | 'CTA/Preço'
    | 'Footage/Vídeo'
    | 'Outros';

/**
 * Extracts comments from a Frame.io public link using Puppeteer
 */
export async function extractFrameIoComments(frameIoUrl: string, existingBrowser?: Browser): Promise<FrameIoFeedback> {
    let browser = existingBrowser;
    let shouldCloseBrowser = false;

    try {
        // Normalize URL
        let url = frameIoUrl.trim();
        if (!url.startsWith('http')) {
            url = `https://${url}`;
        }

        console.log(`[Frame.io] Extracting comments from: ${url}`);

        if (!browser) {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });
            shouldCloseBrowser = true;
        }

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 4000));

        const title = await page.title();
        const assetName = title.split(' - ')[0] || title;

        // Extract comments from page text
        const data = await page.evaluate(() => {
            const text = document.body.innerText;
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

            const comments: { author: string; text: string; timestamp: string; commentNumber: number }[] = [];

            for (let i = 0; i < lines.length; i++) {
                // Look for pattern: #N followed by timestamp
                const commentMatch = lines[i].match(/^#(\d+)$/);
                if (commentMatch) {
                    const commentNum = parseInt(commentMatch[1]);

                    // Next line should be timestamp
                    const timestampLine = lines[i + 1] || '';
                    const timestampMatch = timestampLine.match(/^(\d{2}:\d{2}:\d{2}(?::\d{2})?)/);

                    if (timestampMatch) {
                        // The comment text follows the timestamp
                        const commentText = lines[i + 2] || '';

                        // Find the author (usually 2-3 lines before #N)
                        let author = 'Unknown';
                        for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
                            // Skip common UI elements
                            if (!['Reply', 'Oldest', 'Newest', 'Completed', 'Commenter', 'All comments'].includes(lines[j])
                                && !lines[j].match(/^\d+[hmd]$/) // time ago like "20h"
                                && lines[j].length > 1
                                && lines[j].length < 50) {
                                author = lines[j];
                                break;
                            }
                        }

                        // Handle multi-line comments (look for Reply as end marker)
                        let fullText = commentText;
                        let k = i + 3;
                        while (k < lines.length && lines[k] !== 'Reply' && !lines[k].match(/^#\d+$/)) {
                            if (lines[k] && !lines[k].match(/^\d{2}:\d{2}:\d{2}/)) {
                                fullText += ' ' + lines[k];
                            }
                            k++;
                        }

                        if (fullText && fullText !== 'Reply') {
                            comments.push({
                                author,
                                text: fullText.trim(),
                                timestamp: timestampMatch[1],
                                commentNumber: commentNum
                            });
                        }
                    }
                }
            }

            return { comments };
        });

        await page.close();

        console.log(`[Frame.io] Found ${data.comments.length} comments in "${assetName}"`);

        return {
            url,
            assetName,
            comments: data.comments
        };

    } catch (error) {
        console.error(`[Frame.io] Error:`, error);
        return {
            url: frameIoUrl,
            assetName: '',
            comments: [],
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    } finally {
        if (browser && shouldCloseBrowser) {
            await browser.close();
        }
    }
}

/**
 * Extracts comments from multiple Frame.io links efficiently
 */
export async function extractMultipleFrameIoComments(urls: string[]): Promise<FrameIoFeedback[]> {
    if (urls.length === 0) return [];

    const results: FrameIoFeedback[] = [];

    let browser: Browser | undefined;

    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        for (const url of urls) {
            const feedback = await extractFrameIoComments(url, browser);
            results.push(feedback);
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    return results;
}

/**
 * Categorizes a comment into an error type
 */
export function categorizeComment(text: string): FeedbackCategory {
    const lowerText = text.toLowerCase();

    const patterns: Record<FeedbackCategory, RegExp[]> = {
        'Áudio/Voz': [
            /áudio/i, /audio/i, /som/i, /volume/i, /voz/i, /voice/i,
            /música/i, /musica/i, /barulho/i, /eleven ?labs/i, /avatar/i
        ],
        'Legenda/Texto': [
            /legenda/i, /subtitle/i, /escrit[oa]/i, /palavra/i, /frase/i,
            /erro.*escrit/i, /ortograf/i, /errad[oa]/i, /texto/i
        ],
        'Corte/Transição': [
            /corte/i, /transição/i, /transicao/i, /fade/i, /passar/i,
            /mudar/i, /edição/i, /edicao/i, /pular/i
        ],
        'Fonte/Tipografia': [
            /fonte/i, /font/i, /tamanho/i, /size/i, /tipografia/i,
            /letra/i, /negrito/i, /bold/i, /itálico/i
        ],
        'Cor/Imagem': [
            /cor\b/i, /color/i, /imagem/i, /image/i, /qualidade/i,
            /resolução/i, /brilho/i, /contraste/i, /saturação/i
        ],
        'Timing/Sincronização': [
            /timing/i, /sincroni/i, /tempo/i, /ritmo/i, /velocidade/i,
            /lento/i, /rápido/i, /rapido/i, /atrasa/i, /adiant/i
        ],
        'Logo/Marca': [
            /logo/i, /marca/i, /brand/i, /watermark/i, /selo/i
        ],
        'CTA/Preço': [
            /cta/i, /preço/i, /preco/i, /price/i, /botão/i, /botao/i,
            /comprar/i, /oferta/i, /desconto/i, /valor/i, /\$/
        ],
        'Footage/Vídeo': [
            /footage/i, /vídeo/i, /video/i, /clip/i, /troca/i,
            /aparec/i, /pote/i, /cena/i, /imagem/i, /b-?roll/i
        ],
        'Outros': []
    };

    for (const [category, regexList] of Object.entries(patterns)) {
        if (category === 'Outros') continue;
        if (regexList.some(regex => regex.test(lowerText))) {
            return category as FeedbackCategory;
        }
    }

    return 'Outros';
}

/**
 * Categorizes all comments and groups by category
 */
export function categorizeComments(comments: FrameIoComment[]): Record<FeedbackCategory, FrameIoComment[]> {
    const result: Record<FeedbackCategory, FrameIoComment[]> = {
        'Áudio/Voz': [],
        'Legenda/Texto': [],
        'Corte/Transição': [],
        'Fonte/Tipografia': [],
        'Cor/Imagem': [],
        'Timing/Sincronização': [],
        'Logo/Marca': [],
        'CTA/Preço': [],
        'Footage/Vídeo': [],
        'Outros': []
    };

    for (const comment of comments) {
        const category = categorizeComment(comment.text);
        result[category].push(comment);
    }

    return result;
}

/**
 * Analyzes feedback patterns for an editor
 */
export function analyzeEditorPatterns(feedbacks: FrameIoFeedback[]): {
    totalComments: number;
    byCategory: Record<FeedbackCategory, number>;
    topIssues: { category: FeedbackCategory; count: number; percentage: number }[];
} {
    const allComments = feedbacks.flatMap(f => f.comments);
    const categorized = categorizeComments(allComments);

    const byCategory: Record<FeedbackCategory, number> = {} as Record<FeedbackCategory, number>;
    let total = 0;

    for (const [category, comments] of Object.entries(categorized)) {
        byCategory[category as FeedbackCategory] = comments.length;
        total += comments.length;
    }

    const topIssues = Object.entries(byCategory)
        .map(([category, count]) => ({
            category: category as FeedbackCategory,
            count,
            percentage: total > 0 ? (count / total) * 100 : 0
        }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count);

    return {
        totalComments: total,
        byCategory,
        topIssues
    };
}

export const frameIoService = {
    extractComments: extractFrameIoComments,
    extractMultiple: extractMultipleFrameIoComments,
    categorizeComment,
    categorizeComments,
    analyzePatterns: analyzeEditorPatterns
};
