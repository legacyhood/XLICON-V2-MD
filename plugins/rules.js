const { MongoClient } = require('mongodb');
let _db = null;
async function getDb() {
    if (_db) return _db;
    if (!process.env.MONGO_URI) return null;
    try { const c = new MongoClient(process.env.MONGO_URI); await c.connect(); _db = c.db('xlicon_bot'); return _db; }
    catch(e) { return null; }
}
module.exports = {
    name: 'rules',
    aliases: ['setrules', 'grouprules', 'rule'],
    description: 'Set and show group rules',
    async execute(sock, m, args) {
        if (!m.isGroup) return m.reply('❌ Group only command.');
        const db = await getDb();
        const sub = args[0]?.toLowerCase();

        if (sub === 'set') {
            const ruleText = args.slice(1).join(' ').trim();
            if (!ruleText) return m.reply('❌ Usage: _.rules set Rule 1\\nRule 2\\nRule 3_');
            if (db) await db.collection('group_settings').updateOne({ groupId: m.from }, { $set: { rules: ruleText, updatedAt: new Date() } }, { upsert: true });
            return m.reply('✅ Group rules updated!');
        }
        if (sub === 'clear') {
            if (db) await db.collection('group_settings').updateOne({ groupId: m.from }, { $unset: { rules: '' } });
            return m.reply('✅ Rules cleared.');
        }

        const doc = db ? await db.collection('group_settings').findOne({ groupId: m.from }) : null;
        const rulesText = doc?.rules;
        if (!rulesText) return m.reply('❌ No rules set for this group.\n\nAdmin: _.rules set 1. Be respectful\\n2. No spam_');

        const meta = await sock.groupMetadata(m.from).catch(() => null);
        await m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃  📋 *GROUP RULES*   ┃
╰━━━━━━━━━━━━━━━━━━━╯
*${meta?.subject || 'This Group'}*

${rulesText}

_Breaking rules may result in a warning or kick._`
        );
    }
};
