module.exports = {
    name: 'autoreact',
    aliases: ['react'],
    description: 'Auto-reacts with ✨ to every message sent by the bot owner',

    async execute(sock, m) {
        return m.reply('ℹ️ Auto-react runs automatically on every owner message. No setup needed.');
    },

    async onMessage(sock, m) {
        try {
            if (!m.body) return;
            const isOwner = m.isOwner;
            if (isOwner) await m.react('✨');
        } catch (_) {}
    }
};
