module.exports = {
    name: 'checkadmin',
    aliases: ['botadmin', 'admincheck', 'debugadmin'],
    description: 'Show admin detection details for the bot and sender',

    async execute(sock, m) {
        if (!m.isGroup) return m.reply('❌ This command only works in groups.');

        await m.react('⏳');

        const meta = await sock.groupMetadata(m.from).catch(() => null);
        if (!meta) return m.reply('❌ Could not fetch group info.');

        const rawBotId = sock.user?.id || 'unknown';
        const botNorm = rawBotId.replace(/:\d+@/, '@');
        const rawSender = m.sender || 'unknown';
        const senderNorm = rawSender.replace(/:\d+@/, '@');

        const adminList = meta.participants.filter(p => p.admin).map(p => ({
            raw: p.id,
            norm: p.id.replace(/:\d+@/, '@'),
            role: p.admin
        }));

        const botInAdmin = adminList.find(a => a.norm === botNorm);
        const senderInAdmin = adminList.find(a => a.norm === senderNorm);

        let text = `╭━━━━━━━━━━━━━━━━━━━╮\n┃  🔍 *ADMIN DEBUG*   ┃\n╰━━━━━━━━━━━━━━━━━━━╯\n\n`;
        text += `🤖 *Bot raw JID:*\n${rawBotId}\n\n`;
        text += `🤖 *Bot normalised:*\n${botNorm}\n\n`;
        text += `👤 *Sender raw JID:*\n${rawSender}\n\n`;
        text += `👤 *Sender normalised:*\n${senderNorm}\n\n`;
        text += `─────────────────────\n`;
        text += `✅ *You are admin:* ${senderInAdmin ? 'YES ✅' : 'NO ❌'}\n`;
        text += `✅ *Bot is admin:* ${botInAdmin ? 'YES ✅' : 'NO ❌'}\n\n`;
        text += `─────────────────────\n`;
        text += `👑 *Admin list (${adminList.length}):*\n`;
        text += adminList.map(a => `  ${a.norm} [${a.role}]`).join('\n');

        await m.reply(text);
        await m.react(botInAdmin ? '✅' : '❌');
    }
};
