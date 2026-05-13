const https = require('https');
function httpGet(url) {
    return new Promise((res,rej)=>{
        https.get(url,{headers:{'User-Agent':'XLICONBot/1.0'}},(r)=>{
            if(r.statusCode===301||r.statusCode===302){return httpGet(r.headers.location).then(res).catch(rej);}
            let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(d));
        }).on('error',rej);
    });
}
module.exports = {
    name: 'wiki',
    aliases: ['wikipedia', 'search', 'define'],
    description: 'Search Wikipedia for any topic',
    async execute(sock, m, args) {
        if (!args.length) return m.reply('❌ Usage: _.wiki Cristiano Ronaldo_');
        await m.react('⏳');
        const query = args.join(' ');
        try {
            const raw = await httpGet(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
            const data = JSON.parse(raw);
            if (data.type === 'disambiguation' || !data.extract) {
                return m.reply(`❌ No clear result for "*${query}*". Try a more specific term.`);
            }
            const extract = data.extract.length > 800 ? data.extract.slice(0, 800) + '...' : data.extract;
            await m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃   📖 *WIKIPEDIA*     ┃
╰━━━━━━━━━━━━━━━━━━━╯

*${data.title}*

${extract}

🔗 ${data.content_urls?.desktop?.page || 'https://wikipedia.org'}
_Source: Wikipedia_`
            );
            await m.react('✅');
        } catch(e) {
            await m.react('❌');
            await m.reply(`❌ Could not find "*${query}*" on Wikipedia.`);
        }
    }
};
