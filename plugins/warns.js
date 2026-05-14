let mongoClient = null;
let db = null;

const getDb = () => global.getMongoDb();

const WARN_LIMIT = parseInt(process.env.WARN_LIMIT || '3', 10);

module.exports = {
    name: 'warns',
    aliases: ['warnlist', 'checkwarn'],
    description: 'Check how many warnings a user has',

    async execute(sock, m) {
        if (!m.isGroup) return m.reply('❌ This command only works in groups.');

        let target = null;
        if (m.quoted) target = m.quoted.sender || m.quoted.key?.participant;
        if (!target && m.mentionedJid?.length) target = m.mentionedJid[0];
        if (!target) target = m.sender;
        target = target.replace(/:\d+@/, '@');
        if (!target.includes('@')) target += '@s.whatsapp.net';

        const database = await getDb();
        if (!database) return m.reply('❌ Database not connected.');

        const doc = await database.collection('warnings').findOne({ groupId: m.from, userId: target });
        const count = doc?.count || 0;
        const reasons = doc?.reasons || [];

        const reasonList = reasons.length
            ? reasons.slice(-5).map((r, i) => `  ${i + 1}. _${r.reason}_`).join('\n')
            : '  _No warns recorded_';

        await m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃   ⚠️ *WARN INFO*    ┃
╰━━━━━━━━━━━━━━━━━━━╯

👤 @${target.split('@')[0]}
🔢 Warnings: *${count}/${WARN_LIMIT}*

📋 *Reasons (last 5):*
${reasonList}`
        );
    }
};
