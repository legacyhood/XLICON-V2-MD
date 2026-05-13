const activeReminders = new Map();
function parseTime(str) {
    const m = str.match(/^(\d+)(s|m|h|d)$/i);
    if (!m) return null;
    const n = parseInt(m[1]); const u = m[2].toLowerCase();
    if (u==='s') return n*1000;
    if (u==='m') return n*60000;
    if (u==='h') return n*3600000;
    if (u==='d') return n*86400000;
    return null;
}
module.exports = {
    name: 'remind',
    aliases: ['reminder', 'remindme', 'timer', 'alarm'],
    description: 'Set a reminder. _.remind 30m Buy groceries_',
    async execute(sock, m, args) {
        if (!args.length) return m.reply('❌ Usage:\n_.remind 30m Buy groceries_\n_.remind 2h Call doctor_\n_.remind 1d Happy birthday check_\n\nUnits: s=seconds, m=minutes, h=hours, d=days');
        const timeStr = args[0];
        const ms = parseTime(timeStr);
        if (!ms) return m.reply('❌ Invalid time format.\nExamples: _30m_, _2h_, _1d_, _90s_');
        if (ms > 7*24*60*60*1000) return m.reply('❌ Max reminder time is 7 days.');
        const task = args.slice(1).join(' ').trim() || 'Your reminder!';
        const id = Date.now().toString(36);
        activeReminders.set(id, true);
        const eta = new Date(Date.now()+ms).toLocaleString('en-GB');
        await m.reply(`⏰ *Reminder set!*\n\n📌 *Task:* ${task}\n🕐 *In:* ${timeStr}\n📅 *At:* ${eta}\n🆔 ID: \`${id}\``);
        setTimeout(async ()=>{
            if (!activeReminders.has(id)) return;
            activeReminders.delete(id);
            await sock.sendMessage(m.from, {
                text: `╭━━━━━━━━━━━━━━━━━━━╮\n┃   ⏰ *REMINDER!*     ┃\n╰━━━━━━━━━━━━━━━━━━━╯\n\n👤 @${m.sender.split('@')[0]}\n📌 *${task}*\n\n_Time's up!_ 🔔`,
                mentions: [m.sender]
            });
        }, ms);
    }
};
