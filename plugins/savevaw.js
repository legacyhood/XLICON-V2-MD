'use strict';
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const path = require('path');
const fs   = require('fs');

const MEME_DIR = path.join(__dirname, '..', 'assets', 'vawulence');

// ─── Batch sessions: Map<senderJid, { startTime, timer }> ────────────────────
// Count is read from actual files on disk (vaw_<ts>.ext) so concurrent saves
// and Railway restarts cannot corrupt the tally.
const batchSessions = new Map();

function countAll() {
    try {
        if (!fs.existsSync(MEME_DIR)) return 0;
        return fs.readdirSync(MEME_DIR).filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f)).length;
    } catch (_) { return 0; }
}

function countSince(startTime) {
    try {
        if (!fs.existsSync(MEME_DIR)) return 0;
        return fs.readdirSync(MEME_DIR).filter(f => {
            const m = f.match(/^vaw_(\d+)\./);
            return m && parseInt(m[1]) >= startTime;
        }).length;
    } catch (_) { return 0; }
}

// Persist to MongoDB so images survive Railway ephemeral filesystem resets
async function saveToMongo(filename, buffer, mimetype) {
    try {
        const db = await global.getMongoDb().catch(() => null);
        if (!db) return;
        await db.collection('vaw_images').updateOne(
            { _id: filename },
            { $set: { _id: filename, data: buffer, mimetype, savedAt: new Date() } },
            { upsert: true }
        );
    } catch (_) {}
}

async function saveImageBuffer(sock, m, target) {
    const buffer = await downloadMediaMessage(
        { message: target.message, key: target.key },
        'buffer', {}, sock
    ).catch(() => null);
    if (!buffer || buffer.length < 2000) return false;

    const mime = target.message?.imageMessage?.mimetype || 'image/jpeg';
    const ext  = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
    if (!fs.existsSync(MEME_DIR)) fs.mkdirSync(MEME_DIR, { recursive: true });
    const ts = Date.now() + Math.floor(Math.random() * 9999);
    const filename = 'vaw_' + ts + '.' + ext;
    fs.writeFileSync(path.join(MEME_DIR, filename), buffer);
    saveToMongo(filename, buffer, mime).catch(() => {}); // fire-and-forget backup
    return true;
}

