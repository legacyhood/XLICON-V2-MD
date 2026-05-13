const { MongoClient } = require('mongodb');
let _db = null;
async function getDb() {
    if (_db) return _db;
    if (!process.env.MONGO_URI) return null;
    try { const c = new MongoClient(process.env.MONGO_URI); await c.connect(); _db = c.db('xlicon_bot'); return _db; }
    catch(e) { return null; }
}

module.exports = {
    name: 'autoreply',
    aliases: ['ar', 'autorespond', 'autoresponse'],
    description: 'Set custom keyword auto-replies. Works in DMs and groups.',

    async execute(sock, m, args) {
        const db = await getDb();
        const sub = args[0]?.toLowerCase();

        if (sub === 'add') {
            // .autoreply add trigger | response
            const full = args.slice(1).join(' ');
            const [trigger, ...rest] = full.split('|');
            const response = rest.join('|').trim();
            if (!trigger?.trim() || !response) {
                return m.reply('❌ Usage: _.autoreply add hi | Hello! How are you?_\n_Separate trigger and response with |_');
            }
            if (!db) return m.reply('❌ Database not connected.');
            await db.collection('auto_replies').updateOne(
                { trigger: trigger.trim().toLowerCase() },
                { $set: { trigger: trigger.trim().toLowerCase(), response, updatedAt: new Date(), addedBy: m.sender } },
                { upsert: true }
            );
            return m.reply(`✅ Auto-reply added!\n\n📩 *Trigger:* "${trigger.trim()}"\n💬 *Response:* "${response}"`);
        }
        if (sub === 'remove' || sub === 'delete') {
            const trigger = args.slice(1).join(' ').trim().toLowerCase();
            if (!trigger) return m.reply('❌ Usage: _.autoreply remove hi_');
            if (!db) return m.reply('❌ Database not connected.');
            const r = await db.collection('auto_replies').deleteOne({ trigger });
            return m.reply(r.deletedCount ? `✅ Auto-reply for "*${trigger}*" removed.` : `❌ No auto-reply found for "*${trigger}*".`);
        }
        if (sub === 'list') {
            if (!db) return m.reply('❌ Database not connected.');
            const replies = await db.collection('auto_replies').find().limit(20).toArray();
            if (!replies.length) return m.reply('📭 No auto-replies set yet.\n\n_.autoreply add hi | Hello there!_');
            let out = `╭━━━━━━━━━━━━━━━━━━━╮\n┃  🤖 *AUTO-REPLIES*  ┃\n╰━━━━━━━━━━━━━━━━━━━╯\n\n`;
            replies.forEach((r,i)=>{ out+=`*${i+1}.* "${r.trigger}" → "${r.response.slice(0,40)}${r.response.length>40?'...':''}"\n`; });
            return m.reply(out);
        }
        if (sub === 'clear') {
            if (!db) return m.reply('❌ Database not connected.');
            const r = await db.collection('auto_replies').deleteMany({});
            return m.reply(`✅ Cleared ${r.deletedCount} auto-replies.`);
        }

        return m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃  🤖 *AUTO-REPLY*    ┃
╰━━━━━━━━━━━━━━━━━━━╯

_.autoreply add hi | Hello! 👋_ — Add
_.autoreply remove hi_ — Remove
_.autoreply list_ — Show all
_.autoreply clear_ — Delete all

💡 Trigger is case-insensitive, partial match!`
        );
    },

    async onMessage(sock, m) {
        if (!m.body || m.body.startsWith(global.BOT_PREFIX||'.')) return;
        const db = await getDb(); if (!db) return;
        const lower = m.body.toLowerCase().trim();
        const replies = await db.collection('auto_replies').find().toArray();
        for (const ar of replies) {
            if (lower.includes(ar.trigger)) {
                await sock.sendMessage(m.from, { text: ar.response }, { quoted: m });
                break;
            }
        }
    }
};
