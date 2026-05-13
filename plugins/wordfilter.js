const { MongoClient } = require('mongodb');
let _db = null;
async function getDb() {
    if (_db) return _db;
    if (!process.env.MONGO_URI) return null;
    try { const c = new MongoClient(process.env.MONGO_URI); await c.connect(); _db = c.db('xlicon_bot'); return _db; }
    catch(e) { return null; }
}
async function addWarn(groupId, userId, reason) {
    const db = await getDb(); if(!db) return 1;
    const r = await db.collection('warnings').findOneAndUpdate(
        { groupId, userId },
        { $inc:{count:1}, $push:{reasons:{reason,at:new Date()}}, $set:{updatedAt:new Date()}, $setOnInsert:{createdAt:new Date()} },
        { upsert:true, returnDocument:'after' }
    );
    return r?.value?.count ?? r?.count ?? 1;
}
const WARN_LIMIT = parseInt(process.env.WARN_LIMIT || '3', 10);

module.exports = {
    name: 'filter',
    aliases: ['wordfilter', 'badword', 'addfilter', 'removefilter'],
    description: 'Block specific words/phrases in the group',

    async execute(sock, m, args) {
        if (!m.isGroup) return m.reply('❌ Group only command.');
        const db = await getDb();
        const sub = args[0]?.toLowerCase();
        const word = args.slice(1).join(' ').toLowerCase().trim();

        if (sub === 'add' && word) {
            if (!db) return m.reply('❌ Database not connected.');
            await db.collection('group_settings').updateOne({ groupId: m.from }, { $addToSet: { filteredWords: word }, $set:{updatedAt:new Date()} }, { upsert:true });
            return m.reply(`✅ "*${word}*" added to word filter. Messages containing it will be deleted.`);
        }
        if (sub === 'remove' && word) {
            if (!db) return m.reply('❌ Database not connected.');
            await db.collection('group_settings').updateOne({ groupId: m.from }, { $pull: { filteredWords: word } });
            return m.reply(`✅ "*${word}*" removed from filter.`);
        }
        if (sub === 'list') {
            if (!db) return m.reply('❌ Database not connected.');
            const doc = await db.collection('group_settings').findOne({ groupId: m.from });
            const words = doc?.filteredWords || [];
            return m.reply(words.length ? `🚫 *Filtered words:*\n${words.map((w,i)=>`${i+1}. ${w}`).join('\n')}` : '✅ No words are currently filtered.');
        }
        if (sub === 'clear') {
            if (db) await db.collection('group_settings').updateOne({ groupId: m.from }, { $set:{filteredWords:[]} });
            return m.reply('✅ Word filter cleared.');
        }
        return m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃  🚫 *WORD FILTER*   ┃
╰━━━━━━━━━━━━━━━━━━━╯

_.filter add badword_ — Block a word
_.filter remove badword_ — Unblock
_.filter list_ — Show blocked words
_.filter clear_ — Clear all filters`
        );
    },

    async onMessage(sock, m) {
        if (!m.isGroup || !m.from || !m.body) return;
        const db = await getDb(); if(!db) return;
        const doc = await db.collection('group_settings').findOne({ groupId: m.from });
        const words = doc?.filteredWords || [];
        if (!words.length) return;
        const lower = m.body.toLowerCase();
        const hit = words.find(w => lower.includes(w));
        if (!hit) return;

        // Skip admins
        let meta; try { meta = await sock.groupMetadata(m.from); } catch(_){return;}
        const s = m.sender.replace(/:\d+@/,'@');
        if (meta.participants.find(p=>p.id.replace(/:\d+@/,'@')===s)?.admin) return;

        await sock.sendMessage(m.from, { delete: m.key }).catch(()=>{});
        const count = await addWarn(m.from, s, `Used filtered word: "${hit}"`);
        if (count >= WARN_LIMIT) {
            await sock.groupParticipantsUpdate(m.from, [s], 'remove').catch(()=>{});
            await sock.sendMessage(m.from, { text:`⛔ @${s.split('@')[0]} was *kicked* for repeated use of filtered words!\n⚠️ Warns: ${WARN_LIMIT}/${WARN_LIMIT}`, mentions:[s] });
            await db.collection('warnings').deleteOne({ groupId: m.from, userId: s });
        } else {
            await sock.sendMessage(m.from, { text:`🚫 *FILTERED WORD*\n\n👤 @${s.split('@')[0]}\n📌 Watch your language!\n⚠️ Warns: *${count}/${WARN_LIMIT}*`, mentions:[s] });
        }
    }
};
