const https = require('https');
function download(url) {
    return new Promise((res,rej)=>{
        https.get(url,{headers:{'User-Agent':'XLICONBot/1.0'}},(r)=>{
            if(r.statusCode===301||r.statusCode===302)return download(r.headers.location).then(res).catch(rej);
            const chunks=[];
            r.on('data',c=>chunks.push(c));
            r.on('end',()=>res(Buffer.concat(chunks)));
        }).on('error',rej);
    });
}
module.exports = {
    name: 'qr',
    aliases: ['qrcode', 'makeqr', 'generateqr'],
    description: 'Generate a QR code for any text or link',
    async execute(sock, m, args) {
        const text = args.join(' ').trim() || (m.quoted?.body);
        if (!text) return m.reply('❌ Usage: _.qr https://example.com_\n_.qr Hello World_');
        await m.react('⏳');
        try {
            const url = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&ecc=H&data=${encodeURIComponent(text)}`;
            const buf = await download(url);
            await sock.sendMessage(m.from, {
                image: buf,
                caption: `╭━━━━━━━━━━━━━━━━━━━╮\n┃   📱 *QR CODE*       ┃\n╰━━━━━━━━━━━━━━━━━━━╯\n\n📝 *Content:* ${text.slice(0,100)}${text.length>100?'...':''}\n\n_Scan with any QR reader_`
            }, { quoted: m });
            await m.react('✅');
        } catch(e) {
            await m.react('❌');
            await m.reply('❌ Failed to generate QR code. Try again.');
        }
    }
};
