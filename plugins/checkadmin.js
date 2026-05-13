module.exports = {
    name: 'checkadmin',
    aliases: ['botadmin', 'admincheck', 'debugadmin'],
    description: 'Show admin detection details for the bot and sender',

    async execute(sock, m) {
        if (!m.isGroup) return m.reply('❌ This command only works in groups.');
        await m.react('⏳');

        const meta = await sock.groupMetadata(m.from).catch(() => null);
        if (!meta) return m.reply('❌ Could not fetch group info.');

        const norm = (jid) => (jid || '').replace(/:\d+@/, '@');

        // Bot identifiers — phone JID and LID (WhatsApp privacy ID)
        const rawBotId  = sock.user?.id || 'unknown';
        const botPhoneNorm = norm(rawBotId);
        const rawBotLid = sock.authState?.creds?.me?.lid || sock.user?.lid || '';
        const botLidNorm   = norm(rawBotLid);

        // Sender
        const rawSender    = m.sender || 'unknown';
        const senderNorm   = norm(rawSender);

        const allParticipants = meta.participants || [];
        const adminParticipants = allParticipants.filter(p => p.admin);
        const adminNorms = adminParticipants.map(p => norm(p.id));

        const senderIsAdmin = adminNorms.includes(senderNorm);
        const botIsAdmin = adminNorms.includes(botPhoneNorm) ||
                           (botLidNorm && adminNorms.includes(botLidNorm));

        // Try to find the bot's own participant entry in the group by any JID match
        const botParticipantEntry = allParticipants.find(p => {
            const pn = norm(p.id);
            return pn === botPhoneNorm || (botLidNorm && pn === botLidNorm);
        });

        let text = '╭━━━━━━━━━━━━━━━━━━━╮\n┃  🔍 *ADMIN DEBUG v2* ┃\n╰━━━━━━━━━━━━━━━━━━━╯\n\n';
        text += `🤖 *Bot phone JID (raw):* ${rawBotId}\n`;
        text += `🤖 *Bot phone JID (norm):* ${botPhoneNorm}\n\n`;
        text += `🆔 *Bot LID (raw):* ${rawBotLid || '(not available)'}\n`;
        text += `🆔 *Bot LID (norm):* ${botLidNorm || '(not available)'}\n\n`;
        text += `👤 *Sender raw JID:* ${rawSender}\n`;
        text += `👤 *Sender norm:* ${senderNorm}\n\n`;
        text += `🔍 *Bot in group:* ${botParticipantEntry ? botParticipantEntry.id + ' [' + (botParticipantEntry.admin || 'member') + ']' : 'NOT FOUND in participant list'}\n\n`;
        text += '─────────────────────\n';
        text += `✅ *You are admin:* ${senderIsAdmin ? 'YES ✅' : 'NO ❌'}\n`;
        text += `✅ *Bot is admin:* ${botIsAdmin ? 'YES ✅' : 'NO ❌'}\n\n`;
        text += '─────────────────────\n';
        text += `👑 *Admin list (${adminParticipants.length}):*\n`;
        text += adminParticipants.map(p => `  ${norm(p.id)} [${p.admin}]`).join('\n');
        text += `\n\n👥 *All participants (${allParticipants.length}):*\n`;
        text += allParticipants.map(p => `  ${norm(p.id)}${p.admin ? ' [' + p.admin + ']' : ''}`).join('\n');

        await m.reply(text);
        await m.react(botIsAdmin ? '✅' : '❌');
    }
};
