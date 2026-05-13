module.exports = {
    name: 'help',
    aliases: ['h', 'howto'],
    description: 'Get detailed info about a specific command',

    async execute(sock, m, args) {
        const prefix = global.BOT_PREFIX || '.';

        const commands = {
            // General
            ping:        { desc: 'Check bot response speed, uptime, RAM and CPU stats', usage: `${prefix}ping`, aliases: 'speed, latency, status' },
            alive:       { desc: 'Check if the bot is alive and responsive', usage: `${prefix}alive`, aliases: 'none' },
            uptime:      { desc: 'Show how long the bot has been running', usage: `${prefix}uptime`, aliases: 'up' },
            menu:        { desc: 'Show the full list of available commands', usage: `${prefix}menu`, aliases: 'commands, list' },
            creator:     { desc: 'Show bot creator/owner contact info', usage: `${prefix}creator`, aliases: 'owner' },
            // User Tools
            profile:     { desc: 'Download the profile picture of any user. Reply to their message, mention them, or provide a number', usage: `${prefix}profile @user\n${prefix}profile 233XXXXXXXXX`, aliases: 'pp, dp, profilepic' },
            info:        { desc: 'Get info about a user (or group if in a group). Reply to/mention someone for their info', usage: `${prefix}info @user\n${prefix}info group`, aliases: 'whois, userinfo, groupinfo' },
            anonread:    { desc: 'Toggle ghost mode — when ON the bot never sends blue ticks. Senders only see grey ticks', usage: `${prefix}anonread`, aliases: 'ghostmode, ghost' },
            // Privacy & Status
            anonview:    { desc: 'Toggle anonymous status viewing. All statuses are silently downloaded and sent to your DM — posters never see you viewed', usage: `${prefix}anonview`, aliases: 'sv, statusview' },
            antidelete:  { desc: 'Toggle anti-delete. Saves messages to MongoDB and forwards deleted ones to the owner', usage: `${prefix}antidelete`, aliases: 'ad, nodelete' },
            // Media
            sticker:     { desc: 'Convert an image or video to a WhatsApp sticker', usage: `${prefix}sticker (reply to image/video)\n${prefix}take My Pack (reply to image)`, aliases: 's, take, stkr' },
            steal:       { desc: 'Steal a sticker and re-tag it with your own pack name', usage: `${prefix}steal (reply to sticker)\n${prefix}steal MyPack (reply to sticker)`, aliases: 'takesticker, getsticker' },
            toimg:       { desc: 'Convert a sticker back to an image (WebP)', usage: `${prefix}toimg (reply to sticker)`, aliases: 'stickertoimg, stoi, unpack' },
            tts:         { desc: 'Convert text to a voice message using Jane voice', usage: `${prefix}tts Hello world`, aliases: 'voice' },
            poll:        { desc: 'Create a poll in the chat', usage: `${prefix}poll Question;Option1;Option2;Option3`, aliases: 'none' },
            viewonce:    { desc: 'Reveal and save a view-once photo or video', usage: `${prefix}viewonce (reply to view-once)`, aliases: 'vo, once' },
            couplepp:    { desc: 'Get random anime couple profile pictures', usage: `${prefix}couplepp`, aliases: 'ppcp, couple' },
            // Group Tools
            tagall:      { desc: 'Mention all members in a group', usage: `${prefix}tagall`, aliases: 'everyone' },
            tagme:       { desc: 'Mention yourself in the chat', usage: `${prefix}tagme`, aliases: 'tag' },
            kick:        { desc: 'Kick/remove a member from the group (bot must be admin)', usage: `${prefix}kick @user (or reply to their message)`, aliases: 'remove, ban' },
            add:         { desc: 'Add a member to the group by phone number (bot must be admin)', usage: `${prefix}add 233XXXXXXXXX`, aliases: 'addmember' },
            promote:     { desc: 'Promote a member to group admin (bot must be admin)', usage: `${prefix}promote @user (or reply)`, aliases: 'makeadmin, admin' },
            demote:      { desc: 'Demote an admin to regular member (bot must be admin)', usage: `${prefix}demote @user (or reply)`, aliases: 'unadmin, removeadmin' },
            mute:        { desc: 'Lock the group so only admins can send messages', usage: `${prefix}mute`, aliases: 'close, lock' },
            unmute:      { desc: 'Unlock the group so everyone can send messages', usage: `${prefix}unmute`, aliases: 'open, unlock' },
            grouplink:   { desc: 'Get the group invite link. Add "revoke" to reset it', usage: `${prefix}grouplink\n${prefix}grouplink revoke`, aliases: 'invite, link' },
            // Owner
            broadcast:   { desc: 'Send an announcement to ALL groups the bot is in (owner only)', usage: `${prefix}broadcast Your message here`, aliases: 'bc, announce' },
            exec:        { desc: '(Owner) Execute JavaScript/shell code on the server', usage: `${prefix}exec console.log("hi")`, aliases: '>' },
            logger:      { desc: '(Owner) Toggle full message logging to console', usage: `${prefix}logger`, aliases: 'log' },
        };

        if (!args.length) {
            return m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃   ℹ️ *HELP COMMAND*   ┃
╰━━━━━━━━━━━━━━━━━━━╯

Usage: *${prefix}help <command>*

Examples:
  ${prefix}help profile
  ${prefix}help anonview
  ${prefix}help antidelete
  ${prefix}help kick

Or use *${prefix}menu* to see all commands.`
            );
        }

        const query = args[0].toLowerCase().replace(/^\./, '');
        const cmd = commands[query];

        if (!cmd) {
            return m.reply(`❌ Command *${prefix}${query}* not found.\n\nUse *${prefix}menu* to see all commands.`);
        }

        await m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃   ℹ️ *COMMAND INFO*   ┃
╰━━━━━━━━━━━━━━━━━━━╯

🔹 *Command:* ${prefix}${query}
📝 *Description:* ${cmd.desc}
📌 *Usage:*
${cmd.usage}
🔁 *Aliases:* ${cmd.aliases}`
        );
    }
};
