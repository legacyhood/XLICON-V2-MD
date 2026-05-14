module.exports = {
    name: 'help',
    aliases: ['h', 'howto'],
    description: 'Get detailed info about a specific command, or browse the full command list',

    async execute(sock, m, args) {
        const p = global.BOT_PREFIX || '.';
        const wl = process.env.WARN_LIMIT || '3';

        const commands = {

            ping: {
                category: '📊 Status & Info',
                desc: "Check the bot's response speed, current uptime, RAM usage, and CPU load all in one message. Useful to confirm the bot is alive and not lagging.",
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
                desc: 'Displays the full command menu organised by category with a quick description of each command.',
                usage: `${p}menu`,
                aliases: 'commands, list, cmds'
            },

            ai: {
                category: '🤖 AI Assistant',
                desc: `Chat with XLICON AI, powered by Groq (Llama 3.1) for free — no limits for normal use. The bot remembers your full conversation for up to 30 minutes of inactivity so follow-up questions work naturally.

How to get your FREE Groq key:
1. Go to https://console.groq.com
2. Sign up (no credit card needed)
3. Click API Keys and create one
4. Add GROQ_API_KEY to Railway environment variables
5. Redeploy — done!

Sub-commands:
- ${p}ai <question> — Ask anything (supports follow-ups)
- ${p}ai on — XLICON AI replies to EVERY message in this chat automatically
- ${p}ai off — Stop auto-reply (manual .ai <question> still works)
- ${p}aiclear — Wipe the conversation memory and start fresh

Works in personal chat and groups. In groups, only admins can toggle auto-reply mode.`,
                usage: `${p}ai Who is the richest man in the world?
${p}ai Tell me more about him
${p}ai on
${p}ai off
${p}aiclear`,
                aliases: 'ask, claude, llm, bot'
            },

            imagine: {
                category: '🤖 AI Assistant',
                desc: `Generate an AI image from any text description — completely free, no API key needed at all. Powered by Pollinations AI.

Just describe what you want to see in plain language. The more specific and descriptive your prompt, the better the result. Works in personal chat and groups.

Tips for great results:
- Be descriptive: "a realistic portrait of an African queen with golden jewellery, sunset lighting" is better than "african queen"
- Include style hints: "digital art", "photorealistic", "oil painting", "anime style"
- Mention lighting, mood, setting for richer images`,
                usage: `${p}imagine a golden sunset over Lagos waterfront
${p}imagine futuristic African city at night, neon lights
${p}imagine cute baby lion cub in tall grass, photorealistic
${p}imagine portrait of a Nigerian king, traditional attire, royal`,
                aliases: 'img, generate, draw, image, paint'
            },

            profile: {
                category: '👤 User Tools',
                desc: 'Downloads and sends the WhatsApp profile picture of any user. Target someone by replying to their message, mentioning them with @, or typing their phone number directly.',
                usage: `${p}profile @user
${p}profile 2348XXXXXXXXX
${p}profile  (reply to any message)`,
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

            anonread: {
                category: '👻 Privacy & Stealth',
                desc: `Toggles ghost mode. When ON, the bot never sends read receipts — so anyone who messages you only sees grey double ticks, never blue ticks. They cannot tell whether you have seen their message.

This is one-way: ghost mode hides YOUR read receipts from others. You can still see blue ticks when others read your messages normally.

Setting is saved to MongoDB and survives Railway restarts automatically.`,
                usage: `${p}anonread  (toggle ON)
${p}anonread  (toggle OFF — run again)`,
                aliases: 'ghostmode, ghost, readanon'
            },
            anonview: {
                category: '👻 Privacy & Stealth',
                desc: `Toggles silent status caching. When ON, every status update posted by your contacts is silently saved — the poster never receives a seen receipt from you.

Storage rules:
- Files 15MB or smaller: saved to MongoDB, survive restarts
- Files larger than 15MB: kept in memory only, cleared on restart

Use .statusdl to retrieve cached statuses on demand. Setting survives restarts.`,
                usage: `${p}anonview  (toggle ON)
${p}anonview  (toggle OFF)`,
                aliases: 'sv, statusview, viewstatus'
            },
            statusdl: {
                category: '👻 Privacy & Stealth',
                desc: `Downloads and sends you the cached statuses of a specific contact. Requires .anonview to be ON first so statuses are being cached as contacts post them.

Sub-commands:
- list — See all contacts who have cached statuses
- <number> — Get all statuses saved for that phone number sent to your DM
- clear — Delete all cached statuses from MongoDB`,
                usage: `${p}statusdl list
${p}statusdl 2348012345678
${p}statusdl clear`,
                aliases: 'getstatus, vstatus'
            },
            viewonce: {
                category: '👻 Privacy & Stealth',
                desc: "View-once photos and videos are saved automatically to your private DM the moment they arrive — no command needed, and no trace is left in the original chat. The sender has no idea it was saved. The manual command is a backup for testing in your own self-chat only.",
                usage: `(Fully automatic — no command needed)
${p}viewonce  (self-chat only, as backup)`,
                aliases: 'vo, once, reveal'
            },
            antidelete: {
                category: '👻 Privacy & Stealth',
                desc: `Toggles anti-delete monitoring. When ON, every message the bot receives is quietly saved to MongoDB. If anyone deletes their message — in any group or DM — the original content is immediately forwarded to your DM before it disappears forever.

Covers groups and private chats. Media filenames are recorded but the raw file cannot be recovered after WhatsApp deletes it from their servers. Setting survives restarts.`,
                usage: `${p}antidelete  (toggle ON)
${p}antidelete  (toggle OFF)`,
                aliases: 'ad, nodelete'
            },

            sticker: {
                category: '🎨 Media & Stickers',
                desc: 'Converts an image or video clip into a WhatsApp sticker. Reply to or send the image/video with this command. Optionally set a custom pack name and author by adding them after the command separated by a pipe (|).',
                usage: `${p}sticker  (reply to image or video)
${p}sticker MyPack|AuthorName  (reply to image)`,
                aliases: 's, take, stkr'
            },
            steal: {
                category: '🎨 Media & Stickers',
                desc: 'Re-packages an existing sticker under your own pack name and author tag. Reply to any sticker with this command.',
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
                desc: 'Converts any text into a WhatsApp voice note using text-to-speech. The bot sends it as an audio message.',
                usage: `${p}tts Good morning, how are you today?`,
                aliases: 'voice'
            },
            poll: {
                category: '🎨 Media & Stickers',
                desc: 'Creates a WhatsApp poll in the current chat. Separate the question from each option with a semicolon (;). You can add up to 12 options.',
                usage: `${p}poll Best colour?;Red;Blue;Green;Yellow`,
                aliases: 'none'
            },

            admins: {
                category: '👥 Group Admin',
                desc: "Lists all admins in the current group organised by role. Group owners are shown separately from regular admins. Your own name is marked with 👈 You and the bot's entry is marked with 🤖.",
                usage: `${p}admins`,
                aliases: 'adminlist, listadmins, groupadmins'
            },
            tagall: {
                category: '👥 Group Admin',
                desc: 'Mentions every member of the group in a single message, sending each one a notification. You can add an optional message above the mentions. Admin only.',
                usage: `${p}tagall
${p}tagall Please read the pinned message!`,
                aliases: 'everyone, all, mentionall'
            },
            kick: {
                category: '👥 Group Admin',
                desc: 'Removes a member from the group. You must be a group admin AND the bot must also be an admin. Target someone by replying to their message or mentioning them with @.',
                usage: `${p}kick @user
${p}kick  (reply to their message)`,
                aliases: 'remove, ban'
            },
            add: {
                category: '👥 Group Admin',
                desc: 'Adds a person to the group using their phone number. Both you and the bot must be group admins. If the person has privacy settings preventing them from being added, you will get a clear error message.',
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
                desc: 'Removes admin status from a group admin, returning them to a regular member. Both you and the bot must be admins.',
                usage: `${p}demote @user
${p}demote  (reply to their message)`,
                aliases: 'unadmin, removeadmin'
            },
            mute: {
                category: '👥 Group Admin',
                desc: 'Locks the group so that only admins can send messages. Regular members cannot chat until an admin runs .unmute. Admin only.',
                usage: `${p}mute`,
                aliases: 'close, lock'
            },
            unmute: {
                category: '👥 Group Admin',
                desc: 'Unlocks a muted group, restoring the ability for all members to send messages. Admin only.',
                usage: `${p}unmute`,
                aliases: 'open, unlock'
            },
            grouplink: {
                category: '👥 Group Admin',
                desc: 'Fetches the current group invite link. Use the revoke sub-command to generate a brand new link and permanently invalidate the old one.',
                usage: `${p}grouplink
${p}grouplink revoke`,
                aliases: 'invitelink, link, invite'
            },
            rules: {
                category: '👥 Group Admin',
                desc: 'Displays the group rules. Admins can set or update the rules at any time, or clear them entirely. Anyone can read the rules.',
                usage: `${p}rules
${p}rules set 1. Be respectful. 2. No spam.
${p}rules clear`,
                aliases: 'setrules, grouprules, rule'
            },
            welcome: {
                category: '👥 Group Admin',
                desc: `Manages the welcome and goodbye message system. When enabled, the bot automatically greets new members and says goodbye to leaving ones.

Variables for your message:
- {name} — member display name
- {group} — group name
- {count} — current member count
- {numjid} — phone number (for @mention)`,
                usage: `${p}welcome on
${p}welcome off
${p}welcome msg Welcome to {group}, {name}! 🎉
${p}welcome goodbye Goodbye {name}, we will miss you!
${p}welcome test`,
                aliases: 'setwelcome, goodbye, greet'
            },

            antispam: {
                category: '🛡️ Group Protection',
                desc: `Enables or disables spam protection. When ON, the bot monitors each non-admin member's message rate. Sending too many messages too quickly triggers automatic deletion and a warning. After ${wl} warnings the member is auto-kicked.

Thresholds are set by SPAM_MSG_LIMIT and SPAM_TIME_WINDOW on Railway.`,
                usage: `${p}antispam on
${p}antispam off`,
                aliases: 'as, spamprotect'
            },
            antilink: {
                category: '🛡️ Group Protection',
                desc: `Enables or disables link blocking. When ON, any URL posted by a non-admin is automatically deleted and the sender gets a warning. After ${wl} warnings they are auto-kicked.

Detects: http/https, wa.me, t.me, WhatsApp invites, bit.ly, tinyurl, YouTube, and more.`,
                usage: `${p}antilink on
${p}antilink off`,
                aliases: 'al, linkprotect, nolink'
            },
            filter: {
                category: '🛡️ Group Protection',
                desc: `Manages a blocked-word list. When a non-admin sends a message containing any filtered word, the message is deleted and the sender gets a warning. After ${wl} warnings they are auto-kicked.

Sub-commands:
- add <word> — Add a word to the filter
- remove <word> — Remove a word
- list — Show all filtered words
- clear — Remove all words`,
                usage: `${p}filter add badword
${p}filter remove badword
${p}filter list
${p}filter clear`,
                aliases: 'wordfilter, badword'
            },
            warn: {
                category: '🛡️ Group Protection',
                desc: `Issues a formal warning to a group member saved in MongoDB. After ${wl} warnings the member is automatically removed and their count is reset. You can add an optional reason. Cannot warn admins.`,
                usage: `${p}warn @user
${p}warn @user Posting inappropriate content`,
                aliases: 'warning'
            },
            warns: {
                category: '🛡️ Group Protection',
                desc: "Checks the warning count for a group member. Shows how many warnings they have, the limit, and the reason for each warning. Any member can check — not just admins.",
                usage: `${p}warns @user
${p}warns  (reply to their message)`,
                aliases: 'none'
            },
            clearwarns: {
                category: '🛡️ Group Protection',
                desc: 'Resets all warnings for a member back to zero. Gives them a clean slate. Admin only.',
                usage: `${p}clearwarns @user
${p}clearwarns  (reply to their message)`,
                aliases: 'resetwarn, unwarn, removewarn'
            },

            setowner: {
                category: '⚙️ Owner Only',
                desc: `Manages bot owner numbers directly from WhatsApp. Changes are saved to MongoDB and survive restarts. Only the current owner can use this.

Sub-commands:
- (no args) — Show current owner list
- add <number> — Add a new owner
- remove <number> — Remove an owner
- set <number> — Replace all owners with one number`,
                usage: `${p}setowner
${p}setowner add 2348012345678
${p}setowner remove 2348012345678
${p}setowner set 2348012345678`,
                aliases: 'owner, addowner, removeowner'
            },
            broadcast: {
                category: '⚙️ Owner Only',
                desc: 'Sends a message to every group the bot is in. You can broadcast plain text or reply to an image/video/text to broadcast that content. Use .broadcast list first to see all the groups.',
                usage: `${p}broadcast Hello everyone! 📢
${p}broadcast  (reply to any image or video)
${p}broadcast list`,
                aliases: 'bc, announce'
            },
            exec: {
                category: '⚙️ Owner Only',
                desc: 'Executes raw JavaScript code on the bot server and returns the result. Use with caution — gives full Node.js access.',
                usage: `${p}exec process.version`,
                aliases: '>'
            }
        };

        if (!args.length) {
            const categories = {};
            for (const [name, cmd] of Object.entries(commands)) {
                if (!categories[cmd.category]) categories[cmd.category] = [];
                categories[cmd.category].push({ name, cmd });
            }
            let text = `╭━━━━━━━━━━━━━━━━━━━━━━╮\n┃   📖 *XLICON COMMAND GUIDE*  ┃\n╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            text += `Type *${p}help <command>* for full details on any command.\n\n`;
            for (const [cat, cmds] of Object.entries(categories)) {
                text += `╭─── ${cat} ───\n`;
                for (const { name, cmd } of cmds) {
                    const firstLine = cmd.desc.replace(/\n[\s\S]*/,'').slice(0, 70);
                    text += `┃ *${p}${name}* — ${firstLine}\n`;
                }
                text += `╰──────────────────────────\n\n`;
            }
            text += `> 🔤 Prefix: *${p}*  |  Warn limit: *${wl} warns = auto-kick*`;
            return m.reply(text);
        }

        const query = args[0].toLowerCase().replace(/^[.\/!]/, '');
        const cmd = commands[query];
        if (!cmd) return m.reply(`❌ No help entry for *${p}${query}*\n\nUse *${p}help* to see all commands.`);

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
