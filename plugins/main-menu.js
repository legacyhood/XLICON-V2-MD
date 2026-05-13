const os = require('os');

module.exports = {
    name: 'menu',
    aliases: ['commands', 'list', 'cmds'],
    description: 'Show all available bot commands',

    async execute(sock, m) {
        const prefix = global.BOT_PREFIX || '.';
        const name = m.pushName || 'User';
        const uptime = process.uptime();
        const hrs  = Math.floor(uptime / 3600);
        const mins = Math.floor((uptime % 3600) / 60);
        const secs = Math.floor(uptime % 60);
        const uptimeStr = `${hrs}h ${mins}m ${secs}s`;
        const mem = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
        const now = new Date().toLocaleString('en-GB', { timeZone: process.env.TIME_ZONE || 'Africa/Lagos' });
        const mode = m.isGroup ? '📢 Group' : '💬 Private';

        const menu =
`╭━━━━━━━━━━━━━━━━━━━━━╮
┃    🤖 *XLICON-V2-MD*    ┃
╰━━━━━━━━━━━━━━━━━━━━━╯

👋 Hey *${name}*!
📍 Mode: *${mode}*
⏰ ${now}
🕐 Uptime: *${uptimeStr}*
💾 RAM: *${mem} MB*

╭─── 📊 *GENERAL* ──────
┃ ${prefix}ping — Bot speed & stats
┃ ${prefix}alive — Bot status
┃ ${prefix}uptime — Running time
┃ ${prefix}menu — This menu
┃ ${prefix}creator — Bot creator info
╰───────────────────────

╭─── 👤 *USER TOOLS* ────
┃ ${prefix}profile @user — Download profile pic
┃ ${prefix}info @user — User/group info
┃ ${prefix}anonread — Toggle ghost mode (no blue ticks)
╰───────────────────────

╭─── 👻 *PRIVACY & STATUS* ─
┃ ${prefix}anonview — View statuses anonymously
┃ ${prefix}antidelete — Catch deleted messages
╰───────────────────────

╭─── 🎨 *MEDIA & FUN* ───
┃ ${prefix}sticker — Image/video to sticker
┃ ${prefix}steal — Steal & re-tag a sticker
┃ ${prefix}toimg — Sticker to image
┃ ${prefix}tts — Text to voice
┃ ${prefix}poll — Create a poll
┃ ${prefix}viewonce — View once media
┃ ${prefix}couplepp — Couple profile pics
╰───────────────────────

╭─── 👥 *GROUP TOOLS* ───
┃ ${prefix}tagall — Tag all members
┃ ${prefix}tagme — Tag yourself
┃ ${prefix}mention — Mention someone
┃ ${prefix}kick @user — Remove from group
┃ ${prefix}add 233XX — Add by number
┃ ${prefix}promote @user — Make admin
┃ ${prefix}demote @user — Remove admin
┃ ${prefix}mute — Lock group (admins only)
┃ ${prefix}unmute — Unlock group
┃ ${prefix}grouplink — Get invite link
┃ ${prefix}grouplink revoke — Reset link
╰───────────────────────

╭─── ⚙️ *OWNER ONLY* ────
┃ ${prefix}broadcast — Send to all groups
┃ ${prefix}exec — Run shell/JS code
┃ ${prefix}logger — Toggle message log
┃ ${prefix}autoreact — Auto react toggle
╰───────────────────────

> Prefix: *${prefix}* • Works in DMs & Groups`;

        await m.reply(menu);
    }
};
