const roasts = [
    "You're the reason they put instructions on shampoo bottles. 🧴",
    "I'd agree with you but then we'd both be wrong. 😅",
    "You're like a cloud. When you disappear, it's a beautiful day. ☀️",
    "I'd explain it to you, but I left my crayons at home. 🖍️",
    "You're proof that even evolution makes mistakes. 🦕",
    "Your secrets are always safe with me — I never even listen when you tell me them. 🙉",
    "I'd insult you, but my parents told me not to trash things that are already garbage. 🗑️",
    "You're like a participation trophy — technically an achievement, but nobody's proud. 🏅",
    "You're not stupid; you just have bad luck thinking. 🧠",
    "If brains were petrol, you wouldn't have enough to power an ant's motorbike. 🐜",
    "You're the human equivalent of a participation ribbon. 🎗️",
    "I'd call you a tool but you'd have to be useful first. 🔧",
    "You're like Monday mornings — nobody is happy to see you. 📅",
    "Your family tree must be a cactus because everyone on it is a prick. 🌵",
    "You're so far behind in school they named a special class after you — HISTORY. 📚",
];
module.exports = {
    name: 'roast',
    aliases: ['burn', 'insult', 'roastme'],
    description: 'Get a fun roast for someone 😂',
    async execute(sock, m, args) {
        let target = '';
        if (m.mentionedJid?.length) target = `@${m.mentionedJid[0].split('@')[0]}`;
        else if (m.quoted) target = `@${(m.quoted.sender||m.quoted.key?.participant||m.sender).split('@')[0]}`;
        else if (args.length) target = args.join(' ');
        else target = m.pushName || 'You';
        const roast = roasts[Math.floor(Math.random()*roasts.length)];
        await sock.sendMessage(m.from, {
            text:`╭━━━━━━━━━━━━━━━━━━━╮\n┃   🔥 *ROASTED!* 🔥   ┃\n╰━━━━━━━━━━━━━━━━━━━╯\n\n${target} — ${roast}\n\n_No hard feelings, it's all fun! 😂_`,
            mentions: m.mentionedJid||[]
        });
    }
};
