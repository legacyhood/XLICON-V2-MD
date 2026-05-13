/**
 * Anonymous Status Viewer + Cache (hybrid: MongoDB + in-memory fallback)
 * When ON: statuses cached silently — small files to MongoDB, large files in memory.
 * Use .statusdl <number> to retrieve cached statuses on demand.
 */

global.statusCache = global.statusCache || new Map();

const MONGO_SIZE_LIMIT = 15 * 1024 * 1024; // 15MB — safe under MongoDB's 16MB BSON doc limit

async function saveToMongo(senderJid, entries) {
    if (!process.env.MONGO_URI) return false;
    try {
        const { MongoClient } = require('mongodb');
        const c = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        await c.connect();
        await c.db('xlicon_bot').collection('status_cache').replaceOne(
            { _id: senderJid },
            { _id: senderJid, entries, updatedAt: new Date() },
            { upsert: true }
        );
        await c.close();
        return true;
    } catch (e) {
        console.error('[anonview] MongoDB save error:', e.message);
        return false;
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
    description: 'Toggle anonymous status caching (MongoDB + in-memory hybrid)',
    enabled: false,

    async execute(sock, m) {
        if (!isOwner(m)) return m.reply('❌ This command is for the owner only.');

        this.enabled = !this.enabled;
        const state = this.enabled ? '✅ *ON*' : '❌ *OFF*';
        const mongo = process.env.MONGO_URI
            ? '☁️ MongoDB (files ≤15MB) + memory fallback (larger files)'
            : '⚠️ In-memory only (no MONGO_URI set)';

        return m.reply(
`╭━━━━━━━━━━━━━━━━━━━━━━╮
┃  👻 *ANON STATUS VIEW*   ┃
╰━━━━━━━━━━━━━━━━━━━━━━╯

Status: ${state}
Storage: ${mongo}

${this.enabled
? `• Statuses cached silently as contacts post them
• *No seen receipt* ever sent to the poster
• Files ≤15MB → saved to MongoDB (survives restarts)
• Files >15MB → kept in memory until next restart
• Use *.statusdl list* to see who has cached statuses
• Use *.statusdl <number>* to get a specific person's statuses
• Run *.anonview* again to turn OFF`
: `• Status caching stopped
• Already-cached statuses are still saved
• Run *.anonview* again to turn back ON`}`
        );
    },

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
                entry = { type: 'image', buffer, caption: rawMsg.message.imageMessage?.caption || '', pushName, ts };

            } else if (type === 'videoMessage') {
                const buffer = await downloadMediaMessage(rawMsg, 'buffer', {}, sock).catch(() => null);
                if (!buffer) return;
                entry = { type: 'video', buffer, caption: rawMsg.message.videoMessage?.caption || '', pushName, ts };

            } else if (type === 'conversation' || type === 'extendedTextMessage') {
                const text = rawMsg.message?.conversation || rawMsg.message?.extendedTextMessage?.text || '';
                entry = { type: 'text', text, pushName, ts };

            } else if (type === 'audioMessage') {
                const buffer = await downloadMediaMessage(rawMsg, 'buffer', {}, sock).catch(() => null);
                if (!buffer) return;
                entry = { type: 'audio', buffer, pushName, ts };
            }

            if (!entry) return;

            // ── Always store in memory ────────────────────────────────────
            const existing = global.statusCache.get(senderJid) || [];
            existing.push(entry);
            if (existing.length > 20) existing.shift();
            global.statusCache.set(senderJid, existing);

            // ── Persist to MongoDB only if within size limit ──────────────
            const bufSize = entry.buffer ? entry.buffer.length : 0;
            if (bufSize <= MONGO_SIZE_LIMIT) {
                saveToMongo(senderJid, existing).then(saved => {
                    const tag = saved ? '☁️ MongoDB' : '💾 memory only';
                    console.log(`[anonview] Cached status from +${senderJid.split('@')[0]} (${pushName}) → ${tag}`);
                }).catch(() => {});
            } else {
                const sizeMB = (bufSize / 1024 / 1024).toFixed(1);
                console.log(`[anonview] Cached status from +${senderJid.split('@')[0]} (${pushName}) → 💾 memory only (${sizeMB}MB > 15MB limit)`);
            }

            // DO NOT call sock.readMessages() — that sends a seen receipt
        } catch (err) {
            console.error('[AnonView] Cache error:', err.message);
        }
    }
};
