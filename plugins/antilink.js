const { MongoClient } = require('mongodb');

const WARN_LIMIT = parseInt(process.env.WARN_LIMIT || '3', 10);

// Detect links: http/https/www, WhatsApp group links, Telegram, etc.
const LINK_REGEX = /(?:https?:\/\/|www\.|wa\.me\/|t\.me\/|chat\.whatsapp\.com\/|bit\.ly\/|tinyurl\.com\/|youtu\.be\/|m\.me\/)[\w\-._~:/?#[\]@!$&'()*+,;=%]+/gi;

// ── MongoDB ─────────────────────────────────────────────────────────────────
let _db = null;
async function getDb() {
    if (_db) return _db;
    if (!process.env.MONGO_URI) return null;
    try {
        const client = new MongoClient(process.env.MONGO_URI);
        await client.connect();
        _db = client.db('xlicon_bot');
        return _db;
    } catch (e) { console.error('[antilink] DB error:', e.message); return null; }
}

async function isEnabled(groupId) {
    const db = await getDb();
    if (!db) return false; // default off — only activates when explicitly enabled
    const doc = await db.collection('group_settings').findOne({ groupId });
    return doc?.antilink === true;
}

async function setEnabled(groupId, val) {
    const db = await getDb();
    if (!db) return;
    await db.collection('group_settings').updateOne(
        { groupId },
        { $set: { antilink: val, updatedAt: new Date() } },
        { upsert: true }
    );
}

async function addWarn(groupId, userId, reason) {
    const db = await getDb();
    if (!db) return 1;
    const result = await db.collection('warnings').findOneAndUpdate(
        { groupId, userId },
        {
            $inc: { count: 1 },
            $push: { reasons: { reason, at: new Date() } },
            $set: { updatedAt: new Date() },
            $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true, returnDocument: 'after' }
    );
    return result?.value?.count ?? result?.count ?? 1;
}

async function clearWarns(groupId, userId) {
    const db = await getDb();
    if (!db) return;
    await db.collection('warnings').deleteOne({ groupId, userId });
}

// ── Plugin ──────────────────────────────────────────────────────────────────
module.exports = {
    name: 'antilink',
    aliases: ['al', 'linkprotect', 'nolink'],
    description: 'Delete links posted by non-admins and warn them automatically',

    // ── Command: .antilink on/off ──────────────────────────────────────────
    async execute(sock, m, args) {
        if (!m.isGroup) return m.reply('❌ This command only works in groups.');
        const botId = sock.user.id.replace(/:\d+@/, '@');
        const meta = await sock.groupMetadata(m.from).catch(() => null);
        const botMember = meta?.participants.find(p => p.id.replace(/:\d+@/, '@') === botId);
        if (!botMember?.admin) return m.reply('❌ I need to be an admin to manage anti-link.');

        const sub = (args[0] || '').toLowerCase();
        if (sub === 'on' || sub === 'enable') {
            await setEnabled(m.from, true);
            return m.reply(
`🔗 *Anti-Link enabled!*\n\n` +
`Any link sent by a non-admin will be deleted and they will receive a warning.\n` +
`Reaching ${WARN_LIMIT} warns = auto-kick.\n\n` +
`Admins can freely post links.\n` +
`Use _.antilink off_ to disable.`
            );
        }
        if (sub === 'off' || sub === 'disable') {
            await setEnabled(m.from, false);
            return m.reply('✅ Anti-Link disabled. Members can post links freely.');
        }
        const enabled = await isEnabled(m.from);
        return m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃   🔗 *ANTI-LINK*    ┃
╰━━━━━━━━━━━━━━━━━━━╯

Status: *${enabled ? '🟢 Enabled' : '🔴 Disabled'}*
Warn limit before kick: *${WARN_LIMIT}*

Commands:
  _.antilink on_ — Enable
  _.antilink off_ — Disable`
        );
    },

    // ── onMessage hook — runs on every group message ───────────────────────
    async onMessage(sock, m) {
        if (!m.isGroup || !m.from || !m.sender || !m.body) return;

        const enabled = await isEnabled(m.from);
        if (!enabled) return;

        // Check if message contains a link
        if (!LINK_REGEX.test(m.body)) {
            LINK_REGEX.lastIndex = 0; // reset regex state
            return;
        }
        LINK_REGEX.lastIndex = 0;

        // Skip admins and bot itself
        let meta;
        try { meta = await sock.groupMetadata(m.from); } catch (_) { return; }
        const senderClean = m.sender.replace(/:\d+@/, '@');
        const senderMember = meta.participants.find(p => p.id.replace(/:\d+@/, '@') === senderClean);
        if (!senderMember || senderMember.admin) return;

        // Delete the message
        await sock.sendMessage(m.from, { delete: m.key }).catch(() => {});

        // Warn the user
        const warnCount = await addWarn(m.from, senderClean, 'Posting a link');

        if (warnCount >= WARN_LIMIT) {
            // Auto-kick
            await sock.groupParticipantsUpdate(m.from, [senderClean], 'remove').catch(() => {});
            await sock.sendMessage(m.from, {
                text:
`⛔ @${senderClean.split('@')[0]} has been *kicked* for repeatedly posting links!\n\n` +
`🔢 They reached the warn limit (${WARN_LIMIT}/${WARN_LIMIT}).`,
                mentions: [senderClean]
            });
            await clearWarns(m.from, senderClean);
        } else {
            await sock.sendMessage(m.from, {
                text:
`🚫 *LINK REMOVED*\n\n` +
`👤 @${senderClean.split('@')[0]}\n` +
`📌 Links are not allowed in this group for non-admins.\n` +
`⚠️ Warns: *${warnCount}/${WARN_LIMIT}*\n\n` +
`${WARN_LIMIT - warnCount} more warn${WARN_LIMIT - warnCount === 1 ? '' : 's'} = auto-kick.`,
                mentions: [senderClean]
            });
        }
    }
};
