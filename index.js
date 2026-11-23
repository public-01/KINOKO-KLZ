function comicTabs(title, id, region) {
    const regionFilter = region === null ? '' : `region=${region}&`;
    return {
        title: title,
        subtabs: [
            {
                title: '更新',
                id: `${id}-updated`,
                url: `https://www.mangacopy.com/comics?${regionFilter}ordering=-datetime_updated&offset=0&limit=50`
            },
            {
                title: '熱門',
                id: `${id}-popular`,
                url: `https://www.mangacopy.com/comics?${regionFilter}ordering=-popular&offset=0&limit=50`
            }
        ]
    };
}

class IndexController extends Controller {
    load() {
        this.data = {
            tabs: [
                comicTabs('日漫', 'japanese', 0),
                comicTabs('全部', 'all', null),
                comicTabs('韓漫', 'korean', 1),
                comicTabs('美漫', 'american', 2),
                {
                    title: '排行榜',
                    subtabs: [
                        { title: '日榜', id: 'rank-day', url: 'https://www.mangacopy.com/rank?type=male&table=day' },
                        { title: '周榜', id: 'rank-week', url: 'https://www.mangacopy.com/rank?type=male&table=week' },
                        { title: '月榜', id: 'rank-month', url: 'https://www.mangacopy.com/rank?type=male&table=month' },
                        { title: '總榜單', id: 'rank-total', url: 'https://www.mangacopy.com/rank?type=male&table=total' }
                    ]
                }
            ]
        };
    }
}

module.exports = IndexController;
