'use strict';
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const path = require('path');
const fs   = require('fs');

const MEME_DIR = path.join(__dirname, '..', 'assets', 'vawulence');

// ─── Batch sessions: Map<ownerJid, { count, savedThisSession, timer }> ────────
const batchSessions = new Map();

function countTotal() {
    try {
        if (!fs.existsSync(MEME_DIR)) return 0;
        return fs.readdirSync(MEME_DIR).filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f)).length;
    } catch (_) { return 0; }
}

async function saveImage(sock, m, target, silent) {
    const buffer = await downloadMediaMessage(
        { message: target.message, key: target.key },
        'buffer', {}, sock
    ).catch(() => null);

    if (!buffer || buffer.length < 2000) {
        if (!silent) { await m.react('\u274c'); await m.reply('\u274c Could not download the image. Try again.'); }
        return false;
    }

    const mime = (target.message?.imageMessage?.mimetype) || 'image/jpeg';
    const ext  = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';

    if (!fs.existsSync(MEME_DIR)) fs.mkdirSync(MEME_DIR, { recursive: true });
    const filename = 'vaw_' + Date.now() + '.' + ext;
    fs.writeFileSync(path.join(MEME_DIR, filename), buffer);
    return true;
}

module.exports = {
    name: 'savevaw',
    aliases: ['addvaw', 'addvawulence'],
    description: 'Owner-only: save vawulence images into the bot pool. Supports single save and batch mode.',
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
            await m.react('\u2705');
            return m.reply(
                '\ud83d\udc38 *Batch session ended!*\n\n' +
                '\ud83d\udcf8 Saved this session: *' + session.count + '* image' + (session.count !== 1 ? 's' : '') + '\n' +
                '\ud83d\udcc2 Total in pool: *' + countTotal() + '*\n\n' +
                '_All saved images will appear first in .vawulence_'
            );
        }

        // ── .savevaw batch ───────────────────────────────────────────────────
        if (sub === 'batch') {
            if (batchSessions.has(m.sender)) {
                const s = batchSessions.get(m.sender);
                return m.reply(
                    '\u23f3 *Batch mode already active*\n\n' +
                    '\ud83d\udcf8 Saved so far: *' + s.count + '*\n\n' +
                    'Send *.savevaw done* to finish.'
                );
            }
            const session = { count: 0, timer: null };
            // Auto-end after 3 minutes
            session.timer = setTimeout(async () => {
                batchSessions.delete(m.sender);
                try {
                    await sock.sendMessage(m.from, {
                        text: '\u23f0 *Batch session expired (3 min)*\n\n' +
                              '\ud83d\udcf8 Saved: *' + session.count + '* image' + (session.count !== 1 ? 's' : '') + '\n' +
                              '\ud83d\udcc2 Total in pool: *' + countTotal() + '*'
                    });
                } catch (_) {}
            }, 3 * 60 * 1000);
            batchSessions.set(m.sender, session);
            await m.react('\u2705');
            return m.reply(
                '\ud83d\udc38\ud83d\udce6 *Batch mode ON!* (3 min window)\n\n' +
                '*How to save multiple images at once:*\n' +
                '1\ufe0f\u20e3 Open WhatsApp attachment picker\n' +
                '2\ufe0f\u20e3 Select ALL the images you want to save\n' +
                '3\ufe0f\u20e3 Type *.savevaw* as the caption (applies to all)\n' +
                '4\ufe0f\u20e3 Hit send — each image saves with just a \u2705\n\n' +
                'Send *.savevaw done* when finished to see the summary.\n' +
                '_Session auto-expires in 3 minutes._'
            );
        }

        // ── Detect image: current message or quoted ──────────────────────────
        const target = (m.type === 'imageMessage' && m.isMedia) ? m
                     : (m.quoted && m.quoted.type === 'imageMessage' && m.quoted.isMedia) ? m.quoted
                     : null;

        // ── .savevaw (no image, no sub-command) ─ show help ──────────────────
        if (!target && !sub) {
            return m.reply(
                '\ud83d\udcf8 *Vawulence Image Saver*\n\n' +
                '*Save a single image:*\n' +
                '\u2022 Send an image with *.savevaw* as caption\n' +
                '\u2022 OR reply to any image with *.savevaw*\n\n' +
                '*Save multiple images at once:*\n' +
                '\u2022 *.savevaw batch* — start a batch session, then send images\n' +
                '\u2022 *.savevaw done* — end batch and see summary\n\n' +
                '\ud83d\udcc2 Current pool: *' + countTotal() + '* saved images\n' +
                '_Your saved images are always used FIRST in .vawulence_'
            );
        }

        if (!target) return; // sub-command with no image, already handled above

        // ── Save the image ───────────────────────────────────────────────────
        const session    = batchSessions.get(m.sender);
        const batchMode  = !!session;

        await m.react('\u23f3');
        const ok = await saveImage(sock, m, target, batchMode);
        if (!ok) return;

        if (batchMode) {
            // Silent save during batch — just react
            session.count++;
            await m.react('\u2705');
        } else {
            // Single save — full confirmation reply
            const total = countTotal();
            await m.react('\u2705');
            await m.reply(
                '\u2705 *Vawulence image saved!*\n\n' +
                '\ud83d\udcc2 Total in pool: *' + total + '*\n\n' +
                '_Tip: Use *.savevaw batch* to save many images silently at once_'
            );
        }
    },
};
