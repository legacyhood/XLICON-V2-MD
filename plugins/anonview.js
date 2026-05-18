/**
 * Anonymous Status Viewer — caches statuses silently without sending read receipts.
 *
 * STORAGE POLICY (prevents MongoDB filling up):
 *   - Text statuses  → MongoDB (tiny, survives restarts)
 *   - Media statuses → in-memory ONLY (large buffers, cleared on restart)
 *
 * Commands:
 *   .anonview  — toggle on/off
 */

const getDb = () => global.getMongoDb();

global.statusCache = global.statusCache || new Map();

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
        const setOp = { $set: { value: val, updatedAt: new Date() } };
        await db.collection('bot_settings').updateOne({ _id: 'anonview' }, setOp, { upsert: true });
    }
}

// Auto-load on startup
loadState().catch(() => {});

function isOwner(m) {
    const owners = global.owners || [];
    const senderNum = (m.sender || '').split('@')[0].replace(/:\d+$/, '');
    return owners.some(o => o.split('@')[0].replace(/:\d+$/, '') === senderNum);
}

module.exports = {
    name: 'anonview',
    aliases: ['sv', 'statusview', 'viewstatus'],
    description: 'Toggle anonymous status caching',

    async execute(sock, m) {
        if (!isOwner(m)) return m.reply('\u274c This command is for the owner only.');

        const current = await loadState();
        await saveState(!current);
        const on = !current;

        return m.reply(
            '\ud83d\udc7b *Anon Status View*\n\n' +
            'Status: ' + (on ? '\u2705 ON' : '\u274c OFF') + '\n' +
            '\ud83d\udcbe Saved \u2014 survives restarts\n\n' +
            (on
                ? '\u2022 Statuses cached silently as contacts post them\n\u2022 No seen receipt ever sent\n\u2022 Text statuses saved to MongoDB\n\u2022 Media (images/video) kept in memory only\n\u2022 Use .statusdl list to see cached statuses\n\u2022 Run .anonview again to turn OFF'
                : '\u2022 Status caching stopped\n\u2022 Run .anonview again to turn back ON')
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
            let entry       = null;

            if (type === 'imageMessage') {
                const buffer = await downloadMediaMessage(rawMsg, 'buffer', {}, sock).catch(() => null);
                if (!buffer) return;
                // Media: in-memory ONLY — no MongoDB write
                entry = { type: 'image', buffer, caption: rawMsg.message.imageMessage?.caption || '', pushName, ts, mongoSaved: false };
            } else if (type === 'videoMessage') {
                const buffer = await downloadMediaMessage(rawMsg, 'buffer', {}, sock).catch(() => null);
                if (!buffer) return;
                // Media: in-memory ONLY
                entry = { type: 'video', buffer, caption: rawMsg.message.videoMessage?.caption || '', pushName, ts, mongoSaved: false };
            } else if (type === 'audioMessage') {
                const buffer = await downloadMediaMessage(rawMsg, 'buffer', {}, sock).catch(() => null);
                if (!buffer) return;
                // Media: in-memory ONLY
                entry = { type: 'audio', buffer, pushName, ts, mongoSaved: false };
            } else if (type === 'conversation' || type === 'extendedTextMessage') {
                const text = rawMsg.message?.conversation || rawMsg.message?.extendedTextMessage?.text || '';
                if (!text) return;
                // Text only: save to MongoDB (tiny size)
                entry = { type: 'text', text, pushName, ts, mongoSaved: true };
                const db = await getDb();
                if (db) {
                    try {
                        const setOp = { $set: { pushName, lastText: text, updatedAt: new Date() }, $push: { texts: { $each: [{ text, ts, pushName }], $slice: -20 } } };
                        await db.collection('status_cache').updateOne({ _id: senderJid }, setOp, { upsert: true });
                    } catch (e) {}
                }
            }

            if (!entry) return;

            const existing = global.statusCache.get(senderJid) || [];
            existing.push(entry);
            // Keep last 10 per person in memory
            if (existing.length > 10) existing.shift();
            global.statusCache.set(senderJid, existing);

        } catch (err) {
            // Silently ignore errors — never crash the main process
        }
    }
};
