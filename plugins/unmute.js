module.exports = {
    name: 'unmute',
    aliases: ['open', 'unlock'],
    description: 'Unmute group — everyone can send messages',

    async execute(sock, m) {
        if (!m.isGroup) return m.reply('❌ This command only works in groups.');
        const botId = sock.user.id.replace(/:\d+@/, '@');
        const meta = await sock.groupMetadata(m.from).catch(() => null);
        const botMember = meta?.participants.find(p => p.id.replace(/:\d+@/, '@') === botId);
        if (!botMember?.admin) return m.reply('❌ I need to be an admin to unmute the group.');

        await sock.groupSettingUpdate(m.from, 'not_announcement');
        await m.reply('🔊 Group unmuted — everyone can now send messages.');
        await m.react('🔊');
    }
};
