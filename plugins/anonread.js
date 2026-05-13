/**
 * Anonymous Read Plugin
 * Prevents the bot from sending read receipts (blue ticks) to message senders.
 * When ON: the bot processes messages but never calls sock.readMessages(),
 * so senders only see single grey ticks — they won't know the bot read it.
 */

function isOwner(m) {
    const owners = global.owners || [];
    const senderNum = (m.sender || '').split('@')[0].replace(/:\d+$/, '');
    return owners.some(o => o.split('@')[0].replace(/:\d+$/, '') === senderNum);
}

module.exports = {
    name: 'anonread',
    aliases: ['ghostmode', 'ghost', 'readanon'],
    description: 'Toggle anonymous read — prevents blue ticks from being sent',
    enabled: false,

    async execute(sock, m) {
        if (!isOwner(m)) return m.reply('❌ This command is for the owner only.');

        this.enabled = !this.enabled;
        global.ANON_READ = this.enabled;
        const state = this.enabled ? '✅ *ON*' : '❌ *OFF*';

        return m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃   👻 *GHOST MODE*    ┃
╰━━━━━━━━━━━━━━━━━━━╯

Status: ${state}

${this.enabled
? '• Bot will NOT send blue ticks to anyone\n• Senders only see grey double ticks\n• Bot still processes and replies normally\n• Run .anonread again to turn OFF'
: '• Ghost mode disabled\n• Normal read receipts resumed\n• Run .anonread again to turn back ON'}`
        );
    }
};
