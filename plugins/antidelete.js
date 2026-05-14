/**
 * Anti-Delete Plugin — persists enabled state to MongoDB across restarts.
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

let _loaded = false;
let _enabled = false;

async function loadState() {
    if (_loaded) return _enabled;
    const db = await getDb();
    if (db) {
        const doc = await db.collection('bot_settings').findOne({ _id: 'antidelete' });
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
            { _id: 'antidelete' },
            { $set: { value: val, updatedAt: new Date() } },
            { upsert: true }
        );
    }
}

// Auto-load on startup
loadState().catch(() => {});

function isOwner(m) {
    const owners = global.owners || [];
    return owners.some(o => (m.sender || '').includes(o.split('@')[0]));
}

module.exports = {
    name: 'antidelete',
    aliases: ['ad', 'nodelete'],
    description: 'Toggle anti-delete — saves and reveals deleted messages',

    async execute(sock, m) {
        if (!isOwner(m)) return m.reply('❌ This command is for the owner only.');

        const current = await loadState();
        await saveState(!current);
        const on = !current;
        const status = on ? '✅ *ON*' : '❌ *OFF*';

        await m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃   🗑️ *ANTI-DELETE*   ┃
╰━━━━━━━━━━━━━━━━━━━╯

Status: ${status}
💾 Saved — survives restarts

${on
    ? '• Deleted messages will be saved and forwarded to you\n• Works in both DMs and groups'
    : '• Anti-delete is now disabled'}`
        );
    },

    async onMessage(sock, m) {
        const on = await loadState();
        if (!on) return;
        if (!m.id || !m.message) return;
        if (m.from === 'status@broadcast') return;
        if (m.key?.fromMe) return; // don't save bot's own messages

        const db = await getDb();
        if (!db) return;

        try {
            await db.collection('messages').replaceOne(
                { _id: m.id },
                {
                    _id: m.id,
                    from: m.from,
                    sender: m.sender,
                    pushName: m.pushName,
                    body: m.body || '',
                    type: m.type || 'unknown',
                    isGroup: m.isGroup,
                    timestamp: Date.now(),
                    isMedia: m.isMedia,
                    mediaType: m.mediaType || null
                },
                { upsert: true }
            );
        } catch (e) {}
    },

    async onDelete(sock, deletedKeys) {
        const on = await loadState();
        if (!on) return;
        const db = await getDb();
        if (!db) return;

        const owners = global.owners || [];
        let ownerJid = owners[0] || '';
        // Normalize: ensure JID has the correct domain suffix
        if (ownerJid && !ownerJid.includes('@')) ownerJid += '@s.whatsapp.net';

        for (const key of deletedKeys) {
            if (!key.id) continue;
            try {
                const saved = await db.collection('messages').findOne({ _id: key.id });
                if (!saved) continue;

                const name = saved.pushName || '+' + (saved.sender?.split('@')[0] || '?');
                const chatLabel = saved.isGroup
                    ? `📢 Group: ${saved.from?.split('@')[0]}`
                    : `💬 DM with: ${name}`;

                let text = `╭━━━━━━━━━━━━━━━━━━━╮\n┃   🗑️ *DELETED MESSAGE*  ┃\n╰━━━━━━━━━━━━━━━━━━━╯\n\n👤 *From:* ${name}\n${chatLabel}\n`;

                if (saved.body) {
                    text += `\n📝 *Message:*\n${saved.body}`;
                } else if (saved.isMedia) {
                    text += `\n📎 *Type:* ${saved.mediaType} _(media not recoverable)_`;
                } else {
                    text += `\n📎 *Type:* ${saved.type}`;
                }

                if (ownerJid) await sock.sendMessage(ownerJid, { text });
            } catch (e) {}
        }
    }
};
