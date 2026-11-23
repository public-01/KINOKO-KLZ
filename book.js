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
                summary: this.data.summary,
                otherName: this.data.otherName
            }
        };
    }

    load(data) {
        this.url = data.link;
        this.cacheKey = `klz9:book:v1:${this.url}`;
        this.data = {
            title: data.title,
            subtitle: data.subtitle || '',
            picture: data.picture,
            pictureHeaders: { Referer: 'https://klz9.com/' },
            summary: null,
            otherName: null,
            status: null,
            genresText: null,
            aiTranslated: false,
            translationWarning: null,
            loading: false,
            editing: false,
            reverse: localStorage['klz9_reverse'] !== 'false',
            list: [],
            last: null
        };
        this.selected = [];
        this.addHistory(this.bookInfo);

        const cached = localStorage[this.cacheKey];
        if (cached) {
            const value = JSON.parse(cached);
            this.applyBookData(value);
            if (!value.time || new Date().getTime() - value.time > 30 * 60 * 1000) {
                this.reload();
            }
        } else {
            this.reload();
        }
        this.data.last = this.getLast();
        FavoritesManager.clearNew(this.url);
    }

    applyBookData(value) {
        this.data.title = value.title || this.data.title;
        this.data.subtitle = value.subtitle || this.data.subtitle;
        this.data.picture = value.picture || this.data.picture;
        this.data.summary = value.summary || null;
        this.data.otherName = value.otherName || null;
        this.data.status = value.status || null;
        this.data.genresText = value.genresText || null;
        this.data.aiTranslated = value.aiTranslated === true;
        this.data.translationWarning = value.translationWarning || null;
        this.data.list = Array.isArray(value.list) ? value.list : [];
        this.data.last = this.getLast();
    }

    async reload() {
        this.setState(() => { this.data.loading = true; });
        try {
            const value = await bookFetch(this.url, true);
            value.time = new Date().getTime();
            localStorage[this.cacheKey] = JSON.stringify(value);
            this.setState(() => {
                this.applyBookData(value);
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
                if (this.data.list.length) {
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
        const key = this.getLastChapterKey();
        if (!key) return;
        let index = -1;
        for (let i = 0; i < this.data.list.length; i++) {
            if (this.matchesLastChapter(this.data.list[i], key)) {
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
        const key = this.getLastChapterKey();
        if (!key) return null;
        for (const item of this.data.list) {
            if (this.matchesLastChapter(item, key)) {
                const title = typeof item.title === 'string' ? item.title :
                    (item.title && typeof item.title.title === 'string' ? item.title.title : '');
                if (!title) return null;
                return title.length > 18 ? `...${title.substr(-16)}` : title;
            }
        }
        return null;
    }

    matchesLastChapter(item, key) {
        return item.link === key ||
            (item.id !== undefined && item.id !== null && `${item.link}:${item.id}` === key);
    }

    getLastChapterKey() {
        const last = this.getLastKey(this.url);
        if (typeof last === 'string') return last;
        if (last && typeof last === 'object') {
            if (typeof last.key === 'string') return last.key;
            if (typeof last.link === 'string') return last.link;
        }
        return null;
    }

    onOrderSelected(value) {
        const reverse = value === true || value === 'true';
        this.setState(() => {
            this.data.reverse = reverse;
            localStorage['klz9_reverse'] = reverse.toString();
        });
    }
}

module.exports = BookController;
