const https = require('https');
function httpGet(url) {
    return new Promise((res,rej)=>{
        https.get(url,{headers:{'User-Agent':'XLICONBot/1.0'}},(r)=>{
            let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(d));
        }).on('error',rej);
    });
}
module.exports = {
    name: 'currency',
    aliases: ['convert', 'exchange', 'rate', 'forex'],
    description: 'Convert between currencies. _.currency 100 USD GHS_',
    async execute(sock, m, args) {
        if (args.length < 3) return m.reply('❌ Usage: _.currency 100 USD GHS_\n_.currency 50 EUR NGN_');
        const [amtStr, from, to] = args;
        const amount = parseFloat(amtStr);
        if (isNaN(amount)) return m.reply('❌ Invalid amount.');
        const f = from.toUpperCase(), t = to.toUpperCase();
        await m.react('⏳');
        try {
            const raw = await httpGet(`https://api.exchangerate.host/convert?from=${f}&to=${t}&amount=${amount}`);
            const data = JSON.parse(raw);
            if (!data.success || !data.result) throw new Error('API error');
            const result = data.result.toFixed(4);
            const rate = data.info?.rate?.toFixed(6) || '?';
            await m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃  💱 *CURRENCY*      ┃
╰━━━━━━━━━━━━━━━━━━━╯

💵 *${amount.toLocaleString()} ${f}*

  ↕️ Exchange Rate

💰 *${result} ${t}*

📊 1 ${f} = ${rate} ${t}
📅 ${new Date().toLocaleDateString('en-GB')}

_Source: exchangerate.host_`
            );
            await m.react('✅');
        } catch(e) {
            await m.react('❌');
            await m.reply(`❌ Could not convert ${f} to ${t}. Check the currency codes and try again.`);
        }
    }
};
