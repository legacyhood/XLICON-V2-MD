/**
 * Anonymous Read Plugin
 * Prevents the bot from sending read receipts (blue ticks) to message senders.
 * When ON: the bot processes messages but never calls sock.readMessages(),
 * so senders only see single grey ticks — they won't know the bot read it.
 */

module.exports = {
    name: 'anonread',
    aliases: ['ghostmode', 'ghost', 'readanon'],
    description: 'Toggle anonymous read — prevents blue ticks from being sent',
    // Starts OFF so normal behavior is preserved; flip ON for stealth mode
    enabled: false,

    async execute(sock, m) {
        const owners = (global.owners || ['233533763772@s.whatsapp.net']);
        const isOwner = owners.some(o => m.sender.includes(o.split('@')[0]));
        if (!isOwner) return m.reply('❌ This command is for the owner only.');

        this.enabled = !this.enabled;
        global.ANON_READ = this.enabled;

        const status = this.enabled ? '✅ *ON*' : '❌ *OFF*';
        await m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃   👻 *GHOST MODE*    ┃
╰━━━━━━━━━━━━━━━━━━━╯

Status: ${status}

${this.enabled
    ? '• Bot will NOT send blue ticks to anyone\n• Senders only see grey double ticks\n• Bot still processes and replies to commands\n• Your presence is hidden'
    : '• Ghost mode disabled\n• Normal read receipts resumed'}`
        );
    }
};
