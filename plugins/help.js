module.exports = {
    name: 'help',
    aliases: ['h', 'howto'],
    description: 'Get detailed info about a specific command',

    async execute(sock, m, args) {
        const prefix = global.BOT_PREFIX || '.';

        const commands = {
            // Status & Info
            ping:       { desc: 'Check bot response speed, uptime, RAM and CPU stats', usage: `${prefix}ping`, aliases: 'speed, latency, status' },
            alive:      { desc: 'Check if the bot is alive and responsive', usage: `${prefix}alive`, aliases: 'none' },
            uptime:     { desc: 'Show how long the bot has been running', usage: `${prefix}uptime`, aliases: 'up' },
            menu:       { desc: 'Show the full list of all available commands', usage: `${prefix}menu`, aliases: 'commands, list, cmds' },
            // User Tools
            profile:    { desc: 'Download the profile picture of any user. Reply to their message, mention them, or provide a number', usage: `${prefix}profile @user\n${prefix}profile 2348XXXXXXXXX`, aliases: 'pp, dp, profilepic' },
            info:       { desc: 'Get info about a user or group', usage: `${prefix}info @user\n${prefix}info group`, aliases: 'whois, userinfo, groupinfo' },
            // Privacy & Stealth
            anonread:   { desc: 'Toggle ghost mode. When ON the bot never sends blue ticks — senders only see grey ticks. Run again to turn OFF', usage: `${prefix}anonread`, aliases: 'ghostmode, ghost' },
            anonview:   {
                desc: `Toggle silent status caching. When ON, all incoming statuses are silently saved to MongoDB (no seen receipt ever sent). Use .statusdl to retrieve them on demand.\n\n• Files ≤15MB → saved to MongoDB (survives restarts)\n• Files >15MB → kept in memory until next restart`,
                usage: `${prefix}anonview`,
                aliases: 'sv, statusview, viewstatus'
            },
            statusdl:   {
                desc: `Download cached statuses for a specific contact. Requires .anonview to be ON so statuses are cached as contacts post them.\n\n• list — see all contacts with cached statuses\n• <number> — send that person's statuses to your DM\n• clear — wipe all cached statuses`,
                usage: `${prefix}statusdl list\n${prefix}statusdl 2348012345678\n${prefix}statusdl clear`,
                aliases: 'getstatus, vstatus'
            },
            viewonce:   {
                desc: `View-once photos and videos are saved AUTOMATICALLY to your DM the moment they arrive — no command needed, no trace left in the chat.\n\nThe manual command below works as a backup (e.g. in your self-chat), but avoid using it in someone else's chat since they will see you type it.`,
                usage: `_Automatic — no command needed_\n${prefix}viewonce (reply to view-once — self-chat only)`,
                aliases: 'vo, once, reveal'
            },
            antidelete: { desc: 'Toggle anti-delete. Catches deleted messages and forwards them to the owner DM', usage: `${prefix}antidelete`, aliases: 'ad, nodelete' },
            // Media
            sticker:    { desc: 'Convert an image or video to a WhatsApp sticker', usage: `${prefix}sticker (reply to image/video)\n${prefix}sticker MyPack|Author (reply to image)`, aliases: 's, take, stkr' },
            steal:      { desc: 'Steal a sticker and re-tag it with your own pack name', usage: `${prefix}steal (reply to sticker)\n${prefix}steal MyPack (reply to sticker)`, aliases: 'takesticker, getsticker' },
            toimg:      { desc: 'Convert a sticker back to an image', usage: `${prefix}toimg (reply to sticker)`, aliases: 'stickertoimg, stoi, unpack' },
            tts:        { desc: 'Convert text to a voice note', usage: `${prefix}tts Hello world`, aliases: 'voice' },
            poll:       { desc: 'Create a poll in the chat', usage: `${prefix}poll Question;Option1;Option2;Option3`, aliases: 'none' },
            // Group Tools (Admin Only)
            admins:     { desc: 'List all admins in the group. Shows owners and regular admins separately, and marks you and the bot', usage: `${prefix}admins`, aliases: 'adminlist, listadmins, groupadmins' },
            tagall:     { desc: 'Mention all members in the group (admin only)', usage: `${prefix}tagall\n${prefix}tagall Check this out!`, aliases: 'everyone' },
            tagme:      { desc: 'Mention yourself in the chat', usage: `${prefix}tagme`, aliases: 'tag' },
            kick:       { desc: 'Kick/remove a member — admin only, bot must also be admin', usage: `${prefix}kick @user\n${prefix}kick (reply to message)`, aliases: 'remove, ban' },
            add:        { desc: 'Add a member by phone number — admin only, bot must also be admin', usage: `${prefix}add 2348XXXXXXXXX`, aliases: 'addmember' },
            promote:    { desc: 'Promote a member to group admin — admin only, bot must also be admin', usage: `${prefix}promote @user`, aliases: 'makeadmin, admin' },
            demote:     { desc: 'Demote an admin to regular member — admin only, bot must also be admin', usage: `${prefix}demote @user`, aliases: 'unadmin, removeadmin' },
            mute:       { desc: 'Lock the group — only admins can send messages (admin only)', usage: `${prefix}mute`, aliases: 'close, lock' },
            unmute:     { desc: 'Unlock the group — everyone can send messages (admin only)', usage: `${prefix}unmute`, aliases: 'open, unlock' },
            grouplink:  { desc: 'Get or reset the group invite link (admin only)', usage: `${prefix}grouplink\n${prefix}grouplink revoke`, aliases: 'invite, link' },
            rules:      { desc: 'Show group rules. Admins can set or clear them', usage: `${prefix}rules\n${prefix}rules set 1. Be respectful\n${prefix}rules clear`, aliases: 'setrules, grouprules, rule' },
            welcome:    { desc: 'Toggle and customise welcome/goodbye messages (admin only)', usage: `${prefix}welcome on\n${prefix}welcome off\n${prefix}welcome msg Hello {name}!\n${prefix}welcome goodbye Bye {name}!\n${prefix}welcome test`, aliases: 'setwelcome, goodbye, greet' },
            // Group Protection (Admin Only)
            antispam:   { desc: 'Toggle spam protection in the group (admin only)', usage: `${prefix}antispam on\n${prefix}antispam off`, aliases: 'as, spamprotect' },
            antilink:   { desc: 'Toggle link blocking in the group (admin only)', usage: `${prefix}antilink on\n${prefix}antilink off`, aliases: 'al, linkprotect, nolink' },
            filter:     { desc: 'Block specific words in the group — deletes messages and warns sender (admin only)', usage: `${prefix}filter add <word>\n${prefix}filter remove <word>\n${prefix}filter list\n${prefix}filter clear`, aliases: 'wordfilter, badword' },
            warn:       { desc: `Warn a member (admin only). After ${process.env.WARN_LIMIT||3} warnings they are auto-kicked`, usage: `${prefix}warn @user\n${prefix}warn @user Spamming`, aliases: 'warning' },
            warns:      { desc: 'Check how many warnings a member has', usage: `${prefix}warns @user`, aliases: 'none' },
            clearwarns: { desc: 'Reset all warnings for a member (admin only)', usage: `${prefix}clearwarns @user`, aliases: 'resetwarn, unwarn, removewarn' },
            // Owner
            setowner:   {
                desc: `Manage bot owner numbers from WhatsApp. Changes are saved to MongoDB and survive restarts. Only the current owner can use this.\n\n• (no args) — show current owners\n• add <number> — add a new owner\n• remove <number> — remove an owner\n• set <number> — replace all owners with one number`,
                usage: `${prefix}setowner\n${prefix}setowner add 2348012345678\n${prefix}setowner remove 2348012345678\n${prefix}setowner set 2348012345678`,
                aliases: 'owner, addowner, removeowner'
            },
            broadcast:  {
                desc: `Send a message or media to ALL groups the bot is in (owner only).\n\n• <message> — broadcast plain text\n• (reply to message/image/video) — broadcast that content\n• list — see all groups the bot is in`,
                usage: `${prefix}broadcast Your message here\n${prefix}broadcast (reply to image/video/text)\n${prefix}broadcast list`,
                aliases: 'bc, announce'
            },
            exec:       { desc: '(Owner) Execute JavaScript code on the server', usage: `${prefix}exec console.log("test")`, aliases: '>' },
        };

        if (!args.length) {
            return m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃   ℹ️ *HELP COMMAND*   ┃
╰━━━━━━━━━━━━━━━━━━━╯

Usage: *${prefix}help <command>*

Examples:
  ${prefix}help admins
  ${prefix}help anonview
  ${prefix}help statusdl
  ${prefix}help setowner
  ${prefix}help viewonce
  ${prefix}help kick

Or use *${prefix}menu* to see all commands.`
            );
        }

        const query = args[0].toLowerCase().replace(/^\./, '');
        const cmd = commands[query];

        if (!cmd) {
            return m.reply(`❌ No help entry for *${prefix}${query}*.\n\nUse *${prefix}menu* to see all commands.`);
        }

        await m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃   ℹ️ *COMMAND INFO*   ┃
╰━━━━━━━━━━━━━━━━━━━╯

🔹 *Command:* ${prefix}${query}
📝 *Description:*
${cmd.desc}

📌 *Usage:*
${cmd.usage}

🔁 *Aliases:* ${cmd.aliases}`
        );
    }
};
