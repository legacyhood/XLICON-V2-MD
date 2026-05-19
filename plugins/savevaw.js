'use strict';
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const path = require('path');
const fs   = require('fs');

const MEME_DIR = path.join(__dirname, '..', 'assets', 'vawulence');

// ─── Batch sessions: Map<senderJid, { startTime, timer }> ────────────────────
// Count is derived from actual files saved (timestamp in filename) — not an
// in-memory counter — so concurrent saves and Railway restarts can't corrupt it.
const batchSessions = new Map();

function countAll() {
    try {
        if (!fs.existsSync(MEME_DIR)) return 0;
        return fs.readdirSync(MEME_DIR).filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f)).length;
    } catch (_) { return 0; }
}

// Count files saved SINCE a given timestamp (encoded in vaw_<ts>.ext filenames)
function countSince(startTime) {
    try {
        if (!fs.existsSync(MEME_DIR)) return 0;
        return fs.readdirSync(MEME_DIR).filter(f => {
            const m = f.match(/^vaw_(\d+)\./);
            return m && parseInt(m[1]) >= startTime;
        }).length;
    } catch (_) { return 0; }
}

async function saveImage(sock, m, target) {
    const buffer = await downloadMediaMessage(
        { message: target.message, key: target.key },
        'buffer', {}, sock
    ).catch(() => null);
    if (!buffer || buffer.length < 2000) return false;

    const mime = target.message?.imageMessage?.mimetype || 'image/jpeg';
    const ext  = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';

    if (!fs.existsSync(MEME_DIR)) fs.mkdirSync(MEME_DIR, { recursive: true });
    // Small random jitter so concurrent saves get unique timestamps
    const ts = Date.now() + Math.floor(Math.random() * 999);
    fs.writeFileSync(path.join(MEME_DIR, 'vaw_' + ts + '.' + ext), buffer);
    return true;
}

module.exports = {
    name: 'savevaw',
    aliases: ['addvaw', 'addvawulence'],
    description: 'Owner-only: save vawulence images into the bot pool. Supports single and batch mode.',
    usage: '.savevaw | .savevaw batch | .savevaw done',

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
                return m.reply('\u23f3 Batch active — saved so far: *' + countSince(session.startTime) + '* | Total pool: *' + countAll() + '*');
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
                '1\ufe0f\u20e3 Tap attachment \u2192 pick ALL the images you want\n' +
                '2\ufe0f\u20e3 Type *.savevaw* as the caption (applies to all)\n' +
                '3\ufe0f\u20e3 Send \u2014 each saves silently with \u2705\n\n' +
                '*.savevaw count* \u2014 check progress\n' +
                '*.savevaw done* \u2014 end session and see summary'
            );
        }

        // ── Detect image in current message or quoted ────────────────────────
        const target = (m.type === 'imageMessage' && m.isMedia) ? m
                     : (m.quoted && m.quoted.type === 'imageMessage' && m.quoted.isMedia) ? m.quoted
                     : null;

        // ── No image, no recognised sub-command → show help ──────────────────
        if (!target) {
            return m.reply(
                '\ud83d\udcf8 *Vawulence Image Saver*\n\n' +
                '*Single image:*\n' +
                '\u2022 Send image + *.savevaw* caption\n' +
                '\u2022 Or reply to any image with *.savevaw*\n\n' +
                '*Multiple images at once:*\n' +
                '\u2022 *.savevaw batch* \u2014 start session\n' +
                '\u2022 *.savevaw done* \u2014 end + see summary\n' +
                '\u2022 *.savevaw count* \u2014 check progress\n\n' +
                '\ud83d\udcc2 Pool: *' + countAll() + '* saved images'
            );
        }

        // ── Save the image ───────────────────────────────────────────────────
        const inBatch = batchSessions.has(m.sender);
        await m.react('\u23f3');
        const ok = await saveImage(sock, m, target);

        if (!ok) {
            await m.react('\u274c');
            return m.reply('\u274c Could not download image. Try again.');
        }

        if (inBatch) {
            // Silent during batch — just tick, no reply spam
            await m.react('\u2705');
        } else {
            await m.react('\u2705');
            await m.reply(
                '\u2705 *Saved!* \ud83d\udcc2 Pool: *' + countAll() + '* images\n\n' +
                '_Tip: .savevaw batch to save many images at once_'
            );
        }
    },
};
