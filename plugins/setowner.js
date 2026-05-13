const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

function readConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } catch (_) {}
    return {};
}

function saveConfig(cfg) {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
    } catch (e) {
        console.error('[setowner] Could not save config.json:', e.message);
    }
}

function toJid(num) {
    const clean = num.replace(/\D/g, '');
    return `${clean}@s.whatsapp.net`;
}

function isCurrentOwner(m) {
    const owners = global.owners || [];
    const senderNum = (m.sender || '').split('@')[0].replace(/:\d+$/, '');
    return owners.some(o => {
        const ownerNum = o.split('@')[0].replace(/:\d+$/, '');
        return senderNum === ownerNum;
    });
}

module.exports = {
    name: 'setowner',
    aliases: ['owner', 'addowner', 'removeowner'],
    description: 'Manage bot owner numbers (owner only)',

    async execute(sock, m, args) {
        if (!isCurrentOwner(m)) {
            return m.reply('❌ This command is for the current owner only.');
        }

        const subCmd = (args[0] || '').toLowerCase();
        const input  = args[1] || '';

        // ── .setowner  (no args) — show current owners ────────────────────
        if (!subCmd) {
            const owners = global.owners || [];
            const list = owners.length
                ? owners.map((o, i) => `  ${i + 1}. +${o.split('@')[0]}`).join('\n')
                : '  (none)';
            return m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃   ⚙️ *BOT OWNERS*    ┃
╰━━━━━━━━━━━━━━━━━━━╯

👑 *Current owners:*
${list}

📖 *Usage:*
  .setowner add <number>
  .setowner remove <number>
  .setowner set <number>

_Numbers should include country code (e.g. 2348012345678)_`
            );
        }

        // ── .setowner add <number> ────────────────────────────────────────
        if (subCmd === 'add') {
            if (!input) return m.reply('❌ Provide a number. Example: .setowner add 2348012345678');
            const jid = toJid(input);
            const owners = global.owners || [];
            if (owners.includes(jid)) return m.reply(`⚠️ +${input.replace(/\D/g,'')} is already an owner.`);
            owners.push(jid);
            global.owners = owners;
            const cfg = readConfig();
            cfg.owners = owners;
            saveConfig(cfg);
            return m.reply(`✅ *+${input.replace(/\D/g,'')}* has been added as owner.\n\n_Changes saved — survives restarts._`);
        }

        // ── .setowner remove <number> ─────────────────────────────────────
        if (subCmd === 'remove') {
            if (!input) return m.reply('❌ Provide a number. Example: .setowner remove 2348012345678');
            const jid = toJid(input);
            const owners = global.owners || [];
            const idx = owners.findIndex(o => o.split('@')[0].replace(/:\d+$/,'') === jid.split('@')[0]);
            if (idx === -1) return m.reply(`⚠️ +${input.replace(/\D/g,'')} is not in the owners list.`);
            if (owners.length === 1) return m.reply('❌ Cannot remove the last owner — you would lock yourself out!');
            owners.splice(idx, 1);
            global.owners = owners;
            const cfg = readConfig();
            cfg.owners = owners;
            saveConfig(cfg);
            return m.reply(`✅ *+${input.replace(/\D/g,'')}* has been removed from owners.\n\n_Changes saved._`);
        }

        // ── .setowner set <number> — replace all with one number ──────────
        if (subCmd === 'set') {
            if (!input) return m.reply('❌ Provide a number. Example: .setowner set 2348012345678');
            const jid = toJid(input);
            global.owners = [jid];
            const cfg = readConfig();
            cfg.owners = [jid];
            saveConfig(cfg);
            return m.reply(`✅ Owner set to *+${input.replace(/\D/g,'')}*.\nAll previous owners replaced.\n\n_Changes saved — survives restarts._`);
        }

        return m.reply(`❌ Unknown sub-command: *${subCmd}*\nUse: add | remove | set`);
    }
};
