module.exports = {
    name: 'logger',
    aliases: ['log'],
    description: 'Toggle message logging — logs every incoming message to Railway console',

    _active: false,

    async execute(sock, m) {
        this._active = !this._active;
        const status = this._active ? '✅ *ON*' : '❌ *OFF*';
        await m.reply(`╭━━━━━━━━━━━━━━━━━━━╮\n┃   📝 *LOGGER*        ┃\n╰━━━━━━━━━━━━━━━━━━━╯\n\nStatus: ${status}\n\n${this._active ? 'All incoming messages will be printed to logs.' : 'Logging stopped.'}`);
    },

    async onMessage(sock, m) {
        if (!this._active) return;
        const plugin = require('./logger');
        if (!plugin._active) return;
        console.log(`[Logger] ${m.isGroup ? 'Group' : 'DM'} | ${m.from} | ${m.pushName} | ${m.type} | ${(m.body||'').slice(0,100)}`);
    }
};
