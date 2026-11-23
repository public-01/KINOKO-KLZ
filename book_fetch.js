const checkResponse = require('./http');
const sha256 = require('./sha256');
const catalog = require('./catalog');

const BASE_URL = 'https://klz9.com/';
const API_URL = `${BASE_URL}api/`;
const TARGET_LANGUAGE = 'Traditional Chinese';
const SIGNING_SALT = 'KL9K40zaSyC9K40vOMLLbEcepIFBhUKXwELqxlwTEF';
const TRANSLATION_CACHE_PREFIX = 'klz9:ai-translation:';
const TRANSLATION_USAGE_KEY = 'mangazen_guest_ai_translation_daily_v1';
const DAILY_TRANSLATION_LIMIT = 3;

function getSignatureHeaders() {
    const timestamp = Math.floor(new Date().getTime() / 1000).toString();
    return {
        'Content-Type': 'application/json',
        'x-client-ts': timestamp,
        'x-client-sig': sha256(`${timestamp}.${SIGNING_SALT}`)
    };
}

function getUsage() {
    const saved = localStorage[TRANSLATION_USAGE_KEY];
    if (!saved) return { count: 0, resetAt: new Date().getTime() + 24 * 60 * 60 * 1000 };
    const usage = JSON.parse(saved);
    if (!usage.resetAt || usage.resetAt <= new Date().getTime()) {
        return { count: 0, resetAt: new Date().getTime() + 24 * 60 * 60 * 1000 };
    }
    return usage;
}

async function translateDescription(manga) {
    const description = (manga.description || '').trim();
    const untranslated = error => ({
        text: description,
        translated: false,
        error: error || ''
    });
    if (!description || description.toLowerCase() === 'updating') {
        return untranslated('');
    }

    const cacheKey = `${TRANSLATION_CACHE_PREFIX}${manga.id}:${TARGET_LANGUAGE}`;
    const cached = localStorage[cacheKey];
    if (cached) {
        try {
            const translation = JSON.parse(cached);
            if (translation && translation.text) {
                return {
                    text: translation.text,
                    translated: true,
                    error: ''
                };
            }
        } catch (e) {
            return untranslated(`AI 翻譯快取讀取失敗：${e}`);
        }
    }

    let usage;
    try {
        usage = getUsage();
    } catch (e) {
        return untranslated(`AI 翻譯額度讀取失敗：${e}`);
    }
    if (usage.count >= DAILY_TRANSLATION_LIMIT) {
        return untranslated('今日 AI 翻譯額度已用完，暫時顯示原文。');
    }
    usage.count++;
    localStorage[TRANSLATION_USAGE_KEY] = JSON.stringify(usage);

    const url = `${API_URL}gemini/translate-manga`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: getSignatureHeaders(),
            body: JSON.stringify({
                title: manga.name || '',
                description: description,
                targetLang: TARGET_LANGUAGE
            })
        });
        checkResponse(res, 'KLZ9 AI 翻譯失敗', url);
        const text = await res.text();
        if (!text.trim()) throw new Error('KLZ9 AI 翻譯回應為空');
        const result = JSON.parse(text);
        if (!result.translatedDescription) {
            throw new Error('KLZ9 未提供翻譯後的作品說明');
        }
        localStorage[cacheKey] = JSON.stringify({
            text: result.translatedDescription
        });
        return {
            text: result.translatedDescription,
            translated: true,
            error: ''
        };
    } catch (e) {
        return untranslated(`${e}`);
    }
}

function mapChapters(manga) {
    const chapters = Array.isArray(manga.chapters) ? manga.chapters : [];
    return chapters.slice().reverse().map(chapter => {
        const number = String(chapter.chapter);
        return {
            id: chapter.id,
            chapter: chapter.chapter,
            title: chapter.name || `Chapter ${number}`,
            link: new URL(`/${manga.slug}-chapter-${encodeURIComponent(number)}.html`, BASE_URL).toString(),
            subtitle: chapter.last_update ? chapter.last_update.slice(0, 10) : ''
        };
    });
}

module.exports = async function(url, includeTranslation) {
    const pathname = new URL(url).pathname;
    const slug = pathname.split('/').filter(Boolean).pop().replace(/\.html$/, '');
    if (!slug) throw new Error('Could not identify the KLZ9 manga');

    const endpoint = `${API_URL}manga/slug/${encodeURIComponent(slug)}`;
    const res = await fetch(endpoint, { headers: { Accept: 'application/json' } });
    checkResponse(res, 'Could not load KLZ9 manga details', endpoint);
    const responseText = await res.text();
    if (!responseText.trim()) throw new Error('KLZ9 returned empty manga details');
    const manga = JSON.parse(responseText);
    if (!manga || !manga.id || !Array.isArray(manga.chapters)) {
        throw new Error('Unexpected KLZ9 manga details response');
    }

    const originalDescription = (manga.description || '').trim();
    let translated = {
        text: originalDescription,
        translated: false,
        error: ''
    };
    if (includeTranslation !== false) translated = await translateDescription(manga);

    const authorInfo = [manga.authors, manga.trans_group].filter(value => value).join(' · ');
    const genres = typeof manga.genres === 'string' ? manga.genres.split(',').map(value => value.trim()) :
        (Array.isArray(manga.genres) ? manga.genres : []);
    const status = Number(manga.m_status) === 1 ? '已完結' : '連載中';
    const list = mapChapters(manga);
    if (list.length === 0) throw new Error('KLZ9 returned no chapters for this manga');
    const displayTitle = catalog.getDisplayTitle(manga);
    const originalTitle = displayTitle !== manga.name ? manga.name || '' : '';

    return {
        id: manga.id,
        title: displayTitle || manga.name || '',
        originalTitle: originalTitle,
        subtitle: authorInfo,
        otherName: manga.other_name || '',
        status: status,
        genresText: genres.join('、'),
        summary: translated.text,
        originalSummary: originalDescription,
        aiTranslated: translated.translated,
        translationWarning: translated.error,
        picture: manga.cover || '',
        list: list
    };
};
