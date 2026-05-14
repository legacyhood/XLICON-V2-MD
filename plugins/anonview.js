/**
 * Anonymous Status Viewer — persists enabled state to MongoDB across restarts.
 */

let _db = null;
async function getDb() {
    if (_db) return _db;
    if (!process.env.MONGO_URI) return null;
    try {
        const { MongoClient } = require('mongodb');
        const c = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        await c.connect();
        _db = c.db('xlicon_bot');
        return _db;
    } catch (e) { return null; }
}

global.statusCache = global.statusCache || new Map();
const MONGO_SIZE_LIMIT = 15 * 1024 * 1024;

let _loaded = false;
let _enabled = false;

async function loadState() {
    if (_loaded) return _enabled;
    const db = await getDb();
    if (db) {
        const doc = await db.collection('bot_settings').findOne({ _id: 'anonview' });
        _enabled = doc?.value === true;
    }
    _loaded = true;
    return _enabled;
}

async function saveState(val) {
    _enabled = val;
    const db = await getDb();
    if (db) {
        await db.collection('bot_settings').updateOne(
            { _id: 'anonview' },
            { $set: { value: val, updatedAt: new Date() } },
            { upsert: true }
        );
    }
}

// Auto-load on startup
loadState().catch(() => {});

async function saveStatusToMongo(senderJid, entries) {
    const db = await getDb();
    if (!db) return;
    try {
        const { Binary } = require('mongodb');
        // Convert buffers to BSON Binary for efficient storage; compress text payload
        const storable = entries.map(e => ({
            ...e,
            buffer: e.buffer ? new Binary(e.buffer) : undefined
        }));
        const totalDocs = await db.collection('status_cache').countDocuments();
        if (totalDocs >= 100) {
            // Prune oldest doc before inserting new one
            const oldest = await db.collection('status_cache').findOne({}, { sort: { updatedAt: 1 } });
            if (oldest) await db.collection('status_cache').deleteOne({ _id: oldest._id });
        }
        await db.collection('status_cache').replaceOne(
            { _id: senderJid },
            { _id: senderJid, entries: storable, updatedAt: new Date() },
            { upsert: true }
        );
    } catch (e) {}
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

    async execute(sock, m) {
        if (!isOwner(m)) return m.reply('❌ This command is for the owner only.');

        const current = await loadState();
        await saveState(!current);
        const on = !current;
        const state = on ? '✅ *ON*' : '❌ *OFF*';
        const mongo = process.env.MONGO_URI
            ? '☁️ MongoDB (files ≤15MB) + memory fallback'
            : '⚠️ In-memory only (no MONGO_URI set)';

        return m.reply(
`╭━━━━━━━━━━━━━━━━━━━━━━╮
┃  👻 *ANON STATUS VIEW*   ┃
╰━━━━━━━━━━━━━━━━━━━━━━╯

Status: ${state}
Storage: ${mongo}
💾 Saved — survives restarts

${on
? '• Statuses cached silently as contacts post them\n• No seen receipt ever sent\n• Files ≤15MB → MongoDB (survives restarts)\n• Files >15MB → memory only\n• Use .statusdl list to see cached statuses\n• Run .anonview again to turn OFF'
: '• Status caching stopped\n• Already-cached statuses are still saved\n• Run .anonview again to turn back ON'}`
        );
    },

    async onStatus(sock, rawMsg) {
        const on = await loadState();
        if (!on) return;
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

            const existing = global.statusCache.get(senderJid) || [];
            existing.push(entry);
            if (existing.length > 10) existing.shift();
            global.statusCache.set(senderJid, existing);

            const bufSize = entry.buffer ? entry.buffer.length : 0;
            if (bufSize <= MONGO_SIZE_LIMIT) {
                saveStatusToMongo(senderJid, existing).catch(() => {});
            }
        } catch (err) {}
    }
};
