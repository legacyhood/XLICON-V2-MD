const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'viewonce',
    aliases: ['vo', 'once', 'reveal'],
    description: 'Reveal a view-once photo or video — sent privately to your DM only',

    async execute(sock, m) {
        try {
            // Find the view-once message (either quoted or the trigger message)
            let target = m.quoted || null;

            const isViewOnce = (msg) => {
                if (!msg?.message) return false;
                const msgTypes = Object.keys(msg.message);
                return msgTypes.some(t =>
                    t === 'viewOnceMessage' ||
                    t === 'viewOnceMessageV2' ||
                    t === 'viewOnceMessageV2Extension'
                );
            };

            if (!isViewOnce(target)) {
                return m.reply('❌ Please reply to a view-once photo or video.');
            }

            await m.react('⏳');

            // Unwrap the nested message
            const unwrap = (msg) => {
                for (const w of ['viewOnceMessage','viewOnceMessageV2','viewOnceMessageV2Extension']) {
                    if (msg[w]?.message) return msg[w].message;
                }
                return msg;
            };

            const inner = unwrap(target.message);
            const type = Object.keys(inner)[0];
            const isVideo = type === 'videoMessage';
            const isImage = type === 'imageMessage';

            if (!isVideo && !isImage) {
                return m.reply('❌ Only view-once photos and videos are supported.');
            }

            const buffer = await downloadMediaMessage(
                { message: target.message, key: target.key },
                'buffer', {}, sock
            ).catch(() => null);

            if (!buffer) return m.reply('❌ Failed to download the media.');

            // Send PRIVATELY to owner's self-chat — original sender never knows
            const ownerJid = sock.user.id;
            const caption = `👁️ *View-Once Revealed*\n📍 From: ${m.isGroup ? m.from : 'DM'}\n👤 Sender: @${(target.sender || m.sender || '').split('@')[0]}`;

            if (isVideo) {
                await sock.sendMessage(ownerJid, {
                    video: buffer,
                    caption,
                    mimetype: 'video/mp4'
                });
            } else {
                await sock.sendMessage(ownerJid, {
                    image: buffer,
                    caption
                });
            }

            await m.react('✅');
            // Note: command message is deleted by index.js automatically
        } catch (err) {
            console.error('[viewonce] Error:', err.message);
            await m.react('❌');
        }
    }
};
