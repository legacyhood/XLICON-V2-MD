const answers = [
    '✅ It is certain.','✅ It is decidedly so.','✅ Without a doubt.','✅ Yes, definitely.','✅ You may rely on it.',
    '✅ As I see it, yes.','✅ Most likely.','✅ Outlook good.','✅ Yes.','✅ Signs point to yes.',
    '🤔 Reply hazy, try again.','🤔 Ask again later.','🤔 Better not tell you now.','🤔 Cannot predict now.','🤔 Concentrate and ask again.',
    '❌ Don\'t count on it.','❌ My reply is no.','❌ My sources say no.','❌ Outlook not so good.','❌ Very doubtful.'
];
module.exports = {
    name: '8ball',
    aliases: ['8b', 'magic8', 'fortune', 'predict'],
    description: 'Ask the magic 8 ball a yes/no question',
    async execute(sock, m, args) {
        if (!args.length) return m.reply('❌ Ask a question!\n\n_.8ball Will I be rich?_');
        const q = args.join(' ');
        const ans = answers[Math.floor(Math.random() * answers.length)];
        await m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃  🎱 *MAGIC 8 BALL*  ┃
╰━━━━━━━━━━━━━━━━━━━╯

❓ *${q}*

🔮 *${ans}*`
        );
    }
};
