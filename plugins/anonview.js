/**
 * Anonymous Status Viewer + Cache (MongoDB-backed)
 * When ON: incoming statuses are cached silently in memory AND persisted to MongoDB.
 * Cache survives bot restarts. Use .statusdl <number> to retrieve cached statuses.
 */

global.statusCache = global.statusCache || new Map();

async function saveToMongo(senderJid, entries) {
    if (!process.env.MONGO_URI) return;
    try {
        const { MongoClient } = require('mongodb');
        const c = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        await c.connect();
        // Store entries — convert buffer to Binary so MongoDB handles it correctly
        const toStore = entries.map(e => ({
            ...e,
            buffer: e.buffer ? e.buffer : undefined
        }));
        await c.db('xlicon_bot').collection('status_cache').replaceOne(
            { _id: senderJid },
            { _id: senderJid, entries: toStore, updatedAt: new Date() },
            { upsert: true }
        );
        await c.close();
    } catch (e) {
        console.error('[anonview] MongoDB save error:', e.message);
    }
}

function isOwner(m) {
    const owners = global.owners || [];
    const senderNum = (m.sender || '').split('@')[0].replace(/:\d+$/, '');
    return owners.some(o => o.split('@')[0].replace(/:\d+$/, '') === senderNum);
}

module.exports = {
    name: 'anonview',
    aliases: ['sv', 'statusview', 'viewstatus'],
    description: 'Toggle anonymous status caching (MongoDB-persisted, no seen receipts)',
    enabled: false,

    async execute(sock, m) {
        if (!isOwner(m)) return m.reply('❌ This command is for the owner only.');

        this.enabled = !this.enabled;
        const state  = this.enabled ? '✅ *ON*' : '❌ *OFF*';
        const mongo  = process.env.MONGO_URI ? '☁️ MongoDB — survives restarts' : '⚠️ In-memory only (no MONGO_URI set)';

        return m.reply(
`╭━━━━━━━━━━━━━━━━━━━━━━╮
┃  👻 *ANON STATUS VIEW*   ┃
╰━━━━━━━━━━━━━━━━━━━━━━╯

Status: ${state}
Storage: ${mongo}

${this.enabled
? `• Statuses cached silently as contacts post them
• *No seen receipt* ever sent to the poster
• Use *.statusdl list* to see who has cached statuses
• Use *.statusdl <number>* to view a specific person's statuses
  e.g. .statusdl 2348012345678
• Use *.statusdl clear* to wipe all cached statuses
• Run *.anonview* again to turn OFF`
: `• Status caching stopped
• Already-cached statuses are still saved
• Run *.anonview* again to turn back ON`}`
        );
    },

    // Called from index.js for every status@broadcast event
    async onStatus(sock, rawMsg) {
        if (!this.enabled) return;
        if (!rawMsg.message) return;
        if (rawMsg.key.fromMe) return;

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
                // Skip if > 8MB to stay within MongoDB document limits
                if (buffer.length > 8 * 1024 * 1024) {
                    console.log('[anonview] Skipped oversized image from', senderJid);
                    return;
                }
                entry = { type: 'image', buffer, caption: rawMsg.message.imageMessage?.caption || '', pushName, ts };

            } else if (type === 'videoMessage') {
                const buffer = await downloadMediaMessage(rawMsg, 'buffer', {}, sock).catch(() => null);
                if (!buffer) return;
                if (buffer.length > 8 * 1024 * 1024) {
                    console.log('[anonview] Skipped oversized video from', senderJid);
                    return;
                }
                entry = { type: 'video', buffer, caption: rawMsg.message.videoMessage?.caption || '', pushName, ts };

            } else if (type === 'conversation' || type === 'extendedTextMessage') {
                const text = rawMsg.message?.conversation || rawMsg.message?.extendedTextMessage?.text || '';
                entry = { type: 'text', text, pushName, ts };

            } else if (type === 'audioMessage') {
                const buffer = await downloadMediaMessage(rawMsg, 'buffer', {}, sock).catch(() => null);
                if (!buffer) return;
                if (buffer.length > 8 * 1024 * 1024) return;
                entry = { type: 'audio', buffer, pushName, ts };
            }

            if (!entry) return;

            const existing = global.statusCache.get(senderJid) || [];
            existing.push(entry);
            if (existing.length > 20) existing.shift(); // keep last 20 per person
            global.statusCache.set(senderJid, existing);

            // Persist to MongoDB (non-blocking)
            saveToMongo(senderJid, existing).catch(() => {});
            console.log(`[anonview] Cached + saved status from +${senderJid.split('@')[0]} (${pushName})`);
            // DO NOT call sock.readMessages() — that sends a seen receipt
        } catch (err) {
            console.error('[AnonView] Cache error:', err.message);
        }
    }
};
