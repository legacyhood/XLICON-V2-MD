module.exports = {
    name: 'menu',
    aliases: ['commands', 'list', 'cmds', 'help'],
    description: 'Show all available bot commands',
    async execute(sock, m) {
        const p = global.BOT_PREFIX || '.';
        const name = m.pushName || 'User';
        const up = process.uptime();
        const uptimeStr = `${Math.floor(up/3600)}h ${Math.floor((up%3600)/60)}m ${Math.floor(up%60)}s`;
        const mem = (process.memoryUsage().rss/1024/1024).toFixed(1);
        const now = new Date().toLocaleString('en-GB',{timeZone:process.env.TIME_ZONE||'Africa/Lagos'});
        const mode = m.isGroup ? '📢 Group' : '💬 Private';

        await m.reply(
`╭━━━━━━━━━━━━━━━━━━━━━━╮
┃    🤖 *XLICON-V2-MD*     ┃
┃   _Your Smart Assistant_  ┃
╰━━━━━━━━━━━━━━━━━━━━━━╯

👋 Hey *${name}*! 
📍 *Mode:* ${mode}
⏰ *Time:* ${now}
🕐 *Uptime:* ${uptimeStr}
💾 *RAM:* ${mem} MB

╭─── 📊 *STATUS & INFO* ───
┃ ${p}alive • ${p}ping — Bot status & speed
┃ ${p}uptime — Running time
┃ ${p}menu — This menu
╰──────────────────────────

╭─── 👤 *USER TOOLS* ──────
┃ ${p}profile @user — Download profile pic
┃ ${p}info @user — Full user info
┃ ${p}info group — Group stats
┃ ${p}groupstats — Detailed group info
╰──────────────────────────

╭─── 👻 *PRIVACY & STEALTH* ─
┃ ${p}anonread — Ghost mode (no blue ticks)
┃ ${p}anonview — View statuses anonymously
┃ ${p}viewonce — Reveal view-once (sent to DM)
┃ ${p}antidelete — Catch deleted messages
╰──────────────────────────

╭─── 🎨 *MEDIA & STICKERS* ─
┃ ${p}sticker — Image/video → sticker
┃ ${p}steal — Steal & re-tag sticker
┃ ${p}toimg — Sticker → image
┃ ${p}tts — Text to voice note
┃ ${p}qr <text> — Generate QR code
╰──────────────────────────

╭─── 🌍 *SEARCH & NEWS* ───
┃ ${p}weather <city> — Live weather
┃ ${p}news [category] — BBC headlines
┃ ${p}sports [sport] — Live scores
┃ ${p}wiki <topic> — Wikipedia summary
┃ ${p}dict <word> — Word definition
┃ ${p}currency 100 USD GHS — Forex
╰──────────────────────────

╭─── 🎲 *FUN & GAMES* ─────
┃ ${p}8ball <question> — Magic 8 ball
┃ ${p}flip — Coin toss
┃ ${p}dice [n] — Roll dice
┃ ${p}rps rock|paper|scissors
┃ ${p}choose A, B, C — Pick random
┃ ${p}truth — Truth question
┃ ${p}dare — Dare challenge
┃ ${p}wyr — Would you rather
┃ ${p}joke — Random joke
┃ ${p}quote — Daily inspiration
┃ ${p}roast @user — Fun roast 🔥
┃ ${p}ship @user1 @user2 — Love %
╰──────────────────────────

╭─── ⏰ *UTILITIES* ────────
┃ ${p}calc 5*(3+2) — Calculator
┃ ${p}remind 30m Task — Reminder
┃ ${p}schedule 2h Message — Send later
┃ ${p}poll Q;Opt1;Opt2 — Create poll
╰──────────────────────────

╭─── 👥 *GROUP ADMIN* ─────
┃ ${p}tagall [msg] — Mention everyone
┃ ${p}kick @user — Remove member
┃ ${p}add 233XX — Add by number
┃ ${p}promote @user — Make admin
┃ ${p}demote @user — Remove admin
┃ ${p}mute / ${p}unmute — Lock/unlock
┃ ${p}grouplink [revoke] — Invite link
┃ ${p}rules — Show group rules
┃ ${p}rules set ... — Set rules
╰──────────────────────────

╭─── 🛡️ *GROUP PROTECTION* ─
┃ ${p}antispam on/off — Block spam
┃ ${p}antilink on/off — Block links
┃ ${p}filter add <word> — Block word
┃ ${p}filter list/remove/clear
┃ ${p}warn @user [reason] — Warn
┃ ${p}warns @user — Check warns
┃ ${p}clearwarns @user — Reset warns
┃ ⚠️ ${process.env.WARN_LIMIT||3} warns = auto-kick
╰──────────────────────────

╭─── 👋 *WELCOME SYSTEM* ──
┃ ${p}welcome on/off — Toggle greet
┃ ${p}welcome msg <text> — Custom msg
┃ ${p}welcome goodbye <text> — Bye msg
┃ ${p}welcome test — Preview
╰──────────────────────────

╭─── 🤖 *AUTO FEATURES* ───
┃ ${p}autoreply add hi|Hello! — Add reply
┃ ${p}autoreply list/remove/clear
╰──────────────────────────

╭─── ⚙️ *OWNER ONLY* ───────
┃ ${p}broadcast <msg> — All groups
┃ ${p}anonread — Ghost mode toggle
╰──────────────────────────

> 🔤 Prefix: *${p}* | Commands are hidden after use
> 📰 News: world tech sport biz health africa
> ⚽ Sports: soccer nba nfl cricket`
        );
    }
};
