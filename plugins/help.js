module.exports = {
    name: 'help',
    aliases: ['h', 'info'],
    description: 'Get detailed info about a specific command',

    async execute(sock, m, args) {
        const prefix = global.BOT_PREFIX || '.';

        const commands = {
            ping:      { desc: 'Check bot speed, uptime, memory and CPU stats', usage: `${prefix}ping`, aliases: 'speed, latency, status' },
            alive:     { desc: 'Check if the bot is alive and responsive', usage: `${prefix}alive`, aliases: 'none' },
            uptime:    { desc: 'Show how long the bot has been running', usage: `${prefix}uptime`, aliases: 'up' },
            menu:      { desc: 'Show the full list of available commands', usage: `${prefix}menu`, aliases: 'help, commands, list' },
            creator:   { desc: 'Show information about the bot creator', usage: `${prefix}creator`, aliases: 'none' },
            sticker:   { desc: 'Convert an image or video to a WhatsApp sticker', usage: `${prefix}sticker (reply to image/video)`, aliases: 's' },
            tts:       { desc: 'Convert text to a voice message', usage: `${prefix}tts Hello world`, aliases: 'voice' },
            poll:      { desc: 'Create a poll in the chat', usage: `${prefix}poll Question | Option1 | Option2`, aliases: 'none' },
            viewonce:  { desc: 'Reveal a view-once photo or video', usage: `${prefix}viewonce (reply to view-once)`, aliases: 'vo' },
            autoreact: { desc: 'Toggle automatic emoji reactions to messages', usage: `${prefix}autoreact`, aliases: 'none' },
            tagall:    { desc: 'Mention all members in a group', usage: `${prefix}tagall`, aliases: 'all' },
            tagme:     { desc: 'Mention yourself in the chat', usage: `${prefix}tagme`, aliases: 'none' },
            couplepp:  { desc: 'Set a couple profile picture with another user', usage: `${prefix}couplepp @user`, aliases: 'couple' },
            mention:   { desc: 'Mention the bot owner', usage: `${prefix}mention`, aliases: 'owner' },
            exec:      { desc: '(Owner only) Run a shell command on the server', usage: `${prefix}exec ls -la`, aliases: 'shell' },
            logger:    { desc: '(Owner only) Toggle message logging', usage: `${prefix}logger`, aliases: 'none' },
        };

        if (!args.length) {
            await m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃   ℹ️ *HELP COMMAND*   ┃
╰━━━━━━━━━━━━━━━━━━━╯

Usage: *${prefix}help <command>*

Example:
  ${prefix}help ping
  ${prefix}help sticker
  ${prefix}help tts

Or use *${prefix}menu* to see all commands.`
            );
            return;
        }

        const query = args[0].toLowerCase().replace(/^\./, '');
        const cmd = commands[query];

        if (!cmd) {
            await m.reply(`❌ Command *${prefix}${query}* not found.\n\nUse *${prefix}menu* to see all available commands.`);
            return;
        }

        await m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃  ℹ️ *COMMAND INFO*   ┃
╰━━━━━━━━━━━━━━━━━━━╯

🔹 *Command:* ${prefix}${query}
📝 *Description:* ${cmd.desc}
📌 *Usage:* ${cmd.usage}
🔁 *Aliases:* ${cmd.aliases}`
        );
    }
};
