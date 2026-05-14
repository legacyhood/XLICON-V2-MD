let mongoClient = null;
let db = null;
async function getDb() {
    if (db) return db;
    if (!process.env.MONGO_URI) return null;
    try { mongoClient = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 }); await mongoClient.connect(); db = mongoClient.db('xlicon_bot'); return db; }
    catch (e) { return null; }
}
module.exports = {
    name: 'clearwarns',
    aliases: ['resetwarn', 'unwarn', 'removewarn'],
    description: 'Clear all warnings for a user',
    async execute(sock, m) {
        if (!m.isGroup) return m.reply('❌ This command only works in groups.');
        if (!m.isAdmin) return m.reply('❌ You need to be a group admin to use this command.');
        if (!m.isBotAdmin) return m.reply('❌ The bot is not a group admin. Please promote the bot first, then try again.');
        let target = null;
        if (m.quoted) target = m.quoted.sender || m.quoted.key?.participant;
        if (!target && m.mentionedJid?.length) target = m.mentionedJid[0];
        if (!target) return m.reply('❌ Reply to or @mention the user whose warns you want to clear.');
        target = target.replace(/:\d+@/, '@');
        if (!target.includes('@')) target += '@s.whatsapp.net';
        const database = await getDb();
        if (!database) return m.reply('❌ Database not connected.');
        await m.react('⏳');
        await database.collection('warnings').deleteOne({ groupId: m.from, userId: target });
        await sock.sendMessage(m.from, { text: `✅ All warnings cleared for @${target.split('@')[0]}.`, mentions: [target] });
        await m.react('✅');
    }
};