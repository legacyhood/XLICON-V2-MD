module.exports = {
    name: 'ship',
    aliases: ['love', 'lovemeter', 'compatibility', 'couple'],
    description: 'Check love compatibility between two people or names',
    async execute(sock, m, args) {
        let name1 = '', name2 = '';
        if (m.mentionedJid?.length >= 2) {
            name1 = '@' + m.mentionedJid[0].split('@')[0];
            name2 = '@' + m.mentionedJid[1].split('@')[0];
        } else if (m.mentionedJid?.length === 1) {
            name1 = m.pushName || '@' + m.sender.split('@')[0];
            name2 = '@' + m.mentionedJid[0].split('@')[0];
        } else {
            const split = args.join(' ').split(/[&+,]|and/i).map(s=>s.trim()).filter(Boolean);
            if (split.length < 2) return m.reply('❌ Usage:\n_.ship @user1 @user2_\n_.ship Name1 & Name2_');
            [name1, name2] = split;
        }
        // Deterministic but seemingly random score based on names
        const seed = (name1+name2).split('').reduce((a,c)=>a+c.charCodeAt(0),0);
        const score = ((seed * 7919 + 42) % 101 + 101) % 101; // 0-100
        let emoji, verdict;
        if      (score >= 90) { emoji = '💞💞💞'; verdict = 'PERFECT MATCH! You were made for each other! 😍'; }
        else if (score >= 75) { emoji = '❤️❤️'; verdict = 'Great chemistry! This could be something special! 💕'; }
        else if (score >= 60) { emoji = '💛💛'; verdict = 'Good compatibility! Worth exploring! 😊'; }
        else if (score >= 40) { emoji = '🧡'; verdict = 'It\'s complicated, but love finds a way! 🤞'; }
        else if (score >= 20) { emoji = '💔'; verdict = 'Might be a rocky road ahead... 😅'; }
        else                  { emoji = '🙈'; verdict = 'Opposites attract... maybe? 😂'; }
        const bar = '❤️'.repeat(Math.floor(score/10)) + '🖤'.repeat(10-Math.floor(score/10));
        await m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃    💕 *LOVE METER*   ┃
╰━━━━━━━━━━━━━━━━━━━╯

👤 *${name1}*
  ${emoji}
👤 *${name2}*

${bar}

💯 *Compatibility: ${score}%*
💬 ${verdict}`
        , {mentions: m.mentionedJid||[]});
    }
};
