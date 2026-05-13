const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'toimg',
    aliases: ['stickertoimg', 'stoi', 'unpack'],
    description: 'Convert a sticker to an image',

    async execute(sock, m) {
        try {
            if (!m.quoted || m.quoted.type !== 'stickerMessage') {
                return m.reply('❌ Please reply to a sticker to convert it to an image.');
            }

            await m.react('⏳');

            const buffer = await downloadMediaMessage(
                { message: m.quoted.message, key: m.quoted.key },
                'buffer', {}, sock
            ).catch(() => null);

            if (!buffer) return m.reply('❌ Failed to download the sticker.');

            await sock.sendMessage(m.from, {
                image: buffer,
                mimetype: 'image/webp',
                caption: '✅ Sticker converted to image!'
            }, { quoted: m });

            await m.react('✅');
        } catch (err) {
            console.error('[toimg] Error:', err.message);
            await m.react('❌');
            await m.reply('❌ Failed to convert sticker. Try again.');
        }
    }
};
