module.exports = {
    name: 'poll',
    aliases: ['vote', 'survey'],
    description: 'Create a poll in the chat',
    async execute(sock, m, args) {
        const full = args.join(' ').trim();
        if (!full.includes(';')) {
            return m.reply(
`❌ Usage: _.poll Question;Option1;Option2;Option3_

Example:
_.poll Favourite food?;Pizza;Burger;Sushi;Rice_

You can have 2-12 options.`
            );
        }
        const parts = full.split(';').map(p=>p.trim()).filter(Boolean);
        const [name, ...options] = parts;
        if (!name) return m.reply('❌ Provide a question!');
        if (options.length < 2) return m.reply('❌ Provide at least 2 options separated by ;');
        if (options.length > 12) return m.reply('❌ Maximum 12 options allowed.');

        await sock.sendMessage(m.from, {
            poll: { name, values: options, selectableCount: 1 }
        }, { quoted: m });
        await m.react('✅');
    }
};
