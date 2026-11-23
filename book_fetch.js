const checkResponse = require('./http');
const { decryptMangaCopyPayload } = require('./aes');

const BASE_URL = 'https://www.mangacopy.com/';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const AES_KEY = '0p0zzpvv.nmn.oop';

function makeChapterUrl(slug, id) {
    return new URL(`/comic/${slug}/chapter/${id}`, BASE_URL).toString();
}

function mapChapters(data, slug) {
    const records = data.groups || {};
    const keys = Object.keys(records);
    keys.sort((a, b) => {
        if (a === 'default') return -1;
        if (b === 'default') return 1;
        return 0;
    });
    const typeNames = { 1: '話', 2: '卷', 3: '番外' };
    const items = [];
    const seen = Object.create(null);
    for (let groupIndex = keys.length - 1; groupIndex >= 0; groupIndex--) {
        const key = keys[groupIndex];
        const group = records[key];
        const chapters = Array.isArray(group.chapters) ? group.chapters : [];
        for (const chapter of chapters) {
            const link = makeChapterUrl(slug, chapter.id);
            if (!chapter.id || seen[link]) continue;
            seen[link] = true;
            const typeName = typeNames[Number(chapter.type)];
            items.push({
                title: chapter.name || '',
                link: link,
                subtitle: [group.name || (key === 'default' ? '默認' : key), typeName]
                    .filter(value => value).join(' · ')
            });
        }
    }
    return items;
}

module.exports = async function(url) {
    const res = await fetch(url, {
        headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
    });
    checkResponse(res, 'Could not load MangaCopy details', url);
    const html = await res.text();
    const doc = HTMLParser.parse(html);
    const titleNode = doc.querySelector('.comicParticulars-title-right h6');
    const authorNode = doc.querySelector('.comicParticulars-right-txt');
    const summaryNode = doc.querySelector('.intro');
    const dntNode = doc.querySelector('#dnt');
    const slug = new URL(url).pathname.split('/').filter(Boolean).pop();
    if (!slug) throw new Error('Could not identify the MangaCopy comic');
    if (!dntNode || !dntNode.getAttribute('value')) throw new Error('MangaCopy chapter token was not found');

    const endpoint = new URL(`/comicdetail/${slug}/chapters`, BASE_URL).toString();
    const chapterResponse = await fetch(endpoint, {
        headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'Referer': url,
            'Origin': 'https://www.mangacopy.com',
            'dnts': dntNode.getAttribute('value')
        }
    });
    checkResponse(chapterResponse, 'Could not load MangaCopy chapters', endpoint);
    const responseText = await chapterResponse.text();
    if (!responseText.trim()) throw new Error('MangaCopy chapter API returned an empty response');
    const response = JSON.parse(responseText);
    if (response.code !== 200 || typeof response.results !== 'string') {
        throw new Error(response.message || 'Unexpected MangaCopy chapter response');
    }
    const chapterData = JSON.parse(decryptMangaCopyPayload(response.results, AES_KEY));
    const build = chapterData.build || {};
    const comicSlug = build.path_word || slug;
    const list = mapChapters(chapterData, comicSlug);
    if (list.length === 0) {
        throw new Error('MangaCopy returned no chapter data for this comic');
    }
    return {
        title: titleNode ? titleNode.text.trim() : '',
        subtitle: authorNode ? authorNode.text.trim() : '',
        summary: summaryNode ? summaryNode.text.trim() : '',
        list: list
    };
};
