/**
 * Anonymous Read Plugin — persists state to MongoDB across restarts.
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
        const doc = await db.collection('bot_settings').findOne({ _id: 'anonread' });
        _enabled = doc?.value === true;
    }
    _loaded = true;
    global.ANON_READ = _enabled;
    return _enabled;
}

async function saveState(val) {
    _enabled = val;
    global.ANON_READ = val;
    const db = await getDb();
    if (db) {
        await db.collection('bot_settings').updateOne(
            { _id: 'anonread' },
            { $set: { value: val, updatedAt: new Date() } },
            { upsert: true }
        );
    }
}

// Auto-load on startup so global.ANON_READ is correct immediately
loadState().catch(() => {});

function isOwner(m) {
    const owners = global.owners || [];
    const senderNum = (m.sender || '').split('@')[0].replace(/:\d+$/, '');
    return owners.some(o => o.split('@')[0].replace(/:\d+$/, '') === senderNum);
}

module.exports = {
    name: 'anonread',
    aliases: ['ghostmode', 'ghost', 'readanon'],
    description: 'Toggle anonymous read — prevents blue ticks from being sent',

    async execute(sock, m) {
        if (!isOwner(m)) return m.reply('❌ This command is for the owner only.');

        const current = await loadState();
        await saveState(!current);
        const on = !current;
        const state = on ? '✅ *ON*' : '❌ *OFF*';

        return m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃   👻 *GHOST MODE*    ┃
╰━━━━━━━━━━━━━━━━━━━╯

Status: ${state}
💾 Saved — survives restarts

${on
? '• Bot will NOT send blue ticks to anyone\n• Senders only see grey double ticks\n• Bot still processes and replies normally\n• Run .anonread again to turn OFF'
: '• Ghost mode disabled\n• Normal read receipts resumed\n• Run .anonread again to turn back ON'}`
        );
    }
};
