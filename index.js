const genres = [
    { title: '全部', id: 'all', genre: '' },
    { title: '動作', id: 'Action', genre: 'Action' },
    { title: '成人', id: 'Adult', genre: 'Adult' },
    { title: '冒險', id: 'Adventure', genre: 'Adventure' },
    { title: '喜劇', id: 'Comedy', genre: 'Comedy' },
    { title: '惡魔', id: 'Demons', genre: 'Demons' },
    { title: '劇情', id: 'Drama', genre: 'Drama' },
    { title: '情色', id: 'Ecchi', genre: 'Ecchi' },
    { title: '奇幻', id: 'Fantasy', genre: 'Fantasy' },
    { title: '性別轉換', id: 'Gender Bender', genre: 'Gender Bender' },
    { title: '後宮', id: 'Harem', genre: 'Harem' },
    { title: '歷史', id: 'Historical', genre: 'Historical' },
    { title: '恐怖', id: 'Horror', genre: 'Horror' },
    { title: '異世界', id: 'Isekai', genre: 'Isekai' },
    { title: '女性向', id: 'Josei', genre: 'Josei' },
    { title: '魔法', id: 'Magic', genre: 'Magic' },
    { title: '成熟向', id: 'Mature', genre: 'Mature' },
    { title: '機甲', id: 'Mecha', genre: 'Mecha' },
    { title: '懸疑', id: 'Mystery', genre: 'Mystery' },
    { title: '心理', id: 'Psychological', genre: 'Psychological' },
    { title: '愛情', id: 'Romance', genre: 'Romance' },
    { title: '校園', id: 'School Life', genre: 'School Life' },
    { title: '科幻', id: 'Sci-fi', genre: 'Sci-fi' },
    { title: '青年向', id: 'Seinen', genre: 'Seinen' },
    { title: '少女向', id: 'Shoujo', genre: 'Shoujo' },
    { title: '少年向', id: 'Shounen', genre: 'Shounen' },
    { title: '少年愛', id: 'Shounen Ai', genre: 'Shounen Ai' },
    { title: '日常', id: 'Slice of Life', genre: 'Slice of Life' },
    { title: '情色向', id: 'Smut', genre: 'Smut' },
    { title: '運動', id: 'Sports', genre: 'Sports' },
    { title: '超能力', id: 'Super Power', genre: 'Super Power' },
    { title: '超自然', id: 'Supernatural', genre: 'Supernatural' },
    { title: '悲劇', id: 'Tragedy', genre: 'Tragedy' },
    { title: '耽美', id: 'Yaoi', genre: 'Yaoi' },
    { title: '百合', id: 'Yuri', genre: 'Yuri' }
];

class IndexController extends Controller {
    load() {
        this.data = { tabs: genres };
    }
}

module.exports = IndexController;
