const https = require('https');
function httpGet(url) {
    return new Promise((res,rej)=>{
        https.get(url,{headers:{'User-Agent':'XLICONBot/1.0'}},(r)=>{
            let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(d));
        }).on('error',rej);
    });
}
module.exports = {
    name: 'dict',
    aliases: ['dictionary', 'meaning', 'define', 'word'],
    description: 'Get the meaning, phonetics and examples of any English word',
    async execute(sock, m, args) {
        if (!args.length) return m.reply('❌ Usage: _.dict ephemeral_');
        await m.react('⏳');
        const word = args[0].toLowerCase().trim();
        try {
            const raw = await httpGet(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
            const data = JSON.parse(raw);
            if (!Array.isArray(data) || data[0]?.title === 'No Definitions Found') {
                return m.reply(`❌ No definition found for "*${word}*".`);
            }
            const entry = data[0];
            const phonetic = entry.phonetic || entry.phonetics?.[0]?.text || '';
            let out = `╭━━━━━━━━━━━━━━━━━━━╮\n┃   📚 *DICTIONARY*    ┃\n╰━━━━━━━━━━━━━━━━━━━╯\n\n📝 *${entry.word}* ${phonetic}\n`;
            for (const meaning of entry.meanings.slice(0,3)) {
                out += `\n🔹 *${meaning.partOfSpeech}*\n`;
                for (const def of meaning.definitions.slice(0,2)) {
                    out += `  • ${def.definition}\n`;
                    if (def.example) out += `    _"${def.example}"_\n`;
                }
                if (meaning.synonyms?.length) out += `  🔄 Synonyms: ${meaning.synonyms.slice(0,4).join(', ')}\n`;
            }
            out += `\n_Source: Free Dictionary API_`;
            await m.reply(out);
            await m.react('✅');
        } catch(e) {
            await m.react('❌');
            await m.reply(`❌ Could not find meaning for "*${word}*".`);
        }
    }
};
