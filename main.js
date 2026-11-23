const checkResponse = require('./http');
const catalog = require('./catalog');

class MainController extends Controller {
    load(data) {
        this.id = data.id;
        this.genre = data.genre;
        this.page = 0;
        this.totalPages = 1;
        this.data = {
            list: [],
            loading: false,
            hasMore: true
        };
        this.reload();
    }

    async fetchPage(page) {
        const url = catalog.listUrl(page, this.genre, '');
        const res = await fetch(url, {
            headers: { Accept: 'application/json' }
        });
        checkResponse(res, 'Could not load KLZ9 manga list', url);
        const text = await res.text();
        if (!text.trim()) throw new Error('KLZ9 returned an empty manga list');
        return catalog.parseList(JSON.parse(text));
    }

    async reload() {
        this.setState(() => { this.data.loading = true; });
        try {
            const result = await this.fetchPage(1);
            if (result.items.length === 0) throw new Error('No KLZ9 titles found');
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
        if (this.data.loading || this.page >= this.totalPages) return;
        this.setState(() => { this.data.loading = true; });
        try {
            const page = this.page + 1;
            const result = await this.fetchPage(page);
            this.page = page;
            this.totalPages = result.totalPages;
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

    onRefresh() {
        this.page = 0;
        this.totalPages = 1;
        this.reload();
    }
}

module.exports = MainController;
