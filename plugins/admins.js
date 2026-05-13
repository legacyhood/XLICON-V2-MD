module.exports = {
    name: 'admins',
    aliases: ['adminlist', 'listadmins', 'groupadmins'],
    description: 'List all admins in the group',

    async execute(sock, m) {
        if (!m.isGroup) return m.reply('❌ This command only works in groups.');

        await m.react('⏳');
        const meta = await sock.groupMetadata(m.from).catch(() => null);
        if (!meta) return m.reply('❌ Could not fetch group info.');

        const admins = meta.participants.filter(p => p.admin);
        if (!admins.length) return m.reply('❌ No admins found in this group.');

        const superAdmins = admins.filter(p => p.admin === 'superadmin');
        const regularAdmins = admins.filter(p => p.admin === 'admin');

        const botId = sock.user.id.replace(/:\d+@/, '@');
        const senderNorm = (m.sender || '').replace(/:\d+@/, '@');

        const formatEntry = (p) => {
            const num = p.id.split('@')[0];
            const isBot = p.id.replace(/:\d+@/, '@') === botId;
            const isYou = p.id.replace(/:\d+@/, '@') === senderNorm;
            const tag = isBot ? ' 🤖' : isYou ? ' 👈 You' : '';
            return `  @${num}${tag}`;
        };

        let text = `╭━━━━━━━━━━━━━━━━━━━╮\n┃  👑 *GROUP ADMINS*   ┃\n╰━━━━━━━━━━━━━━━━━━━╯\n\n`;
        text += `🏷️ *Group:* ${meta.subject}\n`;
        text += `👥 *Total admins:* ${admins.length}\n\n`;

        if (superAdmins.length) {
            text += `👑 *Owner/Super Admin (${superAdmins.length}):*\n`;
            text += superAdmins.map(formatEntry).join('\n') + '\n\n';
        }

        if (regularAdmins.length) {
            text += `🛡️ *Admins (${regularAdmins.length}):*\n`;
            text += regularAdmins.map(formatEntry).join('\n');
        }

        const mentions = admins.map(p => p.id);
        await sock.sendMessage(m.from, { text, mentions });
        await m.react('✅');
    }
};
