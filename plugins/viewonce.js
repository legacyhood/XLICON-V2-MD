const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'viewonce',
    aliases: ['vo', 'once', 'reveal'],
    description: 'Reveal a view-once photo or video — sent privately to your DM only',

    async execute(sock, m) {
        try {
            const target = m.quoted || null;
            if (!target) {
                return m.reply('❌ Please reply to a view-once photo or video.');
            }

            // Detect view-once: wrapped format OR unwrapped imageMessage/videoMessage
            const msg = target.message || {};
            const msgTypes = Object.keys(msg);

            const isViewOnce = msgTypes.some(t =>
                t === 'viewOnceMessage' ||
                t === 'viewOnceMessageV2' ||
                t === 'viewOnceMessageV2Extension'
            );

            // Unwrap if wrapped
            let innerMsg = msg;
            if (isViewOnce) {
                for (const w of ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension']) {
                    if (msg[w]?.message) { innerMsg = msg[w].message; break; }
                }
            }

            const type = Object.keys(innerMsg)[0] || '';
            const isVideo = type === 'videoMessage';
            const isImage = type === 'imageMessage';

            if (!isVideo && !isImage) {
                return m.reply('❌ Please reply to a view-once photo or video.');
            }

            await m.react('⏳');

            const buffer = await downloadMediaMessage(
                { message: isViewOnce ? target.message : innerMsg, key: target.key },
                'buffer', {}, sock
            ).catch(() => null);

            if (!buffer) return m.reply('❌ Failed to download the media. It may have expired.');

            const ownerJid = sock.user.id;
            const caption = `👁️ *View-Once Revealed*\n📍 From: ${m.isGroup ? m.from : 'DM'}\n👤 Sender: @${(target.sender || m.sender || '').split('@')[0]}`;

            if (isVideo) {
                await sock.sendMessage(ownerJid, { video: buffer, caption, mimetype: 'video/mp4' });
            } else {
                await sock.sendMessage(ownerJid, { image: buffer, caption });
            }

            await m.react('✅');
        } catch (err) {
            console.error('[viewonce] Error:', err.message);
            await m.react('❌');
        }
    }
};
