module.exports = {
    name: 'stats',
    aliases: ['botstats', 'analytics', 'dashboard'],
    description: 'Show full bot statistics — messages, commands, active chats, uptime',

    async execute(sock, m) {
        const up = process.uptime();
        const uptimeStr = Math.floor(up / 3600) + 'h ' + Math.floor((up % 3600) / 60) + 'm ' + Math.floor(up % 60) + 's';
        const mem = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
        await m.react('⏳');

        try {
            // Use the shared singleton — avoids Atlas connection limit errors
            const db = global.getMongoDb ? await global.getMongoDb() : null;

            let totalMsgs = 0, totalGroups = 0, totalUsers = 0, totalNotes = 0, totalAiChats = 0;
            if (db) {
                [totalMsgs, totalGroups, totalUsers, totalNotes, totalAiChats] = await Promise.all([
                    db.collection('msg_counts').aggregate([{ $group: { _id: null, total: { $sum: '$count' } } }]).toArray().then(r => r[0]?.total || 0),
                    db.collection('msg_counts').distinct('group').then(r => r.length),
                    db.collection('msg_counts').distinct('senderNum').then(r => r.length),
                    db.collection('notes').countDocuments(),
                    db.collection('aichat_settings').countDocuments({ enabled: true })
                ]);
            }

            const aiProvider = process.env.GROQ_API_KEY ? 'Groq/Llama 3 🟢'
                : process.env.ANTHROPIC_API_KEY ? 'Claude 🟢'
                : 'Not set ❌';

            await m.reply(
`╭━━━ 📊 BOT STATISTICS ━━━╮

⏱️ Uptime: ${uptimeStr}
💾 RAM: ${mem} MB
🤖 AI Provider: ${aiProvider}

📬 Total Messages Tracked: ${totalMsgs.toLocaleString()}
👥 Active Groups: ${totalGroups}
👤 Unique Users: ${totalUsers}
📝 Saved Notes: ${totalNotes}
🤖 AI Auto-Chat Chats: ${totalAiChats}

🔌 MongoDB: ${db ? '✅ Connected' : '❌ Disconnected'}
🟢 Status: Online

> .leaderboard — see top members in a group`
            );
            await m.react('📊');
        } catch (e) {
            await m.react('❌');
            await m.reply('❌ Error fetching stats: ' + e.message);
        }
    }
};