module.exports = {
    name: 'savevaw',
    aliases: ['addvaw', 'addvawulence'],
    description: 'Owner-only: save vawulence images. Supports single save and batch mode.',
    usage: '.savevaw | .savevaw batch | .savevaw done | .savevaw count',

    // ── Called by index.js for every image the owner sends (with OR without caption)
    // This is what makes WhatsApp albums work: only the first image in an album
    // gets the .savevaw caption; the rest arrive captionless and are caught here.
    async onOwnerImage(sock, m) {
        if (!m.isMedia || m.type !== 'imageMessage') return;
        const session = batchSessions.get(m.sender);
        if (!session) return; // only active during batch mode
        // Don't double-save: if this message also triggered execute() (had .savevaw caption)
        // execute() will handle it. We only process captionless images here.
        if (m.body && m.body.trim()) return;
        const ok = await saveImageBuffer(sock, m, m);
        if (ok) await m.react('\u2705').catch(() => {});
    },

    async execute(sock, m, args) {
        if (!m.isOwner) return m.reply('\u274c Only the bot owner can save vawulence images.');

        const sub = (args[0] || '').toLowerCase();

        // ── .savevaw done / stop ─────────────────────────────────────────────
        if (sub === 'done' || sub === 'stop' || sub === 'end') {
            const session = batchSessions.get(m.sender);
            if (!session) return m.reply('\u2139\ufe0f No active batch session. Start one with *.savevaw batch*');
            clearTimeout(session.timer);
            batchSessions.delete(m.sender);
            const saved = countSince(session.startTime);
            await m.react('\u2705');
            return m.reply(
                '\ud83d\udc38 *Batch session ended!*\n\n' +
                '\ud83d\udcf8 Saved this session: *' + saved + '* image' + (saved !== 1 ? 's' : '') + '\n' +
                '\ud83d\udcc2 Total in pool: *' + countAll() + '*\n\n' +
                '_All saved images appear first in .vawulence_'
            );
        }

        // ── .savevaw count ───────────────────────────────────────────────────
        if (sub === 'count') {
            const session = batchSessions.get(m.sender);
            if (session) {
                return m.reply(
                    '\u23f3 Batch active\n' +
                    '\ud83d\udcf8 Saved so far: *' + countSince(session.startTime) + '*\n' +
                    '\ud83d\udcc2 Total pool: *' + countAll() + '*'
                );
            }
            return m.reply('\ud83d\udcc2 Total images in vawulence pool: *' + countAll() + '*');
        }

        // ── .savevaw batch ───────────────────────────────────────────────────
        if (sub === 'batch') {
            if (batchSessions.has(m.sender)) {
                const s = batchSessions.get(m.sender);
                return m.reply(
                    '\u23f3 *Batch mode already active*\n' +
                    'Saved so far: *' + countSince(s.startTime) + '*\n\n' +
                    'Send *.savevaw done* to finish.'
                );
            }
            const startTime = Date.now();
            const timer = setTimeout(async () => {
                const s = batchSessions.get(m.sender);
                batchSessions.delete(m.sender);
                if (!s) return;
                try {
                    await sock.sendMessage(m.from, {
                        text: '\u23f0 *Batch session expired (3 min)*\n\n' +
                              '\ud83d\udcf8 Saved: *' + countSince(s.startTime) + '* images\n' +
                              '\ud83d\udcc2 Total in pool: *' + countAll() + '*'
                    });
                } catch (_) {}
            }, 3 * 60 * 1000);
            batchSessions.set(m.sender, { startTime, timer });
            await m.react('\u2705');
            return m.reply(
                '\ud83d\udc38\ud83d\udce6 *Batch mode ON!* (3 min window)\n\n' +
                '*How to save many images at once:*\n' +
                '1\ufe0f\u20e3 Send *.savevaw batch*\n' +
                '2\ufe0f\u20e3 Open the attachment picker\n' +
                '3\ufe0f\u20e3 Select ALL the images you want\n' +
                '4\ufe0f\u20e3 Send them (no caption needed!) \u2014 each saves with \u2705\n\n' +
                '*.savevaw count* \u2014 check progress mid-batch\n' +
                '*.savevaw done* \u2014 end session + see summary'
            );
        }

        // ── Detect image in current message or quoted ────────────────────────
        const target = (m.type === 'imageMessage' && m.isMedia) ? m
                     : (m.quoted && m.quoted.type === 'imageMessage' && m.quoted.isMedia) ? m.quoted
                     : null;

        if (!target) {
            return m.reply(
                '\ud83d\udcf8 *Vawulence Image Saver*\n\n' +
                '*Single image:*\n' +
                '\u2022 Send image with *.savevaw* caption\n' +
                '\u2022 OR reply to any image with *.savevaw*\n\n' +
                '*Multiple images:*\n' +
                '\u2022 *.savevaw batch* \u2192 send images (no caption needed) \u2192 *.savevaw done*\n' +
                '\u2022 *.savevaw count* \u2014 check progress\n\n' +
                '\ud83d\udcc2 Pool: *' + countAll() + '* saved images'
            );
        }

        // ── Save the image (single or first-of-album with caption) ───────────
        const inBatch = batchSessions.has(m.sender);
        await m.react('\u23f3');
        const ok = await saveImageBuffer(sock, m, target);

        if (!ok) {
            await m.react('\u274c');
            return m.reply('\u274c Could not download image. Try again.');
        }

        if (inBatch) {
            await m.react('\u2705'); // silent during batch
        } else {
            await m.react('\u2705');
            await m.reply(
                '\u2705 *Saved!* \ud83d\udcc2 Pool: *' + countAll() + '* images\n\n' +
                '_Tip: .savevaw batch to bulk-save without captions_'
            );
        }
    },
};
