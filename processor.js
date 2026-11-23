const checkResponse = require('./http');
const { decryptMangaCopyPayload } = require('./aes');
const bookFetch = require('./book_fetch');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const AES_KEY = '0p0zzpvv.nmn.oop';
const BASE_URL = 'https://www.mangacopy.com/';

class MangaCopyProcessor extends Processor {
    get key() {
        return this.data.link;
    }

    async load(state) {
        try {
            const url = this.data.link;
            const res = await fetch(url, {
                headers: {
                    'User-Agent': USER_AGENT,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Referer': BASE_URL
                }
            });
            checkResponse(res, 'Could not load MangaCopy chapter', url);
            const html = await res.text();
            const doc = HTMLParser.parse(html);
            const images = [];
            for (const node of doc.querySelectorAll('.comicContent-list img')) {
                const imageUrl = node.getAttribute('data-src') || node.getAttribute('src');
                if (imageUrl && imageUrl.indexOf('/static/websitefree/jpg/loading') < 0) {
                    images.push(imageUrl);
                }
            }

            if (images.length === 0) {
                const scripts = doc.querySelectorAll('script:not([src])');
                let encrypted = '';
                let key = AES_KEY;
                for (const script of scripts) {
                    const source = script.text || '';
                    const keyMatch = source.match(/var\s+contentKey\s*=\s*['"]([^'"]*)['"]/);
                    const cctMatch = source.match(/var\s+cct\s*=\s*['"]([^'"]*)['"]/);
                    if (keyMatch && keyMatch[1]) encrypted = keyMatch[1];
                    if (cctMatch && cctMatch[1]) key = cctMatch[1];
                }
                if (!encrypted) throw new Error('MangaCopy did not provide chapter image data');
                const payload = JSON.parse(decryptMangaCopyPayload(encrypted, key));
                const records = Array.isArray(payload) ? payload : payload.results;
                if (!Array.isArray(records)) throw new Error('Unexpected MangaCopy image response');
                for (const item of records) {
                    if (item && item.url) images.push(item.url);
                }
            }

            if (images.length === 0) throw new Error('No MangaCopy chapter images were found');
            this.setData(images.map(image => ({
                url: new URL(image, url).toString(),
                headers: { Referer: BASE_URL }
            })));
            this.save(true, state);
        } catch (e) {
            console.log(`MangaCopy download failed: ${e}\n${e.stack}`);
            showToast(`MangaCopy download failed: ${e}`);
        } finally {
            this.loading = false;
        }
    }

    unload() { }

    async checkNew() {
        const data = await bookFetch(this.data.link);
        const chapters = data.list;
        const latest = chapters[chapters.length - 1];
        if (!latest) return null;
        return { title: latest.title, key: latest.link };
    }
}

module.exports = MangaCopyProcessor;
