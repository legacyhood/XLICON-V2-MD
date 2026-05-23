'use strict';
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const path  = require('path');
const fs    = require('fs');
const https = require('https');

const MEME_DIR   = path.join(__dirname, '..', 'assets', 'vawulence');

// Drop the old vaw_images MongoDB collection (legacy — replaced by GitHub storage).
// Runs once silently on startup to free up MongoDB space.
setTimeout(async () => {
    try {
        const db = await global.getMongoDb().catch(() => null);
        if (!db) return;
        const colls = await db.listCollections({ name: 'vaw_images' }).toArray();
        if (colls.length > 0) {
            await db.collection('vaw_images').drop();
            console.log('[savevaw] Dropped legacy vaw_images collection from MongoDB.');
        }
    } catch (_) {}
}, 8000);
const GITHUB_REPO = 'legacyhood/XLICON-V2-MD';

// ─── Batch sessions: Map<senderJid, { startTime, timer, images[] }> ──────────
const batchSessions = new Map();

function countAll() {
    try {
        if (!fs.existsSync(MEME_DIR)) return 0;
        return fs.readdirSync(MEME_DIR).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f)).length;
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

// ─── GitHub Trees API batch commit ───────────────────────────────────────────
// Pushes all session images in ONE commit → one Railway redeploy total.
async function githubApi(method, endpoint, body) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) return null;
    const data = body ? JSON.stringify(body) : null;
    return new Promise(resolve => {
        const opts = {
            hostname: 'api.github.com',
            path: endpoint,
            method,
            headers: {
                'Authorization': 'token ' + token,
                'User-Agent': 'xlicon-bot',
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
        };
        if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
        const req = https.request(opts, r => {
            let d = ''; r.on('data', c => d += c);
            r.on('end', () => { try { resolve(JSON.parse(d)); } catch (_) { resolve(null); } });
        });
        req.on('error', () => resolve(null));
        if (data) req.write(data);
        req.end();
    });
}

async function commitImagesToGitHub(images) {
    // images: [{ filename, buffer }]
    if (!images.length || !process.env.GITHUB_TOKEN) return 0;
    try {
        // 1. Get latest commit SHA on main
        const ref = await githubApi('GET', '/repos/' + GITHUB_REPO + '/git/ref/heads/main');
        if (!ref?.object?.sha) return 0;
        const commitSha = ref.object.sha;

        // 2. Get current tree SHA
        const commit = await githubApi('GET', '/repos/' + GITHUB_REPO + '/git/commits/' + commitSha);
        if (!commit?.tree?.sha) return 0;
        const baseTreeSha = commit.tree.sha;

        // 3. Create blobs for each image
        const treeEntries = [];
        for (const img of images) {
            const blob = await githubApi('POST', '/repos/' + GITHUB_REPO + '/git/blobs', {
                content: img.buffer.toString('base64'),
                encoding: 'base64',
            });
            if (!blob?.sha) continue;
            treeEntries.push({
                path: 'assets/vawulence/' + img.filename,
                mode: '100644',
                type: 'blob',
                sha: blob.sha,
            });
        }
        if (!treeEntries.length) return 0;

        // 4. Create new tree
        const newTree = await githubApi('POST', '/repos/' + GITHUB_REPO + '/git/trees', {
            base_tree: baseTreeSha,
            tree: treeEntries,
        });
        if (!newTree?.sha) return 0;

        // 5. Create commit
        const count = treeEntries.length;
        const newCommit = await githubApi('POST', '/repos/' + GITHUB_REPO + '/git/commits', {
            message: 'feat(vawulence): add ' + count + ' owner-saved image' + (count !== 1 ? 's' : ''),
            tree: newTree.sha,
            parents: [commitSha],
        });
        if (!newCommit?.sha) return 0;

        // 6. Update ref
        await githubApi('PATCH', '/repos/' + GITHUB_REPO + '/git/refs/heads/main', {
            sha: newCommit.sha,
            force: false,
        });
        return count;
    } catch (_) { return 0; }
}

async function saveImageBuffer(sock, m, target) {
    const buffer = await downloadMediaMessage(
        { message: target.message, key: target.key },
        'buffer', {}, sock
    ).catch(() => null);
    if (!buffer || buffer.length < 2000) return null;

    const mime = target.message?.imageMessage?.mimetype || 'image/jpeg';
    if (mime.includes('gif')) return null; // GIFs break WA image messages
    const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';

    if (!fs.existsSync(MEME_DIR)) fs.mkdirSync(MEME_DIR, { recursive: true });
    const ts       = Date.now() + Math.floor(Math.random() * 9999);
    const filename = 'vaw_' + ts + '.' + ext;
    fs.writeFileSync(path.join(MEME_DIR, filename), buffer);
    return { filename, buffer };
}

