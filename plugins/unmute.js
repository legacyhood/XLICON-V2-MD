module.exports = {
    name: 'unmute',
    aliases: ['open', 'unlock'],
    description: 'Unmute group — everyone can send messages',
    async execute(sock, m) {
        if (!m.isGroup) return m.reply('❌ This command only works in groups.');
        if (!m.isAdmin) return m.reply('❌ Only group admins can use this command.');
        if (!m.isBotAdmin) return m.reply('❌ I need to be an admin to unmute the group.');
        await sock.groupSettingUpdate(m.from, 'not_announcement');
        await m.reply('🔊 Group unmuted — everyone can now send messages.');
        await m.react('🔊');
    }
};