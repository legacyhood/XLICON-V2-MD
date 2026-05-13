/**
 * Anonymous Status Viewer
 * Downloads and forwards statuses to the owner WITHOUT sending a "seen" receipt.
 * The poster will never know you viewed their status.
 */

module.exports = {
    name: 'anonview',
    aliases: ['sv', 'statusview', 'viewstatus'],
    description: 'Toggle anonymous status viewing — statuses forwarded to you silently',
    enabled: false,

    async execute(sock, m) {
        const owners = global.owners || [];
        const senderNum = (m.sender || '').split('@')[0].replace(/:\d+$/, '');
        const isOwner = owners.some(o => {
            const ownerNum = o.split('@')[0].replace(/:\d+$/, '');
            return senderNum === ownerNum;
        });
        if (!isOwner) return m.reply('❌ This command is for the owner only.');

        this.enabled = !this.enabled;
        const status = this.enabled ? '✅ *ON*' : '❌ *OFF*';
        await m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃  👻 *ANON STATUS VIEW* ┃
╰━━━━━━━━━━━━━━━━━━━╯

Status: ${status}

${this.enabled
    ? '• All statuses will be silently forwarded to your DM\n• Posters will NOT see you viewed their status\n• The bot will never send a "seen" receipt'
    : '• Anonymous status viewing disabled'}`
        );
    },

    // Called from index.js for every status@broadcast message
    async onStatus(sock, rawMsg, m) {
        if (!this.enabled) return;
        if (!rawMsg.message) return;
        if (rawMsg.key.fromMe) return;

        const OWNER = (global.owners || [])
            .find(o => o.includes('@s.whatsapp.net')) || '';
        if (!OWNER) return;

        try {
            const sender = rawMsg.key.participant || rawMsg.key.remoteJid;
            const senderNum = sender.split('@')[0];
            const name = rawMsg.pushName || senderNum;
            const header = `╭━━━━━━━━━━━━━━━━━━━╮\n┃  👻 *ANON STATUS VIEW* ┃\n╰━━━━━━━━━━━━━━━━━━━╯\n\n👤 *From:* @${senderNum} (${name})\n🕐 _Viewed anonymously_`;

            const type = Object.keys(rawMsg.message || {})[0] || '';
            const { downloadMediaMessage } = require('@whiskeysockets/baileys');

            if (type === 'imageMessage') {
                const buffer = await downloadMediaMessage(rawMsg, 'buffer', {}, sock).catch(() => null);
                if (!buffer) return;
                const cap = rawMsg.message.imageMessage?.caption || '';
                await sock.sendMessage(OWNER, { image: buffer, caption: `${header}\n\n${cap ? '📝 Caption: ' + cap : ''}`, mentions: [sender] });
            } else if (type === 'videoMessage') {
                const buffer = await downloadMediaMessage(rawMsg, 'buffer', {}, sock).catch(() => null);
                if (!buffer) return;
                const cap = rawMsg.message.videoMessage?.caption || '';
                await sock.sendMessage(OWNER, { video: buffer, caption: `${header}\n\n${cap ? '📝 Caption: ' + cap : ''}`, mentions: [sender] });
            } else if (type === 'conversation' || type === 'extendedTextMessage') {
                const text = rawMsg.message?.conversation || rawMsg.message?.extendedTextMessage?.text || '';
                await sock.sendMessage(OWNER, { text: `${header}\n\n📝 *Status:* ${text}`, mentions: [sender] });
            } else if (type === 'audioMessage') {
                const buffer = await downloadMediaMessage(rawMsg, 'buffer', {}, sock).catch(() => null);
                if (!buffer) return;
                await sock.sendMessage(OWNER, { audio: buffer, mimetype: 'audio/ogg; codecs=opus', ptt: true, caption: header });
            }
        } catch (err) {
            console.error('[AnonView] Error:', err.message);
        }
    }
};
