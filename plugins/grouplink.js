module.exports = {
    name: 'grouplink',
    aliases: ['invitelink', 'link', 'invite'],
    description: 'Get or revoke the group invite link',

    async execute(sock, m, args) {
        if (!m.isGroup) return m.reply('❌ This command only works in groups.');

        const botId = sock.user.id.replace(/:\d+@/, '@');
        const meta = await sock.groupMetadata(m.from).catch(() => null);
        if (!meta) return m.reply('❌ Could not fetch group info.');
        const botMember = meta.participants.find(p => p.id.replace(/:\d+@/, '@') === botId);
        if (!botMember?.admin) return m.reply('❌ I need to be an admin to get the invite link.');

        const revoke = args[0]?.toLowerCase() === 'revoke' || args[0]?.toLowerCase() === 'reset';

        await m.react('⏳');
        if (revoke) {
            await sock.groupRevokeInvite(m.from);
        }
        const code = await sock.groupInviteCode(m.from);
        const link = `https://chat.whatsapp.com/${code}`;
        await m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃  🔗 *GROUP INVITE LINK* ┃
╰━━━━━━━━━━━━━━━━━━━╯

${revoke ? '♻️ Link has been reset!\n\n' : ''}🏷️ *Group:* ${meta.subject}
🔗 *Link:* ${link}

${revoke ? '_Old link is now invalid._' : 'Use _.grouplink revoke_ to reset the link.'}`
        );
        await m.react('✅');
    }
};
