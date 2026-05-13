module.exports = {
    name: 'alive',
    aliases: ['ping', 'status', 'speed', 'uptime'],
    description: 'Check bot status, speed and system info',
    async execute(sock, m) {
        const start = Date.now();
        const msg = await m.reply('⏳ Pinging...');
        const ping = Date.now() - start;
        const uptime = process.uptime();
        const hrs = Math.floor(uptime/3600);
        const mins = Math.floor((uptime%3600)/60);
        const secs = Math.floor(uptime%60);
        const mem = (process.memoryUsage().rss/1024/1024).toFixed(1);
        const heapUsed = (process.memoryUsage().heapUsed/1024/1024).toFixed(1);
        const heapTotal = (process.memoryUsage().heapTotal/1024/1024).toFixed(1);
        const prefix = global.BOT_PREFIX || '.';
        await sock.sendMessage(m.from, {
            text:
`╭━━━━━━━━━━━━━━━━━━━╮
┃   🤖 *XLICON-V2-MD*  ┃
╰━━━━━━━━━━━━━━━━━━━╯

✅ *Bot is ALIVE!*

⚡ *Ping:* ${ping}ms ${ping<200?'🟢 Fast':ping<500?'🟡 OK':'🔴 Slow'}
🕐 *Uptime:* ${hrs}h ${mins}m ${secs}s
💾 *RAM:* ${mem} MB
🧠 *Heap:* ${heapUsed}/${heapTotal} MB
🖥️ *Platform:* ${process.platform}
📦 *Node.js:* ${process.version}
🔤 *Prefix:* ${prefix}
👻 *Ghost Mode:* ${global.ANON_READ?'🟢 ON':'🔴 OFF'}

_I'm running at full speed! 🚀_`,
            edit: msg.key
        }).catch(async()=>{
            await sock.sendMessage(m.from, {
                text:`✅ *XLICON-V2-MD Alive!*\n⚡ Ping: ${ping}ms\n🕐 Uptime: ${hrs}h ${mins}m ${secs}s\n💾 RAM: ${mem} MB`
            });
        });
    }
};
