const BASE_URL = 'https://klz9.com/';
const API_URL = `${BASE_URL}api/`;
const PAGE_SIZE = 36;

function listUrl(page, genre, search) {
    let url = `${API_URL}manga/list?page=${page}&limit=${PAGE_SIZE}&sort=Updated&order=desc`;
    if (genre) url += `&genre=${encodeURIComponent(genre)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return url;
}

function getDisplayTitle(item) {
    const isPlaceholder = value =>
        ['undefined', 'null', 'none', 'n/a', 'unknown', '未定義', '不明', '未知']
            .indexOf(value.toLowerCase()) >= 0;
    const aliases = typeof item.other_name === 'string' ?
        item.other_name.split(/,\s+/).map(value => value.trim())
            .filter(value => value && !isPlaceholder(value)) : [];
    const mixedLanguage = /[A-Za-z\u0400-\u04ff\u0600-\u06ff\u0900-\u097f\u0e00-\u0eff\uac00-\ud7af]/;
    const expandName = value => {
        if (typeof value !== 'string' || !value.trim() || isPlaceholder(value.trim())) return [];
        const name = value.trim();
        const parts = name.match(/[\u3000-\u30ff\u3400-\u9fff\uff00-\uffef]+/g) || [];
        return (mixedLanguage.test(name) ? parts : [name])
            .filter(part => part && !isPlaceholder(part));
    };
    const candidates = aliases.reduce((all, alias) => all.concat(expandName(alias)), []);
    const translatedNames = Array.isArray(item.translated_name) ? item.translated_name :
        (typeof item.translated_name === 'string' ? [item.translated_name] : []);
    const translatedCandidates = translatedNames.reduce((all, name) =>
        all.concat(expandName(name)), []);
    const isTranslatedName = value => translatedNames.some(name =>
        typeof name === 'string' && name.trim().toLowerCase() === value.toLowerCase()) ||
        translatedCandidates.some(name => name.toLowerCase() === value.toLowerCase());
    const hasHan = value => /[\u3400-\u9fff]/.test(value);
    const hasKana = value => /[\u3040-\u30ff]/.test(value);
    const countHan = value => (value.match(/[\u3400-\u9fff]/g) || []).length;
    const japanese = candidates.find(value => hasKana(value)) ||
        candidates.find(value => hasHan(value));
    const chinese = candidates.find(value =>
        countHan(value) > 1 && !hasKana(value) && !isTranslatedName(value));

    return chinese ||
        japanese ||
        (typeof item.name === 'string' ? item.name : item.title) || '';
}

function mapManga(item) {
    if (!item || !(item.slug || item.id) || !(item.name || item.title) || !(item.cover || item.thumbnail)) return null;
    const slug = item.slug || item.id;
    const subtitle = [
        item.authors || '',
        item.last_chapter !== undefined && item.last_chapter !== null ? `第 ${item.last_chapter} 話` : '',
        item.last_update ? item.last_update.slice(0, 10) : ''
    ].filter(value => value).join(' · ');
    return {
        title: getDisplayTitle(item),
        link: new URL(`/${slug}.html`, BASE_URL).toString(),
        picture: new URL(item.cover || item.thumbnail, BASE_URL).toString(),
        pictureHeaders: { Referer: BASE_URL },
        subtitle: subtitle
    };
}

function parseList(response) {
    if (!response || !Array.isArray(response.items)) {
        throw new Error('Unexpected KLZ9 manga list response');
    }
    return {
        items: response.items.map(mapManga).filter(item => item !== null),
        totalPages: Number(response.totalPages) || 1
    };
}

module.exports = {
    BASE_URL: BASE_URL,
    PAGE_SIZE: PAGE_SIZE,
    listUrl: listUrl,
    getDisplayTitle: getDisplayTitle,
    parseList: parseList
};
