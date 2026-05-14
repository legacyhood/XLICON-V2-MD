const getDb = () => global.getMongoDb();
async function getSetting(groupId) { const db = await getDb(); if(!db) return {}; return await db.collection('group_settings').findOne({ groupId }) || {}; }
async function setSetting(groupId, update) { const db = await getDb(); if(!db) return; await db.collection('group_settings').updateOne({ groupId }, { $set: { ...update, updatedAt: new Date() } }, { upsert: true }); }
module.exports = {
    name: 'welcome',
    aliases: ['setwelcome', 'goodbye', 'setgoodbye', 'greet'],
    description: 'Set welcome/goodbye messages for the group',
    async execute(sock, m, args) {
        if (!m.isGroup) return m.reply('❌ Group only command.');
        if (!m.isAdmin) return m.reply('❌ You need to be a group admin to use this command.');
        if (!m.isBotAdmin) return m.reply('❌ The bot is not a group admin. Please promote the bot first, then try again.');
        const meta = await sock.groupMetadata(m.from).catch(() => null);
        const sub = args[0]?.toLowerCase();
        const text = args.slice(1).join(' ').trim();
        if (sub === 'on') { await setSetting(m.from, { welcomeOn: true }); return m.reply('✅ Welcome messages *enabled*!\n\nCustomise: _.welcome msg Your welcome text_\nVariables: {name} {group} {count}'); }
        if (sub === 'off') { await setSetting(m.from, { welcomeOn: false, goodbyeOn: false }); return m.reply('✅ Welcome/goodbye messages *disabled*.'); }
        if (sub === 'msg' && text) { await setSetting(m.from, { welcomeMsg: text }); return m.reply(`✅ Welcome message set:\n\n_${text}_`); }
        if (sub === 'goodbye' && text) { await setSetting(m.from, { goodbyeMsg: text, goodbyeOn: true }); return m.reply(`✅ Goodbye message set:\n\n_${text}_`); }
        if (sub === 'goodbye' && !text) { await setSetting(m.from, { goodbyeOn: true }); return m.reply('✅ Goodbye messages *enabled*!'); }
        if (sub === 'test') {
            const settings = await getSetting(m.from);
            const welcomeMsg = settings.welcomeMsg || '👋 Welcome to *{group}*, @{numjid}!\n\nWe are now *{count}* members. Enjoy your stay! 🎉';
            const rendered = welcomeMsg.replace('{name}', m.pushName || 'User').replace('{group}', meta?.subject || 'this group').replace('{count}', meta?.participants?.length || '?').replace('{numjid}', m.sender?.split('@')[0]);
            return sock.sendMessage(m.from, { text: rendered, mentions: [m.sender] });
        }
        const settings = await getSetting(m.from);
        return m.reply(`╭━━━━━━━━━━━━━━━━━━━╮\n┃  👋 *WELCOME SETUP*  ┃\n╰━━━━━━━━━━━━━━━━━━━╯\n\nWelcome: *${settings.welcomeOn ? '🟢 ON' : '🔴 OFF'}*\nGoodbye: *${settings.goodbyeOn ? '🟢 ON' : '🔴 OFF'}*\n\n*Commands:*\n_.welcome on_ — Enable\n_.welcome off_ — Disable both\n_.welcome msg Hello {name}!_ — Set message\n_.welcome goodbye Bye {name}!_ — Set goodbye\n_.welcome test_ — Preview message\n\n*Variables:* {name} {group} {count} {numjid}`);
    },
    async onGroupUpdate(sock, update) {
        const { id, participants, action } = update;
        const settings = await getSetting(id);
        let meta;
        try { meta = await sock.groupMetadata(id); } catch(_) { return; }
        for (const jid of participants) {
            const num = jid.split('@')[0];
            const count = meta?.participants?.length || '?';
            const group = meta?.subject || 'this group';
            if (action === 'add' && settings.welcomeOn !== false) {
                const msg = (settings.welcomeMsg || '👋 Welcome to *{group}*, @{numjid}!\n\nWe are now *{count}* members strong. Enjoy your stay! 🎉').replace('{name}', num).replace('{group}', group).replace('{count}', count).replace('{numjid}', num);
                await sock.sendMessage(id, { text: msg, mentions: [jid] }).catch(() => {});
            }
            if (action === 'remove' && settings.goodbyeOn) {
                const msg = (settings.goodbyeMsg || '👋 Goodbye @{numjid}! We will miss you. Now *{count}* members remaining.').replace('{name}', num).replace('{group}', group).replace('{count}', count).replace('{numjid}', num);
                await sock.sendMessage(id, { text: msg, mentions: [jid] }).catch(() => {});
            }
        }
    }
};