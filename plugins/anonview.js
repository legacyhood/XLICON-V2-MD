/**
 * Anonymous Status Viewer + Cache
 * When ON: incoming statuses are cached silently (no seen receipt ever sent).
 * Use .statusdl <number> to retrieve a specific person's cached statuses.
 */

global.statusCache = global.statusCache || new Map(); // senderJid -> [{type,buffer,caption,ts}]

function isOwner(m) {
    const owners = global.owners || [];
    const senderNum = (m.sender || '').split('@')[0].replace(/:\d+$/, '');
    return owners.some(o => o.split('@')[0].replace(/:\d+$/, '') === senderNum);
}

module.exports = {
    name: 'anonview',
    aliases: ['sv', 'statusview', 'viewstatus'],
    description: 'Toggle anonymous status caching (no seen receipts)',
    enabled: false,

    async execute(sock, m) {
        if (!isOwner(m)) return m.reply('❌ This command is for the owner only.');

        this.enabled = !this.enabled;
        const state = this.enabled ? '✅ *ON*' : '❌ *OFF*';

        return m.reply(
`╭━━━━━━━━━━━━━━━━━━━━━━╮
┃  👻 *ANON STATUS VIEW*   ┃
╰━━━━━━━━━━━━━━━━━━━━━━╯

Status: ${state}

${this.enabled
? `• Statuses are cached silently as they arrive
• *No seen receipt* is ever sent to the poster
• Use *.statusdl <number>* to view cached statuses
  e.g. .statusdl 2348012345678
• Use *.statusdl list* to see who has cached statuses`
: `• Anonymous status caching disabled
• Run *.anonview* again to turn back ON`}`
        );
    },

    // Called from index.js for every status@broadcast event
    async onStatus(sock, rawMsg) {
        if (!this.enabled) return;
        if (!rawMsg.message) return;
        if (rawMsg.key.fromMe) return; // skip our own statuses

        try {
            const { downloadMediaMessage } = require('@whiskeysockets/baileys');
            const sender    = rawMsg.key.participant || rawMsg.key.remoteJid || '';
            const senderJid = sender.split('@')[0].replace(/:\d+$/, '') + '@s.whatsapp.net';
            const pushName  = rawMsg.pushName || sender.split('@')[0];
            const type      = Object.keys(rawMsg.message || {})[0] || '';
            const ts        = Date.now();

            let entry = null;

            if (type === 'imageMessage') {
                const buffer = await downloadMediaMessage(rawMsg, 'buffer', {}, sock).catch(() => null);
                if (!buffer) return;
                const caption = rawMsg.message.imageMessage?.caption || '';
                entry = { type: 'image', buffer, caption, pushName, ts };

            } else if (type === 'videoMessage') {
                const buffer = await downloadMediaMessage(rawMsg, 'buffer', {}, sock).catch(() => null);
                if (!buffer) return;
                const caption = rawMsg.message.videoMessage?.caption || '';
                entry = { type: 'video', buffer, caption, pushName, ts };

            } else if (type === 'conversation' || type === 'extendedTextMessage') {
                const text = rawMsg.message?.conversation || rawMsg.message?.extendedTextMessage?.text || '';
                entry = { type: 'text', text, pushName, ts };

            } else if (type === 'audioMessage') {
                const buffer = await downloadMediaMessage(rawMsg, 'buffer', {}, sock).catch(() => null);
                if (!buffer) return;
                entry = { type: 'audio', buffer, pushName, ts };
            }

            if (!entry) return;

            const existing = global.statusCache.get(senderJid) || [];
            // Keep last 20 statuses per person
            existing.push(entry);
            if (existing.length > 20) existing.shift();
            global.statusCache.set(senderJid, existing);

            console.log(`[anonview] Cached status from +${senderJid.split('@')[0]} (${pushName})`);
            // DO NOT call sock.readMessages() — that sends a seen receipt
        } catch (err) {
            console.error('[AnonView] Cache error:', err.message);
        }
    }
};
