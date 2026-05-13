module.exports = {
    name: 'mute',
    aliases: ['close', 'lock'],
    description: 'Mute group — only admins can send messages',
    async execute(sock, m) {
        if (!m.isGroup) return m.reply('❌ This command only works in groups.');
        if (!m.isAdmin) return m.reply('❌ You need to be a group admin to use this command.');
        if (!m.isBotAdmin) return m.reply('❌ The bot is not a group admin. Please promote the bot first, then try again.');
        await sock.groupSettingUpdate(m.from, 'announcement');
        await m.reply('🔇 Group muted — only admins can send messages now.\n\nUse _.unmute_ to open it again.');
        await m.react('🔇');
    }
};