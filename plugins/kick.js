module.exports = {
    name: 'kick',
    aliases: ['remove', 'ban'],
    description: 'Kick a member from the group (admin only)',

    async execute(sock, m) {
        if (!m.isGroup) return m.reply('❌ This command only works in groups.');

        const botId = sock.user.id.replace(/:\d+@/, '@');
        const meta = await sock.groupMetadata(m.from).catch(() => null);
        if (!meta) return m.reply('❌ Could not fetch group info.');

        const botMember = meta.participants.find(p => p.id.replace(/:\d+@/, '@') === botId);
        if (!botMember?.admin) return m.reply('❌ I need to be an admin to kick members.');

        let target = null;
        if (m.quoted) target = m.quoted.sender || m.quoted.key?.participant;
        if (!target && m.mentionedJid?.length) target = m.mentionedJid[0];
        if (!target) return m.reply('❌ Reply to or mention the user you want to kick.');
        target = target.replace(/:\d+@/, '@');

        const targetMember = meta.participants.find(p => p.id.replace(/:\d+@/, '@') === target);
        if (!targetMember) return m.reply('❌ That user is not in this group.');
        if (targetMember.admin) return m.reply('❌ I cannot kick an admin.');

        await m.react('⏳');
        await sock.groupParticipantsUpdate(m.from, [target], 'remove');
        await sock.sendMessage(m.from, {
            text: `✅ @${target.split('@')[0]} has been kicked from the group.`,
            mentions: [target]
        });
        await m.react('✅');
    }
};
