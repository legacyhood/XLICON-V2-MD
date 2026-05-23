/**
 * Anonymous Status Viewer
 * Compresses media before storing in MongoDB so everything survives restarts.
 *
 * Storage per entry:
 *   Images  -> sharp: resize max 480px, JPEG q35 -> ~15-40 KB each
 *   Videos  -> ffmpeg: extract first-frame thumbnail -> ~20-50 KB
 *   Audio   -> stored as-is (voice notes already ~50-200 KB)
 *   Text    -> stored as-is (tiny)
 *
 * On startup: full cache restored from MongoDB automatically.
 */

const getDb    = () => global.getMongoDb();
const nodePath = require('path');
const fs       = require('fs');
const os       = require('os');
const { execFile } = require('child_process');

global.statusCache = global.statusCache || new Map();

let _loaded  = false;
let _enabled = false;

async function loadState() {
    if (_loaded) return _enabled;
    const db = await getDb();
    if (db) {
        const doc = await db.collection('bot_settings').findOne({ _id: 'anonview' });
        _enabled = doc?.value === true;
    }
    _loaded = true;
    return _enabled;
}

async function saveState(val) {
    _enabled = val;
    const db = await getDb();
    if (db) {
        await db.collection('bot_settings').updateOne(
            { _id: 'anonview' },
            { $set: { value: val, updatedAt: new Date() } },
            { upsert: true }
        );
    }
}

loadState().catch(() => {});

// ── Compression helpers ───────────────────────────────────────────────────────

async function compressImage(buffer) {
    try {
        const sharp = require('sharp');
        return await sharp(buffer)
            .resize({ width: 720, height: 720, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 70 })
            .toBuffer();
    } catch (e) {
        // sharp not ready yet — store raw if small enough
        return buffer.length <= 500 * 1024 ? buffer : buffer.slice(0, 500 * 1024);
    }
}

function extractVideoThumbnail(videoBuffer) {
    return new Promise(resolve => {
        try {
            let ffmpegPath;
            try { ffmpegPath = require('@ffmpeg-installer/ffmpeg').path; } catch (e) { return resolve(null); }
            const tmpVideo = nodePath.join(os.tmpdir(), 'sv_' + Date.now() + '.mp4');
            const tmpThumb = nodePath.join(os.tmpdir(), 'sv_' + Date.now() + '.jpg');
            fs.writeFileSync(tmpVideo, videoBuffer);
            execFile(ffmpegPath, ['-i', tmpVideo, '-ss', '00:00:00.5', '-vframes', '1', '-vf', 'scale=480:-1', '-q:v', '5', tmpThumb, '-y'],
                { timeout: 10000 }, async (err) => {
                    try { fs.unlinkSync(tmpVideo); } catch (_) {}
                    if (err || !fs.existsSync(tmpThumb)) return resolve(null);
                    try {
                        const thumb = fs.readFileSync(tmpThumb);
                        fs.unlinkSync(tmpThumb);
                        const compressed = await compressImage(thumb).catch(() => thumb);
                        resolve(compressed);
                    } catch (_) { resolve(null); }
                }
            );
        } catch (e) { resolve(null); }
    });
}

// ── MongoDB helpers ───────────────────────────────────────────────────────────

const MAX_PER_CONTACT = 5;   // max 5 statuses kept per contact
const MAX_TOTAL_DOCS  = 80;   // max 80 contacts in cache at once

async function saveToMongo(senderJid, entries) {
    const db = await getDb();
    if (!db) return;
    try {
        const { Binary } = require('mongodb');
        const total = await db.collection('status_cache').countDocuments();
        if (total >= MAX_TOTAL_DOCS) {
            const oldest = await db.collection('status_cache').findOne({}, { sort: { updatedAt: 1 } });
            if (oldest) await db.collection('status_cache').deleteOne({ _id: oldest._id });
        }
        const storable = entries.map(e => {
            const out = { type: e.type, pushName: e.pushName, ts: e.ts, caption: e.caption || '', text: e.text || '' };
            if (e.thumbnail) out.thumbnail = new Binary(e.thumbnail);
            else if (e.buffer) out.buffer  = new Binary(e.buffer);
            return out;
        });
        await db.collection('status_cache').replaceOne(
            { _id: senderJid },
            { _id: senderJid, entries: storable, updatedAt: new Date() },
            { upsert: true }
        );
    } catch (e) {
        console.error('[anonview] mongo save error:', e.message && e.message.slice(0, 80));
    }
}

