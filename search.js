const checkResponse = require('./http');
const BASE_URL = 'https://www.mangacopy.com/';
const PAGE_SIZE = 12;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

class SearchController extends Controller {
    load(data) {
        let hints = [];
        const saved = localStorage['mangacopy_search_hints'];
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) hints = parsed;
        }
        this.offset = 0;
        this.total = 0;
        this.data = {
            list: [],
            focus: false,
            hints: hints,
            text: data && data.query ? data.query : '',
            loading: false,
            hasMore: false
        };
        if (this.data.text) this.onTextSubmit(this.data.text);
    }

    onSearchClicked() {
        this.findElement('input').submit();
    }

    onTextChange(text) {
        this.data.text = text;
    }

    async fetchResults(offset) {
        const url = `${BASE_URL}api/kb/web/searchcl/comics?offset=${offset}&platform=2&limit=${PAGE_SIZE}&q=${encodeURIComponent(this.query)}&q_type=`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Referer': `${BASE_URL}search?q=${encodeURIComponent(this.query)}`
            }
        });
        checkResponse(res, 'MangaCopy search failed', url);
        const text = await res.text();
        if (!text.trim()) throw new Error('MangaCopy search returned an empty response');
        const data = JSON.parse(text);
        if (data.code !== 200 || !data.results || !Array.isArray(data.results.list)) {
            throw new Error(data.message || 'Unexpected MangaCopy search response');
        }
        this.total = Number(data.results.total) || 0;
        return data.results.list.map(item => {
            if (!item || !item.path_word || !item.name || !item.cover) return null;
            const author = Array.isArray(item.author) ? item.author.map(value => value.name).filter(Boolean).join(', ') : '';
            return {
                title: item.name,
                link: new URL(`/comic/${item.path_word}`, BASE_URL).toString(),
                picture: new URL(item.cover, BASE_URL).toString(),
                pictureHeaders: { Referer: BASE_URL },
                subtitle: author
            };
        }).filter(item => item !== null);
    }

    async onTextSubmit(text) {
        text = (text || '').trim();
        if (!text) return;
        this.query = text;
        this.setState(() => {
            this.data.text = text;
            this.data.loading = true;
            this.data.focus = false;
            const index = this.data.hints.indexOf(text);
            if (index >= 0) this.data.hints.splice(index, 1);
            this.data.hints.unshift(text);
            while (this.data.hints.length > 30) this.data.hints.pop();
            localStorage['mangacopy_search_hints'] = JSON.stringify(this.data.hints);
        });
        try {
            const items = await this.fetchResults(0);
            this.offset = items.length;
            this.setState(() => {
                this.data.list = items;
                this.data.loading = false;
                this.data.hasMore = this.offset < this.total;
            });
        } catch (e) {
            showToast(`${e}\n${e.stack}`);
            this.setState(() => { this.data.loading = false; });
        }
    }

    async onLoadMore() {
        if (!this.query || !this.data.hasMore) return;
        this.setState(() => { this.data.loading = true; });
        try {
            const items = await this.fetchResults(this.offset);
            this.offset += items.length;
            this.setState(() => {
                this.data.list.push(...items);
                this.data.loading = false;
                this.data.hasMore = this.offset < this.total;
            });
        } catch (e) {
            showToast(`${e}\n${e.stack}`);
            this.setState(() => { this.data.loading = false; });
        }
    }

    async onPressed(index) {
        await this.navigateTo('book', { data: this.data.list[index] });
    }

    onHintPressed(index) {
        const hint = this.data.hints[index];
        if (!hint) return;
        this.findElement('input').blur();
        this.onTextSubmit(hint);
    }

    onTextFocus() {
        this.setState(() => { this.data.focus = true; });
    }

    onTextBlur() {
        this.setState(() => { this.data.focus = false; });
    }

    onRefresh() {
        if (this.query) this.onTextSubmit(this.query);
    }
}

module.exports = SearchController;
