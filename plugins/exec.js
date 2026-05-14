const util = require('util');
const axios = require('axios');

const sentOnce = new Set();

module.exports = {
    name: 'exec',
    aliases: ['>'],
    description: 'Execute JavaScript code (Owner only)',

    async execute(sock, m, args) {
        if (!m.isOwner) return m.reply('❌ Owner only.');
        const code = args.join(' ');
        if (!code) return m.reply('Usage: .exec <javascript code>\nOr: > <code>');
        if (sentOnce.has(m.id)) return;
        sentOnce.add(m.id);
        try {
            const sandbox = { sock, m, axios, util, console };
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
            let result;
            if (code.includes('await') || code.includes('\n')) {
                result = await new AsyncFunction(...Object.keys(sandbox), code)(...Object.values(sandbox));
            } else {
                result = await new Function(...Object.keys(sandbox), 'return ' + code)(...Object.values(sandbox));
            }
            const output = result === undefined ? 'undefined'
                : typeof result === 'string' ? result
                : util.inspect(result, { depth: 2 });
            await m.send('\u2611\ufe0f *Exec Result:*\n```\n' + output.slice(0, 4000) + '\n```');
        } catch (err) {
            await m.send('\u274c Error:\n```\n' + err.message + '\n```');
        }
        setTimeout(() => sentOnce.delete(m.id), 5000);
    },

    async onMessage(sock, m) {
        if (!m.text || m.isBot) return;
        if (!m.text.startsWith('>')) return;
        if (sentOnce.has(m.id)) return;
        sentOnce.add(m.id);
        const isOwner = m.isOwner;
        if (!isOwner) return;

        const code = m.text.slice(1).trim();

        try {
            const sandbox = { sock, m, axios, util, console };
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
            let result;
            if (code.includes('await') || code.includes('\n')) {
                result = await new AsyncFunction(...Object.keys(sandbox), code)(...Object.values(sandbox));
            } else {
                result = await new Function(...Object.keys(sandbox), 'return ' + code)(...Object.values(sandbox));
            }
            const output = result === undefined ? 'undefined'
                : typeof result === 'string' ? result
                : util.inspect(result, { depth: 2 });
            await m.send('\u2611\ufe0f *Exec Result:*\n```\n' + output.slice(0, 4000) + '\n```');
        } catch (err) {
            await m.send('\u274c Error:\n```\n' + err.message + '\n```');
        }

        setTimeout(() => sentOnce.delete(m.id), 5000);
    }
};
