const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

module.exports = {
    name: 'sticker',
    aliases: ['s', 'take', 'stkr', 'makesticker'],
    description: 'Convert an image or video to a WhatsApp sticker',
    async execute(sock, m, args) {
        try {
            const target = m.quoted || m;
            const msgType = target.type;
            if (!['imageMessage','videoMessage'].includes(msgType) && !target.isMedia) {
                return m.reply('❌ Reply to an *image* or *video* to convert it to a sticker.\n\n_.sticker_ or _.sticker Pack Name_');
            }
            await m.react('⏳');
            const buffer = await downloadMediaMessage(
                { message: target.message, key: target.key },
                'buffer', {}, sock
            ).catch(()=>null);
            if (!buffer) return m.reply('❌ Failed to download the media.');
            const packName = args.join(' ').trim() || 'XLICON V2';
            const authorName = m.pushName || 'XLICON V2';
            const sticker = new Sticker(buffer, {
                pack: packName, author: authorName,
                type: msgType === 'videoMessage' ? StickerTypes.ANIMATED : StickerTypes.DEFAULT,
                quality: 85, categories: ['🤩','🎉'],
            });
            const stickerBuffer = await sticker.toBuffer();
            await sock.sendMessage(m.from, { sticker: stickerBuffer }, { quoted: m });
            await m.react('✅');
        } catch(e) {
            console.error('[sticker] Error:', e.message);
            await m.react('❌');
            await m.reply('❌ Failed to create sticker. Make sure the image/video is not too large.');
        }
    }
};
