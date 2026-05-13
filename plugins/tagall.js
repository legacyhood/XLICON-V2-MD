module.exports = {
    name: 'tagall',
    aliases: ['everyone', 'all', 'mentionall'],
    description: 'Mention all members in the group (admin only)',
    async execute(sock, m, args) {
        if (!m.isGroup) return m.reply('❌ Group only command.');
        if (!m.isAdmin) return m.reply('❌ Only group admins can use this command.');
        const meta = await sock.groupMetadata(m.from).catch(() => null);
        if (!meta) return m.reply('❌ Could not fetch group info.');
        const msg = args.join(' ').trim() || '📢 *Attention everyone!*';
        const mentions = meta.participants.map(p => p.id);
        const text = msg + '\n\n' + mentions.map(j => `@${j.split('@')[0]}`).join(' ');
        await sock.sendMessage(m.from, { text, mentions });
        await m.react('✅');
    }
};