const https = require('https');
function httpGet(url) {
    return new Promise((res,rej)=>{
        https.get(url,{headers:{'User-Agent':'XLICONBot/1.0'}},(r)=>{
            if(r.statusCode===301||r.statusCode===302){return httpGet(r.headers.location).then(res).catch(rej);}
            let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(d));
        }).on('error',rej);
    });
}
const SPORTS = {
    soccer:  { key:'soccer', label:'⚽ Football/Soccer', league:'eng.1', leagueLabel:'Premier League' },
    nba:     { key:'basketball', label:'🏀 NBA', league:'nba', leagueLabel:'NBA' },
    nfl:     { key:'football', label:'🏈 NFL', league:'nfl', leagueLabel:'NFL' },
    cricket: { key:'cricket', label:'🏏 Cricket', league:'icc.world', leagueLabel:'Cricket' },
};

module.exports = {
    name: 'sports',
    aliases: ['scores', 'soccer', 'football', 'nba', 'livescores', 'livescore'],
    description: 'Get live sports scores and results',
    async execute(sock, m, args) {
        await m.react('⏳');
        const cat = (args[0]||'soccer').toLowerCase();
        const sport = SPORTS[cat] || SPORTS.soccer;
        try {
            const raw = await httpGet(`http://site.api.espn.com/apis/site/v2/sports/${sport.key}/${sport.league}/scoreboard`);
            const data = JSON.parse(raw);
            const events = data.events || [];
            if (!events.length) {
                await m.reply(`⚽ No current ${sport.leagueLabel} events found. Check back during match days!`);
                return await m.react('✅');
            }
            let out = `╭━━━━━━━━━━━━━━━━━━━╮\n┃  ${sport.label.split(' ')[0]} *${sport.leagueLabel.toUpperCase()}*  ┃\n╰━━━━━━━━━━━━━━━━━━━╯\n\n`;
            for (const ev of events.slice(0, 8)) {
                const comp = ev.competitions?.[0];
                if (!comp) continue;
                const home = comp.competitors?.find(c=>c.homeAway==='home');
                const away = comp.competitors?.find(c=>c.homeAway==='away');
                const status = comp.status?.type?.shortDetail || ev.status?.type?.shortDetail || '';
                const live = comp.status?.type?.state === 'in' ? '🔴 LIVE' : comp.status?.type?.state === 'post' ? '✅ FT' : '🕐 Upcoming';
                out += `${live} *${away?.team?.shortDisplayName || '?'}* vs *${home?.team?.shortDisplayName || '?'}*\n`;
                if (comp.status?.type?.state !== 'pre') {
                    out += `   ${away?.score||0} — ${home?.score||0} | ${status}\n\n`;
                } else {
                    out += `   📅 ${status}\n\n`;
                }
            }
            out += `📂 Categories: soccer, nba, nfl, cricket\n💡 _.sports nba_ · _.sports soccer_`;
            await m.reply(out);
            await m.react('✅');
        } catch(e) {
            await m.react('❌');
            await m.reply(`❌ Could not fetch ${sport.leagueLabel} scores. Try again.\n\n💡 Try: _.sports nba_ or _.sports soccer_`);
        }
    }
};
