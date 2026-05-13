const os = require('os');

module.exports = {
    name: 'ping',
    aliases: ['speed', 'latency', 'status'],
    description: 'Check bot response speed and system stats',

    async execute(sock, m) {
        const start = Date.now();
        await m.reply('🏓 Pinging...');
        const latency = Date.now() - start;

        const uptime = process.uptime();
        const hrs  = Math.floor(uptime / 3600);
        const mins = Math.floor((uptime % 3600) / 60);
        const secs = Math.floor(uptime % 60);
        const uptimeStr = `${hrs}h ${mins}m ${secs}s`;

        const memUsed  = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
        const memTotal = (os.totalmem() / 1024 / 1024).toFixed(0);
        const cpuLoad  = os.loadavg()[0].toFixed(2);

        const bar = (pct) => {
            const filled = Math.round(pct / 10);
            return '█'.repeat(filled) + '░'.repeat(10 - filled);
        };
        const memPct = ((process.memoryUsage().rss / os.totalmem()) * 100);

        const msg =
`╭━━━━━━━━━━━━━━━━━━━╮
┃   🤖 *BOT STATUS*   ┃
╰━━━━━━━━━━━━━━━━━━━╯

🏓 *Ping:* ${latency} ms
⏰ *Uptime:* ${uptimeStr}

📊 *Memory*
  ${bar(memPct)} ${memPct.toFixed(1)}%
  Used: ${memUsed} MB / ${memTotal} MB

⚙️ *CPU Load:* ${cpuLoad}
🖥️ *Platform:* ${os.platform()} ${os.arch()}
📦 *Node.js:* ${process.version}

✅ *Bot is online and running!*`;

        await m.reply(msg);
    }
};
