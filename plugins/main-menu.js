const os = require('os');

module.exports = {
    name: 'menu',
    aliases: ['help', 'commands', 'list'],
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

        const menuText =
`╭━━━━━━━━━━━━━━━━━━━━╮
┃   🤖 *XLICON-V2-MD*   ┃
╰━━━━━━━━━━━━━━━━━━━━╯

👋 Hello *${name}*!
⏰ ${now}
🕐 Uptime: *${uptimeStr}*
💾 Memory: *${mem} MB*

╭─── 📋 *GENERAL* ────
┃ ${prefix}ping — Bot speed & stats
┃ ${prefix}alive — Bot status check
┃ ${prefix}uptime — How long running
┃ ${prefix}menu — This menu
┃ ${prefix}creator — Bot info
╰─────────────────────

╭─── 🎭 *FUN & TOOLS* ──
┃ ${prefix}sticker — Make sticker
┃ ${prefix}tts — Text to speech
┃ ${prefix}poll — Create a poll
┃ ${prefix}viewonce — View once media
┃ ${prefix}autoreact — Auto reactions
╰─────────────────────

╭─── 👥 *GROUP TOOLS* ──
┃ ${prefix}tagall — Tag all members
┃ ${prefix}tagme — Tag yourself
┃ ${prefix}couplepp — Couple profile pic
┃ ${prefix}mention — Mention someone
╰─────────────────────

╭─── ⚙️ *OWNER ONLY* ───
┃ ${prefix}exec — Run shell command
┃ ${prefix}logger — Toggle message log
╰─────────────────────

> Prefix: *${prefix}*  |  Commands: *17*`;

        await m.reply(menuText);
    }
};
