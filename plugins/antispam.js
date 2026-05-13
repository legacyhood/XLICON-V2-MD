const { MongoClient } = require('mongodb');

// ── In-memory spam tracker ─────────────────────────────────────────────────
// key: `${groupId}_${userId}` → { timestamps: [ms], msgKeys: [key] }
const spamTracker = new Map();
const SPAM_MSG_LIMIT  = parseInt(process.env.SPAM_MSG_LIMIT  || '5', 10); // max msgs
const SPAM_TIME_WINDOW = parseInt(process.env.SPAM_TIME_WINDOW || '5', 10); // seconds
const WARN_LIMIT = parseInt(process.env.WARN_LIMIT || '3', 10);

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
    } catch (e) { console.error('[antispam] DB error:', e.message); return null; }
}

async function isEnabled(groupId) {
    const db = await getDb();
    if (!db) return true; // default on
    const doc = await db.collection('group_settings').findOne({ groupId });
    return doc?.antispam !== false;
}

async function setEnabled(groupId, val) {
    const db = await getDb();
    if (!db) return;
    await db.collection('group_settings').updateOne(
        { groupId },
        { $set: { antispam: val, updatedAt: new Date() } },
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
    name: 'antispam',
    aliases: ['as', 'spamprotect'],
    description: 'Toggle anti-spam protection for the group. Auto-warns and deletes spam.',

    // ── Command: .antispam on/off ──────────────────────────────────────────
    async execute(sock, m, args) {
        if (!m.isGroup) return m.reply('❌ This command only works in groups.');
        const botId = sock.user.id.replace(/:\d+@/, '@');
        const meta = await sock.groupMetadata(m.from).catch(() => null);
        const botMember = meta?.participants.find(p => p.id.replace(/:\d+@/, '@') === botId);
        if (!botMember?.admin) return m.reply('❌ I need to be an admin to manage anti-spam.');

        const sub = (args[0] || '').toLowerCase();
        if (sub === 'on' || sub === 'enable') {
            await setEnabled(m.from, true);
            return m.reply(`🛡️ *Anti-Spam enabled!*\n\nNon-admins who send more than ${SPAM_MSG_LIMIT} messages in ${SPAM_TIME_WINDOW} seconds will be warned and their messages deleted.\n\nUse _.antispam off_ to disable.`);
        }
        if (sub === 'off' || sub === 'disable') {
            await setEnabled(m.from, false);
            return m.reply('✅ Anti-Spam disabled.');
        }
        const enabled = await isEnabled(m.from);
        return m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃   🛡️ *ANTI-SPAM*    ┃
╰━━━━━━━━━━━━━━━━━━━╯

Status: *${enabled ? '🟢 Enabled' : '🔴 Disabled'}*
Limit: *${SPAM_MSG_LIMIT} msgs / ${SPAM_TIME_WINDOW}s*
Warn limit before kick: *${WARN_LIMIT}*

Commands:
  _.antispam on_ — Enable
  _.antispam off_ — Disable`
        );
    },

    // ── onMessage hook — runs on every group message ───────────────────────
    async onMessage(sock, m) {
        if (!m.isGroup || !m.from || !m.sender) return;

        const enabled = await isEnabled(m.from);
        if (!enabled) return;

        // Skip admins
        let meta;
        try { meta = await sock.groupMetadata(m.from); } catch (_) { return; }
        const senderClean = m.sender.replace(/:\d+@/, '@');
        const senderMember = meta.participants.find(p => p.id.replace(/:\d+@/, '@') === senderClean);
        if (!senderMember || senderMember.admin) return;

        const trackerKey = `${m.from}_${senderClean}`;
        const now = Date.now();
        const windowMs = SPAM_TIME_WINDOW * 1000;

        // Get or create tracker entry
        if (!spamTracker.has(trackerKey)) {
            spamTracker.set(trackerKey, { timestamps: [], msgKeys: [] });
        }
        const entry = spamTracker.get(trackerKey);

        // Prune old timestamps outside window
        entry.timestamps = entry.timestamps.filter(t => now - t < windowMs);
        entry.msgKeys = entry.msgKeys.slice(-(SPAM_MSG_LIMIT + 5)); // keep recent keys

        entry.timestamps.push(now);
        entry.msgKeys.push(m.key);

        if (entry.timestamps.length >= SPAM_MSG_LIMIT) {
            // ── Spam detected ──
            entry.timestamps = [];
            const keysToDelete = [...entry.msgKeys];
            entry.msgKeys = [];
            spamTracker.set(trackerKey, entry);

            // Delete all spam messages
            for (const key of keysToDelete) {
                await sock.sendMessage(m.from, { delete: key }).catch(() => {});
            }

            // Warn the user
            const warnCount = await addWarn(m.from, senderClean, 'Spamming');

            if (warnCount >= WARN_LIMIT) {
                // Auto-kick
                await sock.groupParticipantsUpdate(m.from, [senderClean], 'remove').catch(() => {});
                await sock.sendMessage(m.from, {
                    text:
`⛔ @${senderClean.split('@')[0]} has been *kicked* for spamming!\n\n` +
`🔢 They reached the warn limit (${WARN_LIMIT}/${WARN_LIMIT}).`,
                    mentions: [senderClean]
                });
                await clearWarns(m.from, senderClean);
            } else {
                await sock.sendMessage(m.from, {
                    text:
`🚨 *SPAM DETECTED*\n\n` +
`👤 @${senderClean.split('@')[0]} — please slow down!\n` +
`🗑️ ${keysToDelete.length} message(s) deleted.\n` +
`⚠️ Warns: *${warnCount}/${WARN_LIMIT}*\n\n` +
`${WARN_LIMIT - warnCount} more warn${WARN_LIMIT - warnCount === 1 ? '' : 's'} = auto-kick.`,
                    mentions: [senderClean]
                });
            }
        }

        // Clean up old tracker entries periodically
        if (spamTracker.size > 500) {
            const cutoff = now - windowMs * 2;
            for (const [k, v] of spamTracker) {
                if (!v.timestamps.some(t => t > cutoff)) spamTracker.delete(k);
            }
        }
    }
};
