module.exports={name:'menu',aliases:['commands','list','cmds'],description:'Show all available bot commands',
async execute(sock,m){
    const p=global.BOT_PREFIX||'.';
    const name=m.pushName||'User';
    const up=process.uptime();
    const upStr=Math.floor(up/3600)+'h '+Math.floor((up%3600)/60)+'m '+Math.floor(up%60)+'s';
    const mem=(process.memoryUsage().rss/1024/1024).toFixed(1);
    const now=new Date().toLocaleString('en-GB',{timeZone:process.env.TIME_ZONE||'Africa/Lagos'});
    const mode=m.isGroup?'📢 Group':'💬 Private';
    const ai=process.env.GROQ_API_KEY?'Groq/Llama 3 🟢':process.env.ANTHROPIC_API_KEY?'Claude 🟢':'❌ Not set';
    await m.reply(`╭━━━━━━━━━━━━━━━━━━━━━━╮
┃    🤖 *XLICON-V2-MD*     ┃
┃   _Your Smart Assistant_  ┃
╰━━━━━━━━━━━━━━━━━━━━━━╯

👋 Hey *${name}*!  📍 ${mode}
⏰ ${now}
🕐 Uptime: ${upStr}  💾 ${mem} MB

╭─── 📊 *STATUS & INFO* ───
┃ ${p}ping • ${p}alive — Bot status & speed
┃ ${p}uptime — Running time
┃ ${p}stats — Full bot analytics
┃ ${p}menu — This menu
┃ ${p}help <cmd> — Full command details
╰──────────────────────────

╭─── 🤖 *AI ASSISTANT* ─── [${ai}]
┃ ${p}ai <question> — Ask XLICON AI anything
┃ ${p}ai on/off — Toggle auto-reply mode
┃ ${p}aiclear — Reset conversation memory
┃ ${p}imagine <desc> — Generate AI image 🎨
┃ ${p}imagine anime: / realistic: / cartoon:
┃ ${p}translate <lang> <text> — Translate text
┃ ${p}summarize — Summarize a long message
┃ ${p}grammar — Fix grammar & spelling
┃ _Works in personal chat & groups_
╰──────────────────────────

╭─── 👻 *PRIVACY & STEALTH* ─
┃ ${p}anonread — Ghost mode (no blue ticks)
┃ ${p}anonview — Silently cache statuses
┃ ${p}statusdl list/number/clear — View statuses
┃ ${p}antidelete — Catch deleted messages
┃ ${p}viewonce — Auto-saves view-once media
┃ ${p}spy add/list/remove — Online status spy
┃ _View-once auto-saved to DM instantly_
╰──────────────────────────

╭─── 🔍 *SEARCH & INFO* ───
┃ ${p}crypto BTC — Live crypto price
┃ ${p}movie <title> — Movie/series info
┃ ${p}weather <city> — Live weather
┃ ${p}news [category] — BBC headlines
┃ ${p}sports [sport] — Live scores
┃ ${p}wiki <topic> — Wikipedia summary
┃ ${p}github <username> — GitHub profile
┃ ${p}lyrics Artist - Song — Song lyrics
┃ ${p}prayer <city> — Islamic prayer times
┃ ${p}dict <word> — Word definition
┃ ${p}currency 100 USD GHS — Exchange rates
╰──────────────────────────

╭─── 📖 *KNOWLEDGE* ───────
┃ ${p}bible John 3:16 — Bible verse (KJV)
┃ ${p}quran 2:255 — Quran verse + translation
┃ ${p}fact [category] — Random facts
┃ ${p}horoscope <sign> — Daily horoscope
╰──────────────────────────

╭─── 🎨 *MEDIA & STICKERS* ─
┃ ${p}sticker — Image/video → sticker
┃ ${p}steal — Re-tag any sticker
┃ ${p}toimg — Sticker → image
┃ ${p}watermark <text> — Add watermark to image
┃ ${p}resize 800x600 — Resize an image
┃ ${p}document — Get media file info
┃ ${p}tts — Text to voice note
┃ ${p}qr <text> — Generate QR code
┃ ${p}meme — Random meme from Reddit
┃ ${p}shorten <url> — Shorten any URL
╰──────────────────────────

╭─── 🎮 *GAMES & FUN* ─────
┃ ${p}quiz [category] — Trivia quiz
┃ ${p}tictactoe @user — Challenge someone
┃ ${p}hangman — Word guessing game
┃ ${p}riddle — Riddle to solve
┃ ${p}8ball <question> — Magic 8 ball
┃ ${p}flip — Coin toss
┃ ${p}dice [n] — Roll dice
┃ ${p}rps rock|paper|scissors
┃ ${p}choose A, B, C — Random pick
┃ ${p}truth • ${p}dare • ${p}wyr
┃ ${p}joke • ${p}quote • ${p}fact
┃ ${p}roast @user — Quick roast 🔥
┃ ${p}airoast @user — AI-powered roast 🤖🔥
┃ ${p}ship @u1 @u2 — Love compatibility %
┃ ${p}horoscope <sign> — Daily star reading
╰──────────────────────────

╭─── ⏰ *PRODUCTIVITY* ─────
┃ ${p}todo add/list/done/remove — Task list
┃ ${p}note add/get/list/delete — Save notes
┃ ${p}remind 30m Task — Set reminder
┃ ${p}schedule 2h Message — Send later
┃ ${p}calc 5*(3+2) — Calculator
┃ ${p}poll Q;Opt1;Opt2 — Create poll
┃ ${p}contact @user — Generate vCard
┃ ${p}shorten <url> — Short link
╰──────────────────────────

╭─── 👥 *GROUP ADMIN* ─────
┃ 🔐 _Admin-only commands_
┃ ${p}admins — List all admins
┃ ${p}tagall [msg] — Mention everyone
┃ ${p}kick • ${p}add • ${p}promote • ${p}demote
┃ ${p}mute / ${p}unmute — Lock/unlock chat
┃ ${p}grouplink [revoke] — Invite link
┃ ${p}rules — Show/set group rules
┃ ${p}welcome on/off — Toggle greet message
┃ ${p}report @user — Report to admins
┃ ${p}note add/list — Group notes
┃ ${p}birthday set DD/MM — Track birthdays
┃ ${p}leaderboard [week/month] — Top members
┃ ${p}poll Q;A;B;C — Create group poll
╰──────────────────────────

╭─── 🛡️ *GROUP PROTECTION* ─
┃ 🔐 _Admin-only commands_
┃ ${p}antispam on/off — Block spam
┃ ${p}antilink on/off — Block links
┃ ${p}antiforward on/off — Block forwards
┃ ${p}antifake on/off — Block no-photo accounts
┃ ${p}lock <type> on/off — Lock message types
┃ ${p}lock list — See active locks
┃ ${p}slowmode <secs> / off — Message cooldown
┃ ${p}filter add/list/remove/clear — Word filter
┃ ${p}warn • ${p}warns • ${p}clearwarns
┃ ⚠️ ${process.env.WARN_LIMIT||3} warns = auto-kick
╰──────────────────────────

╭─── 🤖 *AUTO FEATURES* ───
┃ ${p}autoreply add keyword|reply
┃ ${p}autoreply list / remove / clear
┃ ${p}autopost add HH:MM <msg> — Daily post
┃ ${p}autopost list / remove / clear
╰──────────────────────────

╭─── ⚙️ *OWNER ONLY* ───────
┃ ${p}setowner — Manage owners
┃ ${p}blacklist add/remove/list — Global ban
┃ ${p}maintenance on/off — Bot maintenance
┃ ${p}prefix <new> — Change prefix
┃ ${p}backup — Export all settings to DM
┃ ${p}stats — Full bot analytics
┃ ${p}broadcast <msg> — Send to all groups
┃ ${p}spy add/list/remove — Online tracking
╰──────────────────────────

> 🔤 Prefix: *${p}*  |  Use *${p}help <cmd>* for full details
> 📰 News: world tech sport biz health africa
> ⚽ Sports: soccer nba nfl cricket
> 🧠 Quiz: general film music science computers math sports geography history animals`);
}};