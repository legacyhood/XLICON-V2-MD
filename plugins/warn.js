let mongoClient = null;
let db = null;
const getDb = () => global.getMongoDb();
const WARN_LIMIT = parseInt(process.env.WARN_LIMIT || '3', 10);
async function getWarns(groupId, userId) {
    const database = await getDb();
    if (!database) return { count: 0, reasons: [] };
    return (await database.collection('warnings').findOne({ groupId, userId })) || { count: 0, reasons: [] };
}
async function addWarn(groupId, userId, reason) {
    const database = await getDb();
    if (!database) return null;
    const result = await database.collection('warnings').findOneAndUpdate(
        { groupId, userId },
        { $inc: { count: 1 }, $push: { reasons: { reason: reason || 'No reason given', at: new Date() } }, $set: { updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true, returnDocument: 'after' }
    );
    return result.value || result;
}
async function clearWarns(groupId, userId) {
    const database = await getDb();
    if (!database) return false;
    await database.collection('warnings').deleteOne({ groupId, userId });
    return true;
}
module.exports = {
    name: 'warn',
    aliases: ['warning'],
    description: 'Warn a group member. Auto-kicks after limit (default: 3 warns)',
    async execute(sock, m, args) {
        if (!m.isGroup) return m.reply('❌ This command only works in groups.');
        if (!m.isAdmin) return m.reply('❌ You need to be a group admin to use this command.');
        const meta = await sock.groupMetadata(m.from).catch(() => null);
        if (!meta) return m.reply('❌ Could not fetch group info.');
        if (!m.isBotAdmin) return m.reply('❌ The bot is not a group admin. Please promote the bot first, then try again.');
        let target = null;
        if (m.quoted) target = m.quoted.sender || m.quoted.key?.participant;
        if (!target && m.mentionedJid?.length) target = m.mentionedJid[0];
        if (!target) return m.reply('❌ Reply to or @mention the user you want to warn.');
        target = target.replace(/:\d+@/, '@');
        if (!target.includes('@')) target += '@s.whatsapp.net';
        const targetMember = meta.participants.find(p => p.id.replace(/:\d+@/, '@') === target);
        if (!targetMember) return m.reply('❌ That user is not in this group.');
        if (targetMember.admin) return m.reply('❌ Cannot warn an admin.');
        const reason = args.filter(a => !a.includes('@')).join(' ').trim() || 'No reason given';
        await m.react('⏳');
        const doc = await addWarn(m.from, target, reason);
        const count = doc?.count ?? (await getWarns(m.from, target)).count;
        const remaining = WARN_LIMIT - count;
        if (count >= WARN_LIMIT) {
            await sock.groupParticipantsUpdate(m.from, [target], 'remove').catch(() => {});
            await sock.sendMessage(m.from, { text: `⛔ @${target.split('@')[0]} has been *auto-kicked*!\n\n📋 Reached the warn limit (${WARN_LIMIT}/${WARN_LIMIT})\n📌 Last reason: _${reason}_`, mentions: [target] });
            await clearWarns(m.from, target);
        } else {
            await sock.sendMessage(m.from, { text: `⚠️ *WARNING* ⚠️\n\n👤 @${target.split('@')[0]}\n📌 Reason: _${reason}_\n\n🔢 Warns: *${count}/${WARN_LIMIT}*\n${remaining > 0 ? `⚠️ ${remaining} more warn${remaining === 1 ? '' : 's'} before auto-kick.` : ''}`, mentions: [target] });
        }
        await m.react('✅');
    }
};