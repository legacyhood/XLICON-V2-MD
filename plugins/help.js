module.exports = {
    name: 'help',
    aliases: ['h', 'howto'],
    description: 'Get detailed info about a specific command, or browse the full command list',

    async execute(sock, m, args) {
        const p = global.BOT_PREFIX || '.';
        const wl = process.env.WARN_LIMIT || '3';

        const commands = {

            // ── Status & Info ─────────────────────────────────────────────
            ping: {
                category: '📊 Status & Info',
                desc: 'Check the bot's response speed, current uptime, RAM usage, and CPU load all in one message. Useful to confirm the bot is alive and not lagging.',
                usage: `${p}ping`,
                aliases: 'speed, latency, status'
            },
            alive: {
                category: '📊 Status & Info',
                desc: 'A quick check to confirm the bot is online and responding. Returns a brief status card.',
                usage: `${p}alive`,
                aliases: 'none'
            },
            uptime: {
                category: '📊 Status & Info',
                desc: 'Shows exactly how long the bot has been running since its last restart.',
                usage: `${p}uptime`,
                aliases: 'up'
            },
            menu: {
                category: '📊 Status & Info',
                desc: 'Displays the full command menu, organised by category with a quick description of each command.',
                usage: `${p}menu`,
                aliases: 'commands, list, cmds'
            },

            // ── AI Assistant ─────────────────────────────────────────────
            ai: {
                category: '🤖 AI Assistant',
                desc: `Chat with Claude AI (by Anthropic) directly from WhatsApp. The bot remembers your conversation for up to 30 minutes of inactivity, so you can ask follow-up questions naturally.

Sub-commands:
• ${p}ai <question> — Ask Claude anything (single question or follow-up)
• ${p}ai on — Turn on AI auto-reply: Claude responds to EVERY message in this chat automatically
• ${p}ai off — Turn off AI auto-reply (you can still use ${p}ai <question> manually)
• ${p}aiclear — Wipe the conversation history for this chat and start fresh

Works in both personal chats and groups. In groups, only admins or the owner can toggle auto-reply mode.
Requires ANTHROPIC_API_KEY to be set in Railway environment variables.`,
                usage: `${p}ai Hello, who are you?
${p}ai What is the capital of Nigeria?
${p}ai on
${p}ai off
${p}aiclear`,
                aliases: 'ask, claude, chat'
            },

            // ── User Tools ────────────────────────────────────────────────
            profile: {
                category: '👤 User Tools',
                desc: 'Downloads and sends the WhatsApp profile picture of any user. You can target someone by replying to their message, mentioning them with @, or typing their phone number directly.',
                usage: `${p}profile @user
${p}profile 2348XXXXXXXXX
${p}profile (reply to any message)`,
                aliases: 'pp, dp, profilepic'
            },
            info: {
                category: '👤 User Tools',
                desc: 'Fetches detailed information about a user (name, number, about) or about the current group (name, description, member count, creation date, admin list).',
                usage: `${p}info @user
${p}info 2348XXXXXXXXX
${p}info group`,
                aliases: 'whois, userinfo, groupinfo'
            },

            // ── Privacy & Stealth ─────────────────────────────────────────
            anonread: {
                category: '👻 Privacy & Stealth',
                desc: `Toggles ghost mode. When ON, the bot never sends read receipts — so anyone who messages you only sees grey double ticks, never blue ticks. They cannot tell whether you have seen their message.

Important: this is one-way. Ghost mode hides YOUR read receipts from others. You can still see blue ticks when others read your messages normally.

Setting is saved to MongoDB and survives Railway restarts.`,
                usage: `${p}anonread  ← toggle ON
${p}anonread  ← toggle OFF (run again)`,
                aliases: 'ghostmode, ghost, readanon'
            },
            anonview: {
                category: '👻 Privacy & Stealth',
                desc: `Toggles silent status caching. When ON, every status update posted by your contacts is silently saved in the background — the poster never receives a "seen" receipt from you.

Storage rules:
• Files 15MB or smaller → saved to MongoDB (survive restarts)
• Files larger than 15MB → kept in memory only (cleared on restart)

Use .statusdl to retrieve cached statuses on demand. Setting survives restarts.`,
                usage: `${p}anonview  ← toggle ON
${p}anonview  ← toggle OFF`,
                aliases: 'sv, statusview, viewstatus'
            },
            statusdl: {
                category: '👻 Privacy & Stealth',
                desc: `Downloads and sends you the cached statuses of a specific contact. Requires .anonview to be ON so statuses are being cached as your contacts post them.

Sub-commands:
• list — See all contacts who have cached statuses
• <number> — Send you all statuses saved for that phone number
• clear — Delete all cached statuses from MongoDB`,
                usage: `${p}statusdl list
${p}statusdl 2348012345678
${p}statusdl clear`,
                aliases: 'getstatus, vstatus'
            },
            viewonce: {
                category: '👻 Privacy & Stealth',
                desc: `View-once photos and videos are saved automatically to your private DM the moment they arrive — no command needed, and no trace is left in the original chat. The sender has no idea it was saved.

The manual command is a backup for testing in your own self-chat only. Avoid using it in other people's chats as they will see you type it.`,
                usage: `(Fully automatic — no command needed)
${p}viewonce  ← only in your own self-chat`,
                aliases: 'vo, once, reveal'
            },
            antidelete: {
                category: '👻 Privacy & Stealth',
                desc: `Toggles anti-delete monitoring. When ON, every message the bot receives is quietly saved to MongoDB. If anyone — in any chat — deletes their message, the bot immediately forwards the original content to your DM before it disappears.

Covers both group messages and private DMs. Media filenames are recorded but the raw file cannot be recovered (WhatsApp removes it from servers). Setting survives restarts.`,
                usage: `${p}antidelete  ← toggle ON
${p}antidelete  ← toggle OFF`,
                aliases: 'ad, nodelete'
            },

            // ── Media ─────────────────────────────────────────────────────
            sticker: {
                category: '🎨 Media & Stickers',
                desc: 'Converts an image or video clip into a WhatsApp sticker. Reply to or send the image/video with this command. Optionally set a custom pack name and author tag by adding them after the command separated by a pipe (|).',
                usage: `${p}sticker  (reply to image or video)
${p}sticker MyPack|AuthorName  (reply to image)`,
                aliases: 's, take, stkr'
            },
            steal: {
                category: '🎨 Media & Stickers',
                desc: 'Re-packages an existing sticker under your own pack name. Reply to any sticker with this command to steal it and re-tag it.',
                usage: `${p}steal  (reply to sticker)
${p}steal MyPackName  (reply to sticker)`,
                aliases: 'takesticker, getsticker'
            },
            toimg: {
                category: '🎨 Media & Stickers',
                desc: 'Converts a sticker back into a regular image file. Reply to the sticker you want to convert.',
                usage: `${p}toimg  (reply to sticker)`,
                aliases: 'stickertoimg, stoi, unpack'
            },
            tts: {
                category: '🎨 Media & Stickers',
                desc: 'Converts any text you type into a WhatsApp voice note using text-to-speech. The bot sends it as an audio message.',
                usage: `${p}tts Good morning, how are you?`,
                aliases: 'voice'
            },
            poll: {
                category: '🎨 Media & Stickers',
                desc: 'Creates a WhatsApp poll in the current chat. Separate the question and each option with a semicolon (;). You can add up to 12 options.',
                usage: `${p}poll Best colour?;Red;Blue;Green;Yellow`,
                aliases: 'none'
            },

            // ── Group Admin ───────────────────────────────────────────────
            admins: {
                category: '👥 Group Admin',
                desc: 'Lists all admins in the current group, organised by role. Group owners are shown separately from regular admins. Your own name is marked with 👈 You and the bot's entry is marked with 🤖 so you can easily spot them.',
                usage: `${p}admins`,
                aliases: 'adminlist, listadmins, groupadmins'
            },
            tagall: {
                category: '👥 Group Admin',
                desc: 'Mentions every member of the group in a single message, sending them a notification. You can add an optional message above the mentions. Admin only.',
                usage: `${p}tagall
${p}tagall Please read the pinned message!`,
                aliases: 'everyone, all, mentionall'
            },
            kick: {
                category: '👥 Group Admin',
                desc: 'Removes a member from the group. You must be a group admin AND the bot must also be an admin. Target someone by replying to their message or mentioning them.',
                usage: `${p}kick @user
${p}kick  (reply to their message)`,
                aliases: 'remove, ban'
            },
            add: {
                category: '👥 Group Admin',
                desc: 'Adds a person to the group using their phone number. Both you and the bot must be group admins. If the person has their privacy set to prevent being added, you will receive an error message.',
                usage: `${p}add 2348012345678`,
                aliases: 'addmember'
            },
            promote: {
                category: '👥 Group Admin',
                desc: 'Promotes a regular group member to admin status. Both you and the bot must be group admins for this to work.',
                usage: `${p}promote @user
${p}promote  (reply to their message)`,
                aliases: 'makeadmin, admin'
            },
            demote: {
                category: '👥 Group Admin',
                desc: 'Removes admin status from a group admin, returning them to a regular member. Both you and the bot must be group admins.',
                usage: `${p}demote @user
${p}demote  (reply to their message)`,
                aliases: 'unadmin, removeadmin'
            },
            mute: {
                category: '👥 Group Admin',
                desc: 'Locks the group so that only admins can send messages. Regular members will not be able to chat until an admin runs .unmute. Admin only.',
                usage: `${p}mute`,
                aliases: 'close, lock'
            },
            unmute: {
                category: '👥 Group Admin',
                desc: 'Unlocks a previously muted group, restoring the ability for all members to send messages. Admin only.',
                usage: `${p}unmute`,
                aliases: 'open, unlock'
            },
            grouplink: {
                category: '👥 Group Admin',
                desc: 'Fetches the current group invite link so you can share it. Use the revoke sub-command to generate a new link and invalidate the old one (useful if the old link was shared publicly by mistake).',
                usage: `${p}grouplink
${p}grouplink revoke`,
                aliases: 'invitelink, link, invite'
            },
            rules: {
                category: '👥 Group Admin',
                desc: 'Displays the group rules set by an admin. Admins can set or update the rules with .rules set, or wipe them with .rules clear. Anyone can read the rules at any time.',
                usage: `${p}rules
${p}rules set 1. Be respectful\n2. No spam
${p}rules clear`,
                aliases: 'setrules, grouprules, rule'
            },
            welcome: {
                category: '👥 Group Admin',
                desc: `Manages the welcome and goodbye message system for the group. When enabled, the bot automatically greets new members when they join and says goodbye when they leave.

Variables you can use in your message:
• {name} — member's display name
• {group} — group name
• {count} — current member count
• {numjid} — member's phone number (used for @mention)`,
                usage: `${p}welcome on
${p}welcome off
${p}welcome msg Welcome to {group}, {name}! 🎉
${p}welcome goodbye Goodbye {name}, we'll miss you!
${p}welcome test  ← preview your welcome message`,
                aliases: 'setwelcome, goodbye, greet'
            },

            // ── Group Protection ──────────────────────────────────────────
            antispam: {
                category: '🛡️ Group Protection',
                desc: `Enables or disables spam protection for the group. When ON, the bot monitors every non-admin member's message frequency. If someone sends too many messages too quickly, their messages are deleted and they receive a warning. After reaching the warn limit (${wl} by default) they are automatically kicked.

Spam threshold is controlled by SPAM_MSG_LIMIT and SPAM_TIME_WINDOW environment variables on Railway.`,
                usage: `${p}antispam on
${p}antispam off`,
                aliases: 'as, spamprotect'
            },
            antilink: {
                category: '🛡️ Group Protection',
                desc: `Enables or disables link blocking for the group. When ON, any URL or WhatsApp group link posted by a non-admin member is automatically deleted and the sender receives a warning. After ${wl} warnings they are auto-kicked.

Detects: http/https links, wa.me, t.me, WhatsApp group invites, bit.ly, tinyurl, YouTube, etc.`,
                usage: `${p}antilink on
${p}antilink off`,
                aliases: 'al, linkprotect, nolink'
            },
            filter: {
                category: '🛡️ Group Protection',
                desc: `Manages a blocked word list for the group. When a non-admin sends a message containing any filtered word, the message is immediately deleted and the sender receives a warning. After ${wl} warnings they are auto-kicked.

Sub-commands:
• add <word> — Add a word to the filter
• remove <word> — Remove a word from the filter
• list — Show all currently filtered words
• clear — Remove all words from the filter`,
                usage: `${p}filter add badword
${p}filter remove badword
${p}filter list
${p}filter clear`,
                aliases: 'wordfilter, badword'
            },
            warn: {
                category: '🛡️ Group Protection',
                desc: `Issues a formal warning to a group member. Each warning is saved to MongoDB. After ${wl} warnings the member is automatically removed from the group and their warning count is reset. You can add an optional reason after the mention.

Only works on non-admin members. Cannot warn admins.`,
                usage: `${p}warn @user
${p}warn @user Posting inappropriate content`,
                aliases: 'warning'
            },
            warns: {
                category: '🛡️ Group Protection',
                desc: 'Checks the current warning count for a group member. Shows how many warnings they have out of the limit, along with the reason for each warning. Any member can check warns — not just admins.',
                usage: `${p}warns @user
${p}warns  (reply to their message)`,
                aliases: 'none'
            },
            clearwarns: {
                category: '🛡️ Group Protection',
                desc: 'Resets all warnings for a member back to zero. Useful if someone has changed their behaviour and you want to give them a clean slate. Admin only.',
                usage: `${p}clearwarns @user
${p}clearwarns  (reply to their message)`,
                aliases: 'resetwarn, unwarn, removewarn'
            },

            // ── Owner ─────────────────────────────────────────────────────
            setowner: {
                category: '⚙️ Owner Only',
                desc: `Manages the list of bot owners from within WhatsApp — no need to touch Railway config. Owner numbers are saved to MongoDB and survive restarts. Only the current owner can use this command.

Sub-commands:
• (no args) — Show the current owner list
• add <number> — Add a new owner number
• remove <number> — Remove an owner number
• set <number> — Replace all owners with a single number`,
                usage: `${p}setowner
${p}setowner add 2348012345678
${p}setowner remove 2348012345678
${p}setowner set 2348012345678`,
                aliases: 'owner, addowner, removeowner'
            },
            broadcast: {
                category: '⚙️ Owner Only',
                desc: `Sends a message to every group the bot is currently in. You can broadcast plain text, or reply to an existing image/video/text to broadcast that content. Use .broadcast list to see all the groups the bot is in before sending.`,
                usage: `${p}broadcast Hello everyone! 📢
${p}broadcast  (reply to any image or video)
${p}broadcast list`,
                aliases: 'bc, announce'
            },
            exec: {
                category: '⚙️ Owner Only',
                desc: 'Executes raw JavaScript code directly on the bot server and returns the result. Use with caution — this gives full Node.js access to the running process.',
                usage: `${p}exec process.version
${p}exec global.owners`,
                aliases: '>'
            }
        };

        // ── No argument — show full categorised list ──────────────────────
        if (!args.length) {
            const categories = {};
            for (const [name, cmd] of Object.entries(commands)) {
                if (!categories[cmd.category]) categories[cmd.category] = [];
                categories[cmd.category].push({ name, cmd });
            }

            let text = `╭━━━━━━━━━━━━━━━━━━━━━━╮\n┃   📖 *XLICON COMMAND GUIDE*  ┃\n╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            text += `Type *${p}help <command>* for full details, usage examples and aliases for any command.\n\n`;

            for (const [cat, cmds] of Object.entries(categories)) {
                text += `╭─── ${cat} ───\n`;
                for (const { name, cmd } of cmds) {
                    const firstLine = cmd.desc.split('\n')[0].slice(0, 72);
                    text += `┃ *${p}${name}* — ${firstLine}\n`;
                }
                text += `╰──────────────────────────\n\n`;
            }

            text += `> 🔤 Prefix: *${p}*  |  Warn limit: *${wl} warns = auto-kick*`;
            return m.reply(text);
        }

        // ── With argument — show full detail for that command ─────────────
        const query = args[0].toLowerCase().replace(/^[.\/!]/, '');
        const cmd = commands[query];

        if (!cmd) {
            return m.reply(`❌ No help entry found for *${p}${query}*\n\nUse *${p}help* to see all available commands.`);
        }

        await m.reply(
`╭━━━━━━━━━━━━━━━━━━━━━━╮
┃   📖 *COMMAND DETAILS*   ┃
╰━━━━━━━━━━━━━━━━━━━━━━╯

🔹 *Command:* ${p}${query}
🏷️ *Category:* ${cmd.category}

📝 *Description:*
${cmd.desc}

📌 *Usage:*
${cmd.usage}

🔁 *Aliases:* ${cmd.aliases}`
        );
    }
};
