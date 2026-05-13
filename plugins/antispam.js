const spamTracker = new Map();
const settingsCache = new Map();
const CACHE_TTL = 60000;
const SPAM_MSG_LIMIT = parseInt(process.env.SPAM_MSG_LIMIT || '5', 10);
const SPAM_TIME_WINDOW = parseInt(process.env.SPAM_TIME_WINDOW || '5', 10);
const WARN_LIMIT = parseInt(process.env.WARN_LIMIT || '3', 10);
let _db = null;
async function getDb() {
    if (_db) return _db;
    if (!process.env.MONGO_URI) return null;
    try { const { MongoClient } = require('mongodb'); const c = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 3000 }); await c.connect(); _db = c.db('xlicon_bot'); return _db; }
    catch(e) { return null; }
}
async function isEnabled(groupId) {
    const cached = settingsCache.get(groupId);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL) return cached.antispam;
    const db = await getDb();
    const val = db ? (await db.collection('group_settings').findOne({ groupId }))?.antispam === true : false;
    settingsCache.set(groupId, { antispam: val, cachedAt: Date.now() });
    return val;
}
async function setEnabled(groupId, val) {
    settingsCache.set(groupId, { antispam: val, cachedAt: Date.now() });
    const db = await getDb(); if (!db) return;
    await db.collection('group_settings').updateOne({ groupId }, { $set: { antispam: val, updatedAt: new Date() } }, { upsert: true });
}
async function addWarn(groupId, userId, reason) {
    const db = await getDb(); if (!db) return 1;
    const r = await db.collection('warnings').findOneAndUpdate(
        { groupId, userId },
        { $inc:{count:1}, $push:{reasons:{reason,at:new Date()}}, $set:{updatedAt:new Date()}, $setOnInsert:{createdAt:new Date()} },
        { upsert:true, returnDocument:'after' }
    );
    return r?.value?.count ?? r?.count ?? 1;
}
async function clearWarns(groupId, userId) { const db = await getDb(); if (!db) return; await db.collection('warnings').deleteOne({ groupId, userId }); }
const metaCache = new Map();
async function getGroupMeta(sock, groupId) {
    const cached = metaCache.get(groupId);
    if (cached && Date.now() - cached.cachedAt < 30000) return cached.meta;
    try { const meta = await sock.groupMetadata(groupId); metaCache.set(groupId, { meta, cachedAt: Date.now() }); return meta; }
    catch(_) { return null; }
}
module.exports = {
    name: 'antispam',
    aliases: ['as', 'spamprotect'],
    description: 'Toggle anti-spam protection. Default: OFF.',
    async execute(sock, m, args) {
        if (!m.isGroup) return m.reply('❌ Group only command.');
        if (!m.isAdmin) return m.reply('❌ Only group admins can use this command.');
        if (!m.isBotAdmin) return m.reply('❌ I need to be an admin.');
        const sub = (args[0]||'').toLowerCase();
        if (sub === 'on' || sub === 'enable') { await setEnabled(m.from, true); return m.reply(`🛡️ *Anti-Spam ENABLED!*\n\nLimit: ${SPAM_MSG_LIMIT} msgs / ${SPAM_TIME_WINDOW}s\nWarn limit: ${WARN_LIMIT}\n\nUse _.antispam off_ to disable.`); }
        if (sub === 'off' || sub === 'disable') { await setEnabled(m.from, false); return m.reply('✅ Anti-Spam *disabled*.'); }
        const on = await isEnabled(m.from);
        return m.reply(`🛡️ *Anti-Spam:* ${on?'🟢 ON':'🔴 OFF'}\n\n_.antispam on_ — Enable\n_.antispam off_ — Disable`);
    },
    async onMessage(sock, m) {
        if (!m.isGroup || !m.from || !m.sender) return;
        const on = await isEnabled(m.from);
        if (!on) return;
        const meta = await getGroupMeta(sock, m.from); if (!meta) return;
        const sc = m.sender.replace(/:\d+@/,'@');
        const member = meta.participants.find(p => p.id.replace(/:\d+@/,'@') === sc);
        if (!member || member.admin) return;
        const key = `${m.from}_${sc}`;
        const now = Date.now();
        const win = SPAM_TIME_WINDOW * 1000;
        if (!spamTracker.has(key)) spamTracker.set(key, { ts: [], keys: [] });
        const entry = spamTracker.get(key);
        entry.ts = entry.ts.filter(t => now - t < win);
        entry.keys = entry.keys.slice(-(SPAM_MSG_LIMIT + 5));
        entry.ts.push(now); entry.keys.push(m.key);
        if (entry.ts.length >= SPAM_MSG_LIMIT) {
            const toDelete = [...entry.keys]; entry.ts = []; entry.keys = [];
            for (const k of toDelete) sock.sendMessage(m.from, { delete: k }).catch(() => {});
            const count = await addWarn(m.from, sc, 'Spamming');
            if (count >= WARN_LIMIT) { await sock.groupParticipantsUpdate(m.from, [sc], 'remove').catch(() => {}); await sock.sendMessage(m.from, { text:`⛔ @${sc.split('@')[0]} was *kicked* for spamming! (${WARN_LIMIT}/${WARN_LIMIT} warns)`, mentions:[sc] }); await clearWarns(m.from, sc); }
            else { await sock.sendMessage(m.from, { text:`🚨 *SPAM DETECTED*\n👤 @${sc.split('@')[0]}\n🗑️ ${toDelete.length} messages deleted\n⚠️ Warns: *${count}/${WARN_LIMIT}*`, mentions:[sc] }); }
        }
        if (spamTracker.size > 500) { for (const [k,v] of spamTracker) if (!v.ts.some(t=>now-t<win*2)) spamTracker.delete(k); }
    }
};