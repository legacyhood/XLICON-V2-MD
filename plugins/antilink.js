const LINK_REGEX = /(?:https?:\/\/|www\.|wa\.me\/|t\.me\/|chat\.whatsapp\.com\/|bit\.ly\/|tinyurl\.com\/|youtu\.be\/|m\.me\/)[\w\-._~:/?#[\]@!$&'()*+,;=%]+/gi;
const WARN_LIMIT = parseInt(process.env.WARN_LIMIT || '3', 10);
const settingsCache = new Map();
const CACHE_TTL = 60000;
const getDb = () => global.getMongoDb();
async function isEnabled(groupId) {
    const c = settingsCache.get(groupId);
    if (c && Date.now()-c.cachedAt < CACHE_TTL) return c.antilink;
    const db = await getDb();
    const val = db ? (await db.collection('group_settings').findOne({ groupId }))?.antilink === true : false;
    settingsCache.set(groupId, { antilink: val, cachedAt: Date.now() });
    return val;
}
async function setEnabled(groupId, val) {
    settingsCache.set(groupId, { antilink: val, cachedAt: Date.now() });
    const db = await getDb(); if (!db) return;
    await db.collection('group_settings').updateOne({ groupId }, { $set:{ antilink: val, updatedAt: new Date() } }, { upsert: true });
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
const metaCache = new Map();
async function getGroupMeta(sock, gid) {
    const c = metaCache.get(gid);
    if (c && Date.now()-c.t < 30000) return c.m;
    try { const m = await sock.groupMetadata(gid); metaCache.set(gid,{m,t:Date.now()}); return m; } catch(_){return null;}
}
module.exports = {
    name: 'antilink',
    aliases: ['al', 'linkprotect', 'nolink'],
    description: 'Delete links from non-admins and warn them. Default: OFF.',
    async execute(sock, m, args) {
        if (!m.isGroup) return m.reply('❌ Group only command.');
        if (!m.isAdmin) return m.reply('❌ Only group admins can use this command.');
        const sub = (args[0]||'').toLowerCase();
        if (sub === 'on' || sub === 'enable') { await setEnabled(m.from, true); return m.reply(`🔗 *Anti-Link ENABLED!*\nLinks from non-admins will be deleted.\nWarn limit: ${WARN_LIMIT}\n\n_.antilink off_ to disable.`); }
        if (sub === 'off' || sub === 'disable') { await setEnabled(m.from, false); return m.reply('✅ Anti-Link *disabled*.'); }
        const on = await isEnabled(m.from);
        return m.reply(`🔗 *Anti-Link:* ${on?'🟢 ON':'🔴 OFF'}\n\n_.antilink on_ — Enable\n_.antilink off_ — Disable`);
    },
    async onMessage(sock, m) {
        if (!m.isGroup || !m.from || !m.sender || !m.body) return;
        LINK_REGEX.lastIndex = 0;
        if (!LINK_REGEX.test(m.body)) return;
        LINK_REGEX.lastIndex = 0;
        const on = await isEnabled(m.from);
        if (!on) return;
        const meta = await getGroupMeta(sock, m.from); if (!meta) return;
        const sc = m.sender.replace(/:\d+@/,'@');
        if (meta.participants.find(p=>p.id.replace(/:\d+@/,'@')===sc)?.admin) return;
        sock.sendMessage(m.from, { delete: m.key }).catch(() => {});
        const count = await addWarn(m.from, sc, 'Posting a link');
        if (count >= WARN_LIMIT) {
            await sock.groupParticipantsUpdate(m.from, [sc], 'remove').catch(() => {});
            await sock.sendMessage(m.from, { text:`⛔ @${sc.split('@')[0]} was *kicked* for repeatedly posting links! (${WARN_LIMIT}/${WARN_LIMIT})`, mentions:[sc] });
            const db = await getDb(); if (db) await db.collection('warnings').deleteOne({ groupId: m.from, userId: sc });
        } else {
            await sock.sendMessage(m.from, { text:`🚫 *LINK REMOVED*\n👤 @${sc.split('@')[0]}\n📌 Links are not allowed for non-admins.\n⚠️ Warns: *${count}/${WARN_LIMIT}*`, mentions:[sc] });
        }
    }
};