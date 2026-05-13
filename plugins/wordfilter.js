const { MongoClient } = require('mongodb');
const WARN_LIMIT = parseInt(process.env.WARN_LIMIT || '3', 10);
const filterCache = new Map(); // groupId → { words: [], cachedAt }
const CACHE_TTL = 60000;
let _db = null;
async function getDb() {
    if (_db) return _db;
    if (!process.env.MONGO_URI) return null;
    try {
        const c = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 3000 });
        await c.connect(); _db = c.db('xlicon_bot'); return _db;
    } catch(e) { return null; }
}
async function getFilteredWords(groupId) {
    const c = filterCache.get(groupId);
    if (c && Date.now()-c.cachedAt < CACHE_TTL) return c.words;
    const db = await getDb();
    const words = db ? ((await db.collection('group_settings').findOne({ groupId }))?.filteredWords || []) : [];
    filterCache.set(groupId, { words, cachedAt: Date.now() });
    return words;
}
function invalidateCache(groupId) { filterCache.delete(groupId); }
async function addWarn(groupId, userId, reason) {
    const db = await getDb(); if (!db) return 1;
    const r = await db.collection('warnings').findOneAndUpdate(
        { groupId, userId },
        { $inc:{count:1}, $push:{reasons:{reason,at:new Date()}}, $set:{updatedAt:new Date()}, $setOnInsert:{createdAt:new Date()} },
        { upsert:true, returnDocument:'after' }
    );
    return r?.value?.count ?? r?.count ?? 1;
}
const metaCache = new Map();
async function getGroupMeta(sock, gid) {
    const c = metaCache.get(gid);
    if (c && Date.now()-c.t < 30000) return c.m;
    try { const m = await sock.groupMetadata(gid); metaCache.set(gid,{m,t:Date.now()}); return m; } catch(_){return null;}
}
module.exports = {
    name: 'filter',
    aliases: ['wordfilter', 'badword', 'addfilter', 'removefilter'],
    description: 'Block specific words in the group',
    async execute(sock, m, args) {
        if (!m.isGroup) return m.reply('❌ Group only command.');
        const db = await getDb();
        const sub = args[0]?.toLowerCase();
        const word = args.slice(1).join(' ').toLowerCase().trim();
        if (sub === 'add' && word) {
            if (!db) return m.reply('❌ DB not connected.');
            await db.collection('group_settings').updateOne({ groupId: m.from }, { $addToSet:{ filteredWords: word }, $set:{updatedAt:new Date()} }, { upsert:true });
            invalidateCache(m.from);
            return m.reply(`✅ "*${word}*" added to filter.`);
        }
        if (sub === 'remove' && word) {
            if (!db) return m.reply('❌ DB not connected.');
            await db.collection('group_settings').updateOne({ groupId: m.from }, { $pull:{ filteredWords: word } });
            invalidateCache(m.from);
            return m.reply(`✅ "*${word}*" removed from filter.`);
        }
        if (sub === 'list') {
            const words = await getFilteredWords(m.from);
            return m.reply(words.length ? `🚫 *Filtered words:*\n${words.map((w,i)=>`${i+1}. ${w}`).join('\n')}` : '✅ No words filtered yet.');
        }
        if (sub === 'clear') {
            if (db) await db.collection('group_settings').updateOne({ groupId: m.from }, { $set:{filteredWords:[]} });
            invalidateCache(m.from);
            return m.reply('✅ Filter cleared.');
        }
        return m.reply(`_.filter add <word>_ — Block\n_.filter remove <word>_ — Unblock\n_.filter list_ — Show all\n_.filter clear_ — Clear all`);
    },
    async onMessage(sock, m) {
        if (!m.isGroup || !m.from || !m.body) return;
        const words = await getFilteredWords(m.from);
        if (!words.length) return;
        const lower = m.body.toLowerCase();
        const hit = words.find(w => lower.includes(w));
        if (!hit) return;
        const meta = await getGroupMeta(sock, m.from); if (!meta) return;
        const sc = m.sender.replace(/:\d+@/,'@');
        if (meta.participants.find(p=>p.id.replace(/:\d+@/,'@')===sc)?.admin) return;
        sock.sendMessage(m.from, { delete: m.key }).catch(() => {});
        const count = await addWarn(m.from, sc, `Used filtered word: "${hit}"`);
        if (count >= WARN_LIMIT) {
            await sock.groupParticipantsUpdate(m.from, [sc], 'remove').catch(() => {});
            await sock.sendMessage(m.from, { text:`⛔ @${sc.split('@')[0]} kicked for using filtered words! (${WARN_LIMIT}/${WARN_LIMIT})`, mentions:[sc] });
            const db = await getDb(); if (db) await db.collection('warnings').deleteOne({ groupId: m.from, userId: sc });
        } else {
            await sock.sendMessage(m.from, { text:`🚫 *FILTERED WORD*\n👤 @${sc.split('@')[0]}\n⚠️ Warns: *${count}/${WARN_LIMIT}*`, mentions:[sc] });
        }
    }
};
