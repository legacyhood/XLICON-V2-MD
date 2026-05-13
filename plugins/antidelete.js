/**
 * Anti-Delete Plugin
 * Saves all messages to MongoDB and forwards deleted ones to the owner.
 */
const { MongoClient } = require('mongodb');

let _db = null;
async function getDb() {
    if (_db) return _db;
    if (!process.env.MONGO_URI) return null;
    try {
        const client = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        await client.connect();
        _db = client.db('xlicon_bot');
        return _db;
    } catch (e) {
        console.error('[AntiDelete] DB connect error:', e.message);
        return null;
    }
}

const OWNER = '233533763772@s.whatsapp.net';

module.exports = {
    name: 'antidelete',
    aliases: ['ad', 'nodelete'],
    description: 'Toggle anti-delete — saves and reveals deleted messages',
    enabled: false,

    async execute(sock, m) {
        const owners = (global.owners || [OWNER]);
        const isOwner = owners.some(o => m.sender.includes(o.split('@')[0]));
        if (!isOwner) return m.reply('❌ This command is for the owner only.');

        this.enabled = !this.enabled;
        const status = this.enabled ? '✅ *ON*' : '❌ *OFF*';
        await m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃   🗑️ *ANTI-DELETE*   ┃
╰━━━━━━━━━━━━━━━━━━━╯

Status: ${status}

${this.enabled
    ? '• Deleted messages will be saved and forwarded to you\n• Works in both DMs and groups'
    : '• Anti-delete is now disabled'}`
        );
    },

    // Save every message to MongoDB for recovery
    async onMessage(sock, m) {
        if (!this.enabled) return;
        if (!m.id || !m.message) return;
        if (m.from === 'status@broadcast') return;

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
        } catch (e) {
            console.error('[AntiDelete] Save error:', e.message);
        }
    },

    // Called from index.js when messages.delete fires
    async onDelete(sock, deletedKeys) {
        if (!this.enabled) return;
        const db = await getDb();
        if (!db) return;

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

                await sock.sendMessage(OWNER, { text });
            } catch (e) {
                console.error('[AntiDelete] Forward error:', e.message);
            }
        }
    }
};
