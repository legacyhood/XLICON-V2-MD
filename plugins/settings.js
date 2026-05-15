/**
 * settings.js — Show all on/off states for current chat
 * Command: .settings
 * Works in both personal (DM) and group chats
 */

const getDb = () => global.getMongoDb();

const ON  = '🟢 ON';
const OFF = '🔴 OFF';
const NA  = '➖ N/A';

function fmt(val) { return val ? ON : OFF; }

// ── MongoDB readers ──────────────────────────────────────────────────────────

/** bot_settings: {_id: key, value: bool} */
async function getBotSetting(key) {
    const db = await getDb();
    if (!db) return false;
    const doc = await db.collection('bot_settings').findOne({ _id: key });
    return doc?.value === true || doc?.enabled === true;
}

/** group_settings: {_id: jid, antilink: bool, antispam: bool, ...} */
async function getGroupSetting(jid, field) {
    const db = await getDb();
    if (!db) return false;
    // Try _id lookup first (antilink/antispam/antifake/antiforward pattern)
    const doc = await db.collection('group_settings').findOne({ _id: jid });
    if (doc) return doc[field] === true;
    // Fallback: groupId field (welcome pattern)
    const doc2 = await db.collection('group_settings').findOne({ groupId: jid });
    return doc2?.[field] === true;
}

/** aichat_settings: {_id: jid, enabled: bool} */
async function getAiChat(jid) {
    const db = await getDb();
    if (!db) return false;
    const doc = await db.collection('aichat_settings').findOne({ _id: jid });
    return doc?.enabled === true;
}

// ── Plugin ───────────────────────────────────────────────────────────────────

module.exports = {
    name: 'settings',
    aliases: ['status', 'config', 'features'],
    description: 'Show all on/off feature states for this chat',

    async execute(sock, m) {
        const db = await getDb();
        const jid = m.from;
        const isGroup = m.isGroup;

        await m.react('⚙️');

        // ── Bot-wide settings (apply everywhere) ─────────────────────────
        const [antidelete, anonread, anonview, maintenance, aiChat] = await Promise.all([
            getBotSetting('antidelete'),
            getBotSetting('anonread'),
            getBotSetting('anonview'),
            getBotSetting('maintenance'),
            getAiChat(jid),
        ]);

        if (!isGroup) {
            // ── Personal / DM view ────────────────────────────────────────
            return m.reply(
`╭━━━━━━━━━━━━━━━━━━━━━━━━╮
┃   ⚙️  *PERSONAL CHAT SETTINGS*  ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━╯

🤖 *AI Features*
  AI Chat Auto-Reply : ${fmt(aiChat)}
  (.ai on / .ai off)

🛡️ *Bot-Wide Protection*
  Anti-Delete        : ${fmt(antidelete)}
  Anon Read Receipts : ${fmt(anonread)}
  Anon View Status   : ${fmt(anonview)}
  Maintenance Mode   : ${fmt(maintenance)}

╭────────────────────────────╮
│ Commands to toggle:        │
│ .antidelete on/off         │
│ .anonread on/off           │
│ .anonview on/off           │
│ .maintenance on/off        │
│ .ai on / .ai off           │
╰────────────────────────────╯`
            );
        }

        // ── Group view ────────────────────────────────────────────────────
        const [antilink, antispam, antifake, antiforward, welcome] = await Promise.all([
            getGroupSetting(jid, 'antilink'),
            getGroupSetting(jid, 'antispam'),
            getGroupSetting(jid, 'antifake'),
            getGroupSetting(jid, 'antiforward'),
            getGroupSetting(jid, 'welcome'),
        ]);

        return m.reply(
`╭━━━━━━━━━━━━━━━━━━━━━━━━╮
┃    ⚙️  *GROUP CHAT SETTINGS*    ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━╯

🤖 *AI Features*
  AI Chat Auto-Reply : ${fmt(aiChat)}

🛡️ *Group Protection*
  Anti-Link          : ${fmt(antilink)}
  Anti-Spam          : ${fmt(antispam)}
  Anti-Fake Account  : ${fmt(antifake)}
  Anti-Forward       : ${fmt(antiforward)}

👋 *Group Automation*
  Welcome / Goodbye  : ${fmt(welcome)}

🌐 *Bot-Wide Settings*
  Anti-Delete        : ${fmt(antidelete)}
  Anon Read Receipts : ${fmt(anonread)}
  Anon View Status   : ${fmt(anonview)}
  Maintenance Mode   : ${fmt(maintenance)}

╭────────────────────────────╮
│ Commands to toggle:        │
│ .ai on/off                 │
│ .antilink on/off           │
│ .antispam on/off           │
│ .antifake on/off           │
│ .antiforward on/off        │
│ .welcome on/off            │
│ .antidelete on/off         │
│ .anonread on/off           │
│ .anonview on/off           │
╰────────────────────────────╯`
        );
    },
};
