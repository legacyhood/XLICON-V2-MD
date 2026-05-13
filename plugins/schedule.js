const pendingJobs = new Map();
function parseTime(str) {
    const m = str.match(/^(\d+)(s|m|h|d)$/i);
    if (!m) return null;
    const n = parseInt(m[1]); const u = m[2].toLowerCase();
    const mul = {s:1000,m:60000,h:3600000,d:86400000};
    return n * mul[u];
}

module.exports = {
    name: 'schedule',
    aliases: ['sched', 'sendlater', 'delay'],
    description: 'Schedule a message to be sent later in this chat',
    async execute(sock, m, args) {
        if (!args.length) return m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃  📅 *SCHEDULER*     ┃
╰━━━━━━━━━━━━━━━━━━━╯

Usage:
_.schedule 30m Hello everyone!_
_.schedule 2h Meeting starts now!_
_.schedule 1d Happy birthday! 🎂_

Units: s m h d (max 7 days)`
        );
        const timeStr = args[0];
        const ms = parseTime(timeStr);
        if (!ms || ms>7*24*3600000) return m.reply('❌ Invalid time. Max 7 days.\nExamples: _30m_, _2h_, _1d_');
        const message = args.slice(1).join(' ').trim();
        if (!message) return m.reply('❌ Include a message to send!\n_.schedule 30m Your message here_');
        const id = `${m.from}_${Date.now()}`;
        const eta = new Date(Date.now()+ms).toLocaleString('en-GB');
        pendingJobs.set(id, true);
        await m.reply(`✅ *Message scheduled!*\n\n📝 "${message.slice(0,60)}${message.length>60?'...':''}"\n⏰ Will send in *${timeStr}*\n📅 At: ${eta}`);
        setTimeout(async()=>{
            if (!pendingJobs.has(id)) return;
            pendingJobs.delete(id);
            await sock.sendMessage(m.from, { text:`📅 *Scheduled Message*\n\n${message}` }).catch(console.error);
        }, ms);
    }
};
