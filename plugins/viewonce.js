const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'viewonce',
    aliases: ['vo', 'once', 'reveal'],
    description: 'Auto-saves incoming view-once media to owner DM silently',

    // ── Auto-triggered by index.js BEFORE the view-once wrapper is stripped ──
    async onAutoViewOnce(sock, rawMsg) {
        try {
            const msg = rawMsg.message || {};
            const voTypes = ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension'];
            const voKey = voTypes.find(t => msg[t]);
            if (!voKey) return;

            const inner = (msg[voKey] && msg[voKey].message) ? msg[voKey].message : {};
            const type  = Object.keys(inner)[0] || '';
            if (type !== 'imageMessage' && type !== 'videoMessage') return;

            const buffer = await downloadMediaMessage(rawMsg, 'buffer', {}, sock).catch(() => null);
            if (!buffer) return;

            const ownerJid  = (global.owners || [])[0] || sock.user.id;
            const sender    = rawMsg.key.participant || rawMsg.key.remoteJid || '';
            const senderNum = sender.split('@')[0].replace(/:\d+$/, '');
            const caption   = `👁️ *View-Once Auto-Saved*\n👤 From: +${senderNum}`;

            if (type === 'videoMessage') {
                await sock.sendMessage(ownerJid, { video: buffer, caption, mimetype: 'video/mp4' });
            } else {
                await sock.sendMessage(ownerJid, { image: buffer, caption });
            }
        } catch (err) {
            console.error('[autoViewOnce]', err.message);
        }
    },

    // ── Manual command — only useful in your own DM/self-chat ────────────────
    // In a chat with someone else, they will see this command — use the auto
    // feature instead (it saves view-once the moment it arrives, no command needed).
    async execute(sock, m) {
        try {
            const target = m.quoted || null;
            if (!target) return m.react('❌');

            const msg      = target.message || {};
            const voTypes  = ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension'];
            const isWrapped = voTypes.some(t => msg[t]);

            let innerMsg = msg;
            if (isWrapped) {
                for (const w of voTypes) {
                    if (msg[w]?.message) { innerMsg = msg[w].message; break; }
                }
            }

            const type    = Object.keys(innerMsg)[0] || '';
            const isVideo = type === 'videoMessage';
            const isImage = type === 'imageMessage';
            if (!isVideo && !isImage) return m.react('❌');

            await m.react('⏳');

            const buffer = await downloadMediaMessage(
                { message: isWrapped ? target.message : innerMsg, key: target.key },
                'buffer', {}, sock
            ).catch(() => null);

            if (!buffer) return m.react('❌');

            const ownerJid  = (global.owners || [])[0] || sock.user.id;
            const senderNum = (target.sender || m.sender || '').split('@')[0].replace(/:\d+$/, '');
            const caption   = `👁️ *View-Once Revealed*\n👤 From: +${senderNum}`;

            if (isVideo) {
                await sock.sendMessage(ownerJid, { video: buffer, caption, mimetype: 'video/mp4' });
            } else {
                await sock.sendMessage(ownerJid, { image: buffer, caption });
            }

            await m.react('✅');
        } catch (err) {
            console.error('[viewonce cmd]', err.message);
            await m.react('❌');
        }
    }
};
