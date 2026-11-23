const checkResponse = require('./http');
const catalog = require('./catalog');

class SearchController extends Controller {
    load() {
        let hints = [];
        const saved = localStorage['klz9_search_hints'];
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) hints = parsed;
        }
        this.query = '';
        this.page = 0;
        this.totalPages = 1;
        this.data = {
            list: [],
            focus: false,
            hints: hints,
            text: '',
            loading: false,
            hasMore: false
        };
    }

    onSearchClicked() {
        this.findElement('input').submit();
    }

    onTextChange(text) {
        this.data.text = text;
    }

    async fetchPage(page) {
        const url = catalog.listUrl(page, '', this.query);
        const res = await fetch(url, {
            headers: { Accept: 'application/json' }
        });
        checkResponse(res, 'KLZ9 search failed', url);
        const text = await res.text();
        if (!text.trim()) throw new Error('KLZ9 search returned an empty response');
        return catalog.parseList(JSON.parse(text));
    }

    async onTextSubmit(text) {
        const query = (text || '').trim();
        if (!query) return;
        this.query = query;
        this.page = 0;
        this.setState(() => {
            this.data.text = query;
            this.data.loading = true;
            this.data.focus = false;
            this.data.list = [];
            const index = this.data.hints.indexOf(query);
            if (index >= 0) this.data.hints.splice(index, 1);
            this.data.hints.unshift(query);
            while (this.data.hints.length > 30) this.data.hints.pop();
            localStorage['klz9_search_hints'] = JSON.stringify(this.data.hints);
        });
        try {
            const result = await this.fetchPage(1);
            this.page = 1;
            this.totalPages = result.totalPages;
            this.setState(() => {
                this.data.list = result.items;
                this.data.hasMore = this.page < this.totalPages;
                this.data.loading = false;
            });
        } catch (e) {
            showToast(`${e}\n${e.stack}`);
            this.setState(() => { this.data.loading = false; });
        }
    }

    async onLoadMore() {
        if (!this.query || this.data.loading || this.page >= this.totalPages) return;
        this.setState(() => { this.data.loading = true; });
        try {
            const page = this.page + 1;
            const result = await this.fetchPage(page);
            this.page = page;
            this.setState(() => {
                this.data.list.push(...result.items);
                this.data.hasMore = this.page < this.totalPages;
                this.data.loading = false;
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
        if (hint) {
            this.findElement('input').blur();
            this.onTextSubmit(hint);
        }
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