module.exports = {
    name: 'savevaw',
    aliases: ['addvaw', 'addvawulence'],
    description: 'Owner-only: save vawulence images. Supports single save and batch mode.',
    usage: '.savevaw | .savevaw batch | .savevaw done | .savevaw count',

    async onOwnerImage(sock, m) {
        if (!m.isMedia || m.type !== 'imageMessage') return;
        const session = batchSessions.get(m.sender);
        if (!session) return;
        if (m.body && m.body.trim()) return; // captioned images handled by execute()
        const result = await saveImageBuffer(sock, m, m);
        if (result) {
            session.images.push(result);
            await m.react('\u2705').catch(() => {});
        }
    },

    async execute(sock, m, args) {
        if (!m.isOwner) return m.reply('\u274c Only the bot owner can save vawulence images.');

        const sub = (args[0] || '').toLowerCase();

        // ── .savevaw done ────────────────────────────────────────────────────
        if (sub === 'done' || sub === 'stop' || sub === 'end') {
            const session = batchSessions.get(m.sender);
            if (!session) return m.reply('\u2139\ufe0f No active batch session. Start one with *.savevaw batch*');
            clearTimeout(session.timer);
            batchSessions.delete(m.sender);
            const saved = countSince(session.startTime);
            await m.react('\u2705');
            await m.reply(
                '\ud83d\udc38 *Batch session ended!*\n\n' +
                '\ud83d\udcf8 Saved this session: *' + saved + '* image' + (saved !== 1 ? 's' : '') + '\n' +
                '\ud83d\udcc2 Total in pool: *' + countAll() + '*\n\n' +
                '\u23f3 _Committing to GitHub in background..._'
            );
            // Commit all session images to GitHub in one push (background)
            if (session.images.length > 0) {
                commitImagesToGitHub(session.images)
                    .then(n => {
                        if (n > 0) {
                            sock.sendMessage(m.from, {
                                text: '\u2705 *' + n + ' image' + (n !== 1 ? 's' : '') + ' committed to GitHub!*\n_Images now survive every restart permanently._'
                            }).catch(() => {});
                        }
                    })
                    .catch(() => {});
            }
            return;
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
            const sessionImages = [];
            const timer = setTimeout(async () => {
                const s = batchSessions.get(m.sender);
                batchSessions.delete(m.sender);
                if (!s) return;
                const saved = countSince(s.startTime);
                try {
                    await sock.sendMessage(m.from, {
                        text: '\u23f0 *Batch session expired (3 min)*\n\n' +
                              '\ud83d\udcf8 Saved: *' + saved + '* images\n' +
                              '\u23f3 _Committing to GitHub..._'
                    });
                } catch (_) {}
                if (s.images.length > 0) {
                    commitImagesToGitHub(s.images)
                        .then(n => { if (n > 0) sock.sendMessage(m.from, { text: '\u2705 *' + n + ' image' + (n !== 1 ? 's' : '') + ' committed to GitHub permanently.*' }).catch(() => {}); })
                        .catch(() => {});
                }
            }, 3 * 60 * 1000);
            batchSessions.set(m.sender, { startTime, timer, images: sessionImages });
            await m.react('\u2705');
            return m.reply(
                '\ud83d\udc38\ud83d\udce6 *Batch mode ON!* (3 min window)\n\n' +
                '*How to save many images at once:*\n' +
                '1\ufe0f\u20e3 Open the attachment picker\n' +
                '2\ufe0f\u20e3 Select ALL the images you want\n' +
                '3\ufe0f\u20e3 Send them (no caption needed!) \u2014 each saves with \u2705\n\n' +
                '*.savevaw count* \u2014 check progress\n' +
                '*.savevaw done* \u2014 end + commit to GitHub permanently'
            );
        }

        // ── Single image save ────────────────────────────────────────────────
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
                '\u2022 *.savevaw batch* \u2192 send images \u2192 *.savevaw done*\n\n' +
                '\ud83d\udcc2 Pool: *' + countAll() + '* saved images'
            );
        }

        const inBatch = batchSessions.has(m.sender);
        await m.react('\u23f3');
        const result = await saveImageBuffer(sock, m, target);

        if (!result) {
            await m.react('\u274c');
            return m.reply('\u274c Could not download image. Try again.');
        }

        if (inBatch) {
            batchSessions.get(m.sender).images.push(result);
            await m.react('\u2705');
        } else {
            // Single save — commit immediately to GitHub
            await m.react('\u2705');
            await m.reply(
                '\u2705 *Saved!* \ud83d\udcc2 Pool: *' + countAll() + '* images\n\n' +
                '\u23f3 _Committing to GitHub..._'
            );
            commitImagesToGitHub([result])
                .then(n => { if (n > 0) sock.sendMessage(m.from, { text: '\u2705 Committed to GitHub — permanent!' }).catch(() => {}); })
                .catch(() => {});
        }
    },
};
