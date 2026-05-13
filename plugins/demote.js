module.exports = {
    name: 'demote',
    aliases: ['unadmin', 'removeadmin'],
    description: 'Demote an admin to regular member',

    async execute(sock, m) {
        if (!m.isGroup) return m.reply('❌ This command only works in groups.');

        const botId = sock.user.id.replace(/:\d+@/, '@');
        const meta = await sock.groupMetadata(m.from).catch(() => null);
        if (!meta) return m.reply('❌ Could not fetch group info.');

        const botMember = meta.participants.find(p => p.id.replace(/:\d+@/, '@') === botId);
        if (!botMember?.admin) return m.reply('❌ I need to be an admin to demote members.');

        let target = null;
        if (m.quoted) target = m.quoted.sender || m.quoted.key?.participant;
        if (!target && m.mentionedJid?.length) target = m.mentionedJid[0];
        if (!target) return m.reply('❌ Reply to or mention the admin you want to demote.');
        target = target.replace(/:\d+@/, '@');

        await m.react('⏳');
        await sock.groupParticipantsUpdate(m.from, [target], 'demote');
        await sock.sendMessage(m.from, {
            text: `✅ @${target.split('@')[0]} has been demoted to member.`,
            mentions: [target]
        });
        await m.react('✅');
    }
};
