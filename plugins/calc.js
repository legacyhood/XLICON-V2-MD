module.exports = {
    name: 'calc',
    aliases: ['math', 'calculate', '='],
    description: 'Calculate any math expression',
    async execute(sock, m, args) {
        const expr = args.join(' ').trim();
        if (!expr) return m.reply('❌ Usage: _.calc 5 * (3 + 2)_');
        try {
            // Safe math evaluation — only allow numbers and operators
            const safe = expr.replace(/[^0-9+\-*/().%^ ]/g, '');
            if (!safe) return m.reply('❌ Invalid expression. Only numbers and operators (+, -, *, /, %, ()).');
            // Use Function constructor for safe eval
            // eslint-disable-next-line no-new-func
            const result = Function(`"use strict"; return (${safe.replace(/\^/g,'**')})`)();
            if (typeof result !== 'number' || !isFinite(result)) return m.reply('❌ Result is not a valid number.');
            await m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃   🧮 *CALCULATOR*   ┃
╰━━━━━━━━━━━━━━━━━━━╯

📥 *Input:* \`${expr}\`
📤 *Result:* *${result.toLocaleString()}*`
            );
        } catch(e) {
            await m.reply(`❌ Invalid expression: \`${expr}\``);
        }
    }
};
