const getDb = () => global.getMongoDb();
async function getReplies() {
    if (repliesCache && Date.now()-cacheTime < CACHE_TTL) return repliesCache;
    const db = await getDb(); if (!db) return [];
    repliesCache = await db.collection('auto_replies').find().toArray();
    cacheTime = Date.now();
    return repliesCache;
}
function invalidateCache() { repliesCache = null; }

module.exports = {
    name: 'autoreply',
    aliases: ['ar', 'autorespond'],
    description: 'Set custom keyword auto-replies',
    async execute(sock, m, args) {
        const db = await getDb();
        const sub = args[0]?.toLowerCase();
        if (sub === 'add') {
            const full = args.slice(1).join(' ');
            const [trigger, ...rest] = full.split('|');
            const response = rest.join('|').trim();
            if (!trigger?.trim() || !response) return m.reply('❌ Usage: _.autoreply add hi | Hello! 👋_');
            if (!db) return m.reply('❌ DB not connected.');
            await db.collection('auto_replies').updateOne(
                { trigger: trigger.trim().toLowerCase() },
                { $set:{ trigger:trigger.trim().toLowerCase(), response, updatedAt:new Date() } },
                { upsert:true }
            );
            invalidateCache();
            return m.reply(`✅ Auto-reply set:\n📩 "${trigger.trim()}" → "${response}"`);
        }
        if (sub === 'remove' || sub === 'delete') {
            const trigger = args.slice(1).join(' ').trim().toLowerCase();
            if (!trigger || !db) return m.reply('❌ Usage: _.autoreply remove hi_');
            await db.collection('auto_replies').deleteOne({ trigger });
            invalidateCache();
            return m.reply(`✅ Removed auto-reply for "*${trigger}*".`);
        }
        if (sub === 'list') {
            const replies = await getReplies();
            if (!replies.length) return m.reply('📭 No auto-replies yet.\n_.autoreply add hi | Hello!_');
            return m.reply(`🤖 *Auto-Replies:*\n\n${replies.slice(0,20).map((r,i)=>`*${i+1}.* "${r.trigger}" → "${r.response.slice(0,40)}"`).join('\n')}`);
        }
        if (sub === 'clear') {
            if (db) { await db.collection('auto_replies').deleteMany({}); invalidateCache(); }
            return m.reply('✅ All auto-replies cleared.');
        }
        return m.reply(`_.autoreply add hi | Hello! 👋_ — Add\n_.autoreply remove hi_ — Remove\n_.autoreply list_ — Show all\n_.autoreply clear_ — Clear all`);
    },
    async onMessage(sock, m) {
        if (!m.body || m.body.startsWith(global.BOT_PREFIX||'.')) return;
        const replies = await getReplies(); if (!replies.length) return;
        const lower = m.body.toLowerCase().trim();
        for (const ar of replies) {
            if (lower.includes(ar.trigger)) {
                await sock.sendMessage(m.from, { text: ar.response }, { quoted: m }).catch(() => {});
                break;
            }
        }
    }
};
