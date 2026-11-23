const bookFetch = require('./book_fetch');

class BookController extends Controller {
    get bookInfo() {
        return {
            key: this.url,
            title: this.data.title,
            subtitle: this.data.subtitle,
            picture: this.data.picture,
            page: 'book',
            data: {
                link: this.url,
                title: this.data.title,
                subtitle: this.data.subtitle,
                picture: this.data.picture,
                summary: this.data.summary
            }
        };
    }

    load(data) {
        this.url = data.link;
        this.cacheKey = `mangacopy:book:v2:${this.url}`;
        this.data = {
            title: data.title,
            subtitle: data.subtitle || '',
            summary: data.summary || '',
            picture: data.picture,
            pictureHeaders: { Referer: this.url },
            loading: false,
            editing: false,
            reverse: localStorage['mangacopy_reverse'] !== 'false',
            list: [],
            last: null
        };
        this.selected = [];
        this.addHistory(this.bookInfo);

        const cached = this.readCachedBook();
        if (cached) {
            if (Array.isArray(cached.list)) {
                this.data.title = cached.title || this.data.title;
                this.data.subtitle = cached.subtitle || this.data.subtitle;
                this.data.summary = cached.summary || this.data.summary;
                this.data.list = cached.list;
            }
            if (!cached.time || new Date().getTime() - cached.time > 30 * 60 * 1000) {
                this.reload();
            }
        } else {
            this.reload();
        }
        this.data.last = this.getLast();
        FavoritesManager.clearNew(this.url);
    }

    readCachedBook() {
        let cached = localStorage[this.cacheKey];
        if (cached) return JSON.parse(cached);

        cached = localStorage[`book:${this.url}`];
        if (!cached) return null;
        const value = JSON.parse(cached);
        const list = [];
        const seen = Object.create(null);
        for (const group of value.groups || []) {
            const categories = Array.isArray(group.categories) ? group.categories : [];
            let allCategory;
            for (const category of categories) {
                if (category.name === '全部') {
                    allCategory = category;
                    break;
                }
            }
            if (!allCategory && categories.length) allCategory = categories[0];
            for (const item of (allCategory && Array.isArray(allCategory.list) ? allCategory.list : [])) {
                if (!item.link || seen[item.link]) continue;
                seen[item.link] = true;
                const chapter = { title: item.title, link: item.link };
                if (item.subtitle) chapter.subtitle = item.subtitle;
                list.push(chapter);
            }
        }
        if (list.length) value.list = list;
        localStorage[this.cacheKey] = JSON.stringify(value);
        return value;
    }

    async reload() {
        this.setState(() => { this.data.loading = true; });
        try {
            const value = await bookFetch(this.url);
            value.time = new Date().getTime();
            localStorage[this.cacheKey] = JSON.stringify(value);
            this.setState(() => {
                this.data.title = value.title || this.data.title;
                this.data.subtitle = value.subtitle || this.data.subtitle;
                this.data.summary = value.summary || this.data.summary;
                this.data.list = value.list;
                this.data.last = this.getLast();
                this.data.loading = false;
            });
        } catch (e) {
            showToast(`${e}\n${e.stack}`);
            this.setState(() => { this.data.loading = false; });
        }
    }

    onRefresh() {
        this.reload();
    }

    onSourcePressed() {
        this.openBrowser(this.url);
    }

    onFavoritePressed() {
        this.setState(() => {
            if (this.isFavarite()) {
                FavoritesManager.remove(this.url);
            } else {
                let last;
                if (this.data.list.length > 0) {
                    const item = this.data.list[this.data.list.length - 1];
                    last = { title: item.title, key: item.link };
                }
                this.addFavorite(this.bookInfo, last);
            }
        });
    }

    onDownloadPressed() {
        this.setState(() => { this.data.editing = true; });
    }

    onClearPressed() {
        this.selected = [];
        this.setState(() => { this.data.editing = false; });
    }

    onCheckPressed() {
        const downloads = this.selected.map(index => {
            const item = this.data.list[index];
            return {
                key: item.link,
                title: this.data.title,
                link: this.url,
                picture: this.data.picture,
                subtitle: this.data.subtitle,
                data: item
            };
        });
        this.addDownload(downloads);
        this.selected = [];
        this.setState(() => { this.data.editing = false; });
    }

    async onPressed(index) {
        if (this.data.editing) {
            this.setState(() => {
                const selectedIndex = this.selected.indexOf(index);
                if (selectedIndex >= 0) this.selected.splice(selectedIndex, 1);
                else this.selected.push(index);
            });
            return;
        }
        await this.openBook({ key: this.url, list: this.data.list, index: index });
        this.setState(() => { this.data.last = this.getLast(); });
    }

    async onLastPressed() {
        const key = this.getLastKey(this.url);
        if (!key) return;
        let index = -1;
        for (let i = 0; i < this.data.list.length; i++) {
            if (this.data.list[i].link === key) {
                index = i;
                break;
            }
        }
        if (index < 0) return;
        await this.openBook({ key: this.url, list: this.data.list, index: index });
        this.setState(() => { this.data.last = this.getLast(); });
    }

    isSelected(index) {
        return this.selected.indexOf(index) >= 0;
    }

    isDownloaded(index) {
        return DownloadManager.exist(this.data.list[index].link);
    }

    isFavarite() {
        return FavoritesManager.exist(this.url);
    }

    getLast() {
        const key = this.getLastKey(this.url);
        if (!key) return null;
        for (const item of this.data.list) {
            if (item.link === key) {
                return item.title.length > 18 ? `...${item.title.substr(-16)}` : item.title;
            }
        }
        return null;
    }

    onOrderSelected(value) {
        const reverse = value === true || value === 'true';
        this.setState(() => {
            this.data.reverse = reverse;
            localStorage['mangacopy_reverse'] = reverse.toString();
        });
    }
}

module.exports = BookController;
