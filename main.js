const checkResponse = require('./http');
const BASE_URL = 'https://www.mangacopy.com/';
const PAGE_SIZE = 50;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

class MainController extends Controller {
    load(data) {
        this.id = data.id;
        this.url = data.url;
        this.offset = 0;
        this.isRank = this.url.indexOf('/rank?') >= 0;
        this.data = {
            list: [],
            loading: false,
            hasMore: true
        };
        this.reload();
    }

    async fetchPage(url) {
        const res = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });
        checkResponse(res, 'Could not load MangaCopy list', url);
        return await res.text();
    }

    async reload() {
        this.setState(() => { this.data.loading = true; });
        try {
            const text = await this.fetchPage(this.url);
            const items = this.isRank ? this.parseRank(text) : this.parseComicList(text);
            if (items.length === 0) throw new Error('No MangaCopy titles found on the page');
            this.offset = PAGE_SIZE;
            this.setState(() => {
                this.data.list = items;
                this.data.loading = false;
                this.data.hasMore = !this.isRank && items.length >= PAGE_SIZE;
            });
        } catch (e) {
            showToast(`${e}\n${e.stack}`);
            this.setState(() => { this.data.loading = false; });
        }
    }

    makePageUrl(offset) {
        return this.url.replace(/([?&])offset=\d+/, `$1offset=${offset}`);
    }

    async onLoadMore() {
        if (this.isRank || !this.data.hasMore) return;
        this.setState(() => { this.data.loading = true; });
        try {
            const url = this.makePageUrl(this.offset);
            const text = await this.fetchPage(url);
            const items = this.parseComicList(text);
            this.offset += PAGE_SIZE;
            this.setState(() => {
                this.data.list.push(...items);
                this.data.loading = false;
                this.data.hasMore = items.length >= PAGE_SIZE;
            });
        } catch (e) {
            showToast(`${e}\n${e.stack}`);
            this.setState(() => { this.data.loading = false; });
        }
    }

    parseComicList(text) {
        const doc = HTMLParser.parse(text);
        const container = doc.querySelector('.exemptComic-box');
        if (!container) throw new Error('MangaCopy list container was not found');
        const source = container.getAttribute('list') || '';
        const itemPattern = /'path_word':\s*'((?:\\.|[^'\\])*)',\s*'name':\s*'((?:\\.|[^'\\])*)',\s*'cover':\s*'((?:\\.|[^'\\])*)'/g;
        const items = [];
        let match;
        while ((match = itemPattern.exec(source)) !== null) {
            const path = this.decodeValue(match[1]);
            const title = this.decodeValue(match[2]);
            const picture = this.decodeValue(match[3]);
            if (!path || !title || !picture) continue;
            items.push({
                title: title,
                link: new URL(`/comic/${path}`, BASE_URL).toString(),
                picture: new URL(picture, BASE_URL).toString(),
                pictureHeaders: { Referer: BASE_URL },
                subtitle: ''
            });
        }
        return items;
    }

    decodeValue(value) {
        return value.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }

    parseRank(text) {
        const doc = HTMLParser.parse(text);
        const items = [];
        for (const node of doc.querySelectorAll('.ranking-all > li')) {
            const linkNode = node.querySelector('.ranking-all-topThree-txt a[href^="/comic/"]');
            const imageNode = node.querySelector('.ranking-all-topThree-img img');
            if (!linkNode || !imageNode) continue;
            const link = linkNode.getAttribute('href');
            const picture = imageNode.getAttribute('src') || imageNode.getAttribute('data-src');
            const titleNode = linkNode.querySelector('p');
            if (!link || !picture) continue;
            items.push({
                title: titleNode ? titleNode.text.trim() : linkNode.text.trim(),
                link: new URL(link, BASE_URL).toString(),
                picture: new URL(picture, BASE_URL).toString(),
                pictureHeaders: { Referer: BASE_URL }
            });
        }
        return items;
    }

    async onPressed(index) {
        await this.navigateTo('book', { data: this.data.list[index] });
    }

    onRefresh() {
        this.offset = 0;
        this.reload();
    }
}

module.exports = MainController;
