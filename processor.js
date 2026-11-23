const bookFetch = require('./book_fetch');
const checkResponse = require('./http');

const BASE_URL = 'https://klz9.com/';

class Klz9Processor extends Processor {
    get key() {
        return `${this.data.link}:${this.data.id}`;
    }

    async load(state) {
        this.loading = true;
        try {
            const chapter = this.data.data || this.data;
            const chapterId = chapter.id || this.data.id;
            if (!chapterId) throw new Error('KLZ9 chapter ID is missing');
            const url = `${BASE_URL}api/chapter/${encodeURIComponent(chapterId)}`;
            const res = await fetch(url, { headers: { Accept: 'application/json' } });
            checkResponse(res, 'Could not load KLZ9 chapter', url);
            const text = await res.text();
            if (!text.trim()) throw new Error('KLZ9 returned an empty chapter');
            const chapterData = JSON.parse(text);
            if (typeof chapterData.content !== 'string') {
                throw new Error('KLZ9 chapter has no image list');
            }
            const images = chapterData.content.split(/\r?\n/).map(value => value.trim()).filter(Boolean);
            if (images.length === 0) throw new Error('KLZ9 chapter has no images');
            this.setData(images.map(image => ({
                url: new URL(image, BASE_URL).toString(),
                headers: { Referer: BASE_URL }
            })));
            this.save(true, state);
        } catch (e) {
            console.log(`KLZ9 chapter load failed: ${e}\n${e.stack}`);
            showToast(`${e}`);
        } finally {
            this.loading = false;
        }
    }

    unload() { }

    async checkNew() {
        const data = await bookFetch(this.data.link, false);
        const item = data.list[data.list.length - 1];
        if (!item) return null;
        return { title: item.title, key: item.link };
    }
}

module.exports = Klz9Processor;
