module.exports = {
    name: 'promote',
    aliases: ['makeadmin', 'admin'],
    description: 'Promote a group member to admin',

    async execute(sock, m) {
        if (!m.isGroup) return m.reply('❌ This command only works in groups.');
        if (!m.isAdmin) return m.reply('❌ Only group admins can use this command.');

        const meta = await sock.groupMetadata(m.from).catch(() => null);
        if (!meta) return m.reply('❌ Could not fetch group info.');

        if (!m.isBotAdmin) return m.reply('❌ I need to be an admin to promote members.');

        let target = null;
        if (m.quoted) target = m.quoted.sender || m.quoted.key?.participant;
        if (!target && m.mentionedJid?.length) target = m.mentionedJid[0];
        if (!target) return m.reply('❌ Reply to or mention the user you want to promote.');
        target = target.replace(/:\d+@/, '@');

        await m.react('⏳');
        await sock.groupParticipantsUpdate(m.from, [target], 'promote');
        await sock.sendMessage(m.from, {
            text: `✅ @${target.split('@')[0]} has been promoted to admin! 🎉`,
            mentions: [target]
        });
        await m.react('✅');
    }
};