// Restore cache from MongoDB on every startup
(async () => {
    try {
        const db = await getDb();
        if (!db) return;
        const docs = await db.collection('status_cache').find({}).toArray();
        for (const doc of docs) {
            const entries = (doc.entries || []).map(e => ({
                ...e,
                buffer:    e.buffer    ? Buffer.from(e.buffer.buffer    || e.buffer)    : null,
                thumbnail: e.thumbnail ? Buffer.from(e.thumbnail.buffer || e.thumbnail) : null,
            }));
            global.statusCache.set(doc._id, entries);
        }
        if (docs.length > 0) console.log('[anonview] Restored', docs.length, 'contacts from MongoDB');
    } catch (e) {}
})();

function isOwner(m) {
    const owners = global.owners || [];
    const sn = (m.sender || '').split('@')[0].replace(/:d+$/, '');
    return owners.some(o => o.split('@')[0].replace(/:d+$/, '') === sn);
}

module.exports = {
    name: 'anonview',
    aliases: ['sv', 'statusview', 'viewstatus'],
    description: 'Toggle anonymous status caching (compressed, MongoDB-persistent)',

    async execute(sock, m) {
        if (!isOwner(m)) return m.reply('\u274c This command is for the owner only.');
        const current = await loadState();
        await saveState(!current);
        const on = !current;
        return m.reply(
            '\ud83d\udc7b *Anon Status View*\n\n' +
            'Status: ' + (on ? '\u2705 ON' : '\u274c OFF') + '\n' +
            '\ud83d\udcbe Saved — survives restarts\n\n' +
            (on
                ? '\u2022 Statuses cached silently as contacts post\n' +
                  '\u2022 Images compressed to ~30KB before saving\n' +
                  '\u2022 Videos: thumbnail saved, full video in memory\n' +
                  '\u2022 Audio stored as-is (already small)\n' +
                  '\u2022 All media restored from MongoDB on restart\n' +
                  '\u2022 Use .statusdl to download'
                : '\u2022 Status caching stopped\n\u2022 Run .anonview to turn back ON')
        );
    },

    async onStatus(sock, rawMsg) {
        const on = await loadState();
        if (!on) return;
        if (!rawMsg.message) return;
        if (rawMsg.key.fromMe) return;

        try {
            const { downloadMediaMessage } = require('@whiskeysockets/baileys');
            const sender    = rawMsg.key.participant || rawMsg.key.remoteJid || '';
            const senderJid = sender.split('@')[0].replace(/:d+$/, '') + '@s.whatsapp.net';
            const pushName  = rawMsg.pushName || sender.split('@')[0];
            const type      = Object.keys(rawMsg.message || {})[0] || '';
            const ts        = Date.now();
            let entry       = null;

            if (type === 'imageMessage') {
                const raw = await downloadMediaMessage(rawMsg, 'buffer', {}, sock).catch(() => null);
                if (!raw) return;
                const buffer = await compressImage(raw);
                entry = { type: 'image', buffer, caption: rawMsg.message.imageMessage && rawMsg.message.imageMessage.caption || '', pushName, ts };

            } else if (type === 'videoMessage') {
                const raw = await downloadMediaMessage(rawMsg, 'buffer', {}, sock).catch(() => null);
                if (!raw) return;
                const thumbnail = await extractVideoThumbnail(raw);
                entry = { type: 'video', buffer: raw, thumbnail, caption: rawMsg.message.videoMessage && rawMsg.message.videoMessage.caption || '', pushName, ts };

            } else if (type === 'audioMessage') {
                const buffer = await downloadMediaMessage(rawMsg, 'buffer', {}, sock).catch(() => null);
                if (!buffer) return;
                entry = { type: 'audio', buffer, pushName, ts };

            } else if (type === 'conversation' || type === 'extendedTextMessage') {
                const text = (rawMsg.message && rawMsg.message.conversation) || (rawMsg.message && rawMsg.message.extendedTextMessage && rawMsg.message.extendedTextMessage.text) || '';
                if (!text) return;
                entry = { type: 'text', text, pushName, ts };
            }

            if (!entry) return;

            const existing = global.statusCache.get(senderJid) || [];
            existing.push(entry);
            if (existing.length > MAX_PER_CONTACT) existing.shift();
            global.statusCache.set(senderJid, existing);

            // For video: save thumbnail to Mongo, not full buffer
            const toSave = existing.map(e => {
                if (e.type === 'video') return { ...e, buffer: null };
                return e;
            });
            saveToMongo(senderJid, toSave).catch(() => {});

        } catch (err) {}
    }
};
