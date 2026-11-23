const BASE_URL = 'https://klz9.com/';
const API_URL = `${BASE_URL}api/`;
const PAGE_SIZE = 36;

function listUrl(page, genre, search) {
    let url = `${API_URL}manga/list?page=${page}&limit=${PAGE_SIZE}&sort=Updated&order=desc`;
    if (genre) url += `&genre=${encodeURIComponent(genre)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return url;
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
        title: item.name || item.title,
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
    parseList: parseList
};
