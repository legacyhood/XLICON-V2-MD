const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'steal',
    aliases: ['takesticker', 'getsticker'],
    description: 'Steal a sticker and re-tag it with your own name',

    async execute(sock, m, args) {
        try {
            if (!m.quoted || m.quoted.type !== 'stickerMessage') {
                return m.reply('❌ Please reply to a sticker to steal it.\n\nUsage: _.steal [pack name]_');
            }

            await m.react('⏳');

            const buffer = await downloadMediaMessage(
                { message: m.quoted.message, key: m.quoted.key },
                'buffer', {}, sock
            ).catch(() => null);

            if (!buffer) return m.reply('❌ Failed to download the sticker.');

            const packName = args.join(' ').trim() || m.pushName || 'XLICON V2';
            const authorName = m.pushName || 'XLICON V2';

            const sticker = new Sticker(buffer, {
                pack: packName,
                author: authorName,
                type: StickerTypes.DEFAULT,
                quality: 80,
                categories: ['🤩', '🎉'],
            });

            const stickerBuffer = await sticker.toBuffer();

            await sock.sendMessage(m.from, { sticker: stickerBuffer }, { quoted: m });
            await m.react('✅');
        } catch (err) {
            console.error('[steal] Error:', err.message);
            await m.react('❌');
            await m.reply('❌ Failed to steal sticker. Try again.');
        }
    }
};
