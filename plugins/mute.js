module.exports = {
    name: 'mute',
    aliases: ['close', 'lock'],
    description: 'Mute group — only admins can send messages',

    async execute(sock, m) {
        if (!m.isGroup) return m.reply('❌ This command only works in groups.');
        const botId = sock.user.id.replace(/:\d+@/, '@');
        const meta = await sock.groupMetadata(m.from).catch(() => null);
        const botMember = meta?.participants.find(p => p.id.replace(/:\d+@/, '@') === botId);
        if (!botMember?.admin) return m.reply('❌ I need to be an admin to mute the group.');

        await sock.groupSettingUpdate(m.from, 'announcement');
        await m.reply('🔇 Group muted — only admins can send messages now.\n\nUse _.unmute_ to open it again.');
        await m.react('🔇');
    }
};
