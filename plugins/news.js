const https = require('https');
function httpGet(url) {
    return new Promise((res,rej)=>{
        https.get(url,{headers:{'User-Agent':'XLICONBot/1.0'}},(r)=>{
            if(r.statusCode===301||r.statusCode===302){return httpGet(r.headers.location).then(res).catch(rej);}
            let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(d));
        }).on('error',rej);
    });
}
function parseRSS(xml, limit=8) {
    const items = [];
    const re = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while((m=re.exec(xml))!==null && items.length<limit){
        const get=(tag)=>{const r=new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);const x=r.exec(m[1]);return x?x[1].replace(/<!\[CDATA\[|\]\]>/g,'').trim():''};
        items.push({ title:get('title'), link:get('link'), pubDate:get('pubDate') });
    }
    return items;
}
const FEEDS = {
    world:   { url:'https://feeds.bbci.co.uk/news/world/rss.xml', label:'🌍 World News (BBC)' },
    tech:    { url:'https://feeds.bbci.co.uk/news/technology/rss.xml', label:'💻 Tech News (BBC)' },
    sport:   { url:'https://feeds.bbci.co.uk/sport/rss.xml?edition=uk', label:'⚽ Sports News (BBC)' },
    biz:     { url:'https://feeds.bbci.co.uk/news/business/rss.xml', label:'📈 Business News (BBC)' },
    health:  { url:'https://feeds.bbci.co.uk/news/health/rss.xml', label:'🏥 Health News (BBC)' },
    africa:  { url:'https://feeds.bbci.co.uk/news/world/africa/rss.xml', label:'🌍 Africa News (BBC)' },
};

module.exports = {
    name: 'news',
    aliases: ['headlines', 'rss'],
    description: 'Get latest news headlines from BBC',
    async execute(sock, m, args) {
        await m.react('⏳');
        const cat = (args[0]||'world').toLowerCase();
        const feed = FEEDS[cat] || FEEDS.world;
        try {
            const xml = await httpGet(feed.url);
            const items = parseRSS(xml, 8);
            if (!items.length) throw new Error('No items');
            let out = `╭━━━━━━━━━━━━━━━━━━━╮\n┃  📰 *LATEST NEWS*   ┃\n╰━━━━━━━━━━━━━━━━━━━╯\n\n*${feed.label}*\n\n`;
            items.forEach((it,i)=>{ out += `*${i+1}.* ${it.title}\n`; });
            out += `\n📂 Categories: ${Object.keys(FEEDS).join(', ')}\n💡 _.news tech_ · _.news sport_ · _.news africa_`;
            await m.reply(out);
            await m.react('✅');
        } catch(e) {
            await m.react('❌');
            await m.reply('❌ Could not fetch news. Try again later.');
        }
    }
};
