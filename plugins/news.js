const https = require('https');

function httpGet(url) {
    return new Promise((res, rej) => {
        https.get(url, { headers: { 'User-Agent': 'XLICONBot/1.0' } }, (r) => {
            if (r.statusCode === 301 || r.statusCode === 302) return httpGet(r.headers.location).then(res).catch(rej);
            let d = ''; r.on('data', c => d += c); r.on('end', () => res(d));
        }).on('error', rej);
    });
}

function parseRSS(xml, limit = 5) {
    const items = [];
    const re = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = re.exec(xml)) !== null && items.length < limit) {
        const get = (tag) => {
            const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`);
            const x = r.exec(m[1]);
            return x ? x[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
        };
        // media:thumbnail has url as attribute: <media:thumbnail url="..."/>
        const thumbMatch = /media:thumbnail[^>]+url="([^"]+)"/.exec(m[1]);
        const thumb = thumbMatch ? thumbMatch[1].replace('240/', '480/') : '';
        // link can be tricky — it's sometimes plain text or CDATA
        const linkMatch = /<link>([\s\S]*?)<\/link>/.exec(m[1])
                       || /<link\/>/.exec(m[1]);
        let link = get('link');
        // strip tracking params
        if (link.includes('?')) link = link.split('?')[0];
        items.push({ title: get('title'), desc: get('description'), link, thumb, pubDate: get('pubDate') });
    }
    return items;
}

const FEEDS = {
    world:   { url: 'https://feeds.bbci.co.uk/news/world/rss.xml',           label: '🌍 World News' },
    tech:    { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml',       label: '💻 Tech News' },
    sport:   { url: 'https://feeds.bbci.co.uk/sport/rss.xml?edition=uk',      label: '⚽ Sports News' },
    biz:     { url: 'https://feeds.bbci.co.uk/news/business/rss.xml',         label: '📈 Business News' },
    health:  { url: 'https://feeds.bbci.co.uk/news/health/rss.xml',           label: '🏥 Health News' },
    africa:  { url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml',     label: '🌍 Africa News' },
    us:      { url: 'https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml', label: '🇺🇸 US News' },
    science: { url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', label: '🔬 Science News' },
};

module.exports = {
    name: 'news',
    aliases: ['headlines', 'rss'],
    description: 'Get latest news with images and links from BBC',

    async execute(sock, m, args) {
        await m.react('⏳');
        const cat = (args[0] || 'world').toLowerCase();

        if (cat === 'list' || cat === 'help') {
            return m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃  📰 *NEWS CATEGORIES* ┃
╰━━━━━━━━━━━━━━━━━━━╯

` + Object.entries(FEEDS).map(([k,v]) => `${v.label.split(' ')[0]} .${k === 'world' ? 'news' : 'news ' + k}`).join('\n') + `

Example: .news africa | .news tech | .news sport`);
        }

        const feed = FEEDS[cat] || FEEDS.world;
        try {
            const xml = await httpGet(feed.url);
            const items = parseRSS(xml, 5);
            if (!items.length) throw new Error('No items in feed');

            const now = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });

            // Send first story as image + caption if thumbnail available
            const lead = items[0];
            if (lead.thumb) {
                const caption =
`📰 *${feed.label}* — BBC
🕐 ${now} UTC

*1. ${lead.title}*
${lead.desc ? lead.desc.slice(0, 200) + (lead.desc.length > 200 ? '...' : '') : ''}
🔗 ${lead.link || 'bbc.com/news'}

─────────────────────
` + items.slice(1).map((it, i) =>
    `*${i + 2}.* ${it.title}\n🔗 ${it.link || 'bbc.com/news'}`
).join('\n\n') + `

📂 Categories: ${Object.keys(FEEDS).join(' | ')}
💡 .news africa | .news tech | .news sport`;
                await sock.sendMessage(m.from, { image: { url: lead.thumb }, caption }, { quoted: m.raw });
            } else {
                // No thumbnail — plain text with links
                let out = `╭━━━━━━━━━━━━━━━━━━━╮\n┃  📰 *LATEST NEWS*   ┃\n╰━━━━━━━━━━━━━━━━━━━╯\n\n`;
                out += `*${feed.label}* — BBC\n🕐 ${now} UTC\n\n`;
                items.forEach((it, i) => {
                    out += `*${i + 1}.* ${it.title}\n🔗 ${it.link || ''}\n\n`;
                });
                out += `📂 Categories: ${Object.keys(FEEDS).join(' | ')}\n💡 .news africa | .news tech | .news sport`;
                await m.reply(out);
            }
            await m.react('✅');
        } catch (e) {
            await m.react('❌');
            await m.reply('❌ Could not fetch news: ' + e.message + '\nTry again in a moment.');
        }
    }
};
