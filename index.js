const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, generateWAMessageFromContent, fetchLatestWaWebVersion, proto } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const http = require('http');
const QRCode = require('qrcode');
const { Boom } = require('@hapi/boom');
const serializeMessage = require('./handler.js');

global.generateWAMessageFromContent = generateWAMessageFromContent;
global.proto = proto;
require('./config');

global.BOT_PREFIX = '.';
global.ANON_READ = false;

const AUTH_FOLDER = './session';
const PLUGIN_FOLDER = './plugins';
const PORT = process.env.PORT || 3000;

let latestQR = '';
let botStatus = 'disconnected';
let presenceInterval = null;
let sock = null;

// ── In-memory message store (fixes "Waiting for this message") ──────────────
const msgStore = new Map();
function storeMsg(msg) {
    if (!msg?.key?.id || !msg.message) return;
    msgStore.set(msg.key.id, msg.message);
    if (msgStore.size > 1000) msgStore.delete(msgStore.keys().next().value);
}

// ── MongoDB session ──────────────────────────────────────────────────────────
async function saveSessionToMongo(sessionJson) {
    if (!process.env.MONGO_URI) return;
    try {
        const { MongoClient } = require('mongodb');
        const c = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        await c.connect();
        await c.db('xlicon_bot').collection('sessions').replaceOne(
            { _id: 'main_session' },
            { _id: 'main_session', session: sessionJson, updatedAt: new Date() },
            { upsert: true }
        );
        await c.close();
    } catch (e) { console.error('[MongoDB] Session save failed:', e.message); }
}

async function loadSessionFromMongo() {
    if (!process.env.MONGO_URI) return null;
    try {
        const { MongoClient } = require('mongodb');
        const c = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        await c.connect();
        const doc = await c.db('xlicon_bot').collection('sessions').findOne({ _id: 'main_session' });
        await c.close();
        return doc?.session || null;
    } catch (e) { console.error('[MongoDB] Session load failed:', e.message); return null; }
}

// ── Restore session if needed ────────────────────────────────────────────────
(async () => {
    if (!fs.existsSync(__dirname + '/session/creds.json')) {
        const sessionJson = global.sessionid || await loadSessionFromMongo();
        if (sessionJson) {
            try {
                fs.mkdirSync(__dirname + '/session', { recursive: true });
                const parsed = typeof sessionJson === 'string' ? JSON.parse(sessionJson) : sessionJson;
                fs.writeFileSync(__dirname + '/session/creds.json', JSON.stringify(parsed, null, 2));
                console.log('[Session] Restored from MongoDB');
            } catch (e) { console.error('[Session] Restore error:', e.message); }
        }
    }
})();

function loadPrefix() {
    try {
        const cp = path.join(__dirname, 'config.json');
        if (fs.existsSync(cp)) {
            const cfg = JSON.parse(fs.readFileSync(cp, 'utf8'));
            if (cfg.prefix) { global.BOT_PREFIX = cfg.prefix; console.log('Prefix:', global.BOT_PREFIX); }
        }
    } catch (_) {}
    startBot();
}

function startBot() {
    console.log('[Bot] Starting...');
    if (!fs.existsSync(AUTH_FOLDER)) fs.mkdirSync(AUTH_FOLDER, { recursive: true });

    (async () => {
        try {
            const { version } = await fetchLatestWaWebVersion().catch(() => ({ version: [2, 3000, 1015901307] }));
            console.log('[Bot] WA version:', version.join('.'));

            const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

            sock = makeWASocket({
                version,
                logger: pino({ level: 'silent' }),
                auth: state,
                printQRInTerminal: true,
                keepAliveIntervalMs: 10000,
                markOnlineOnConnect: true,
                syncFullHistory: false,
                browser: ['XLICON-V2-MD', 'Chrome', '1.0.0'],
                getMessage: async (key) => {
                    if (msgStore.has(key.id)) return msgStore.get(key.id);
                    return proto.Message.fromObject({});
                }
            });

            // ── Connection ───────────────────────────────────────────────────
            sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
                if (qr) QRCode.toDataURL(qr, (err, url) => { if (!err) latestQR = url; });
                if (connection === 'close') {
                    botStatus = 'disconnected';
                    if (presenceInterval) { clearInterval(presenceInterval); presenceInterval = null; }
                    const code = (lastDisconnect?.error instanceof Boom) ? lastDisconnect.error.output.statusCode : 0;
                    console.log('[Bot] Disconnected, code:', code);
                    if (code !== DisconnectReason.loggedOut) {
                        setTimeout(startBot, 5000);
                    } else {
                        try { fs.rmSync(AUTH_FOLDER, { recursive: true, force: true }); } catch(_) {}
                        setTimeout(startBot, 3000);
                    }
                } else if (connection === 'open') {
                    botStatus = 'connected';
                    console.log('[Bot] Connected as', sock.user?.id);
                    presenceInterval = setInterval(() => {
                        if (sock?.ws?.readyState === 1) sock.sendPresenceUpdate('available').catch(() => {});
                    }, 10000);
                    try {
                        await sock.sendMessage(sock.user.id, {
                            text: `✅ *XLICON-V2-MD Online!*\nPrefix: ${global.BOT_PREFIX}`
                        });
                    } catch (_) {}
                } else if (connection === 'connecting') {
                    botStatus = 'connecting';
                }
            });

            sock.ev.on('creds.update', async () => {
                await saveCreds();
                const cp = path.join(AUTH_FOLDER, 'creds.json');
                if (fs.existsSync(cp)) saveSessionToMongo(fs.readFileSync(cp, 'utf8')).catch(() => {});
            });

            // ── Load plugins ─────────────────────────────────────────────────
            const plugins = new Map();
            const pluginPath = path.join(__dirname, PLUGIN_FOLDER);
            if (fs.existsSync(pluginPath)) {
                const files = fs.readdirSync(pluginPath).filter(f => f.endsWith('.js'));
                for (const file of files) {
                    try {
                        const p = require(path.join(pluginPath, file));
                        if (p && p.name && typeof p.execute === 'function') {
                            plugins.set(p.name.toLowerCase(), p);
                            if (Array.isArray(p.aliases)) {
                                p.aliases.forEach(a => plugins.set(a.toLowerCase(), p));
                            }
                        }
                    } catch (err) {
                        console.error('[Plugin] Failed to load', file + ':', err.message);
                    }
                }
                console.log('[Bot] Plugins loaded:', plugins.size);
            }

            // ── Anti-delete ──────────────────────────────────────────────────
            sock.ev.on('messages.delete', async (item) => {
                try {
                    const ad = plugins.get('antidelete');
                    if (!ad?.onDelete) return;
                    const keys = Array.isArray(item) ? item : (item.keys || []);
                    if (keys.length) await ad.onDelete(sock, keys);
                } catch (e) { console.error('[antidelete]', e.message); }
            });

            // ── Group participants update (welcome/goodbye) ───────────────────
            sock.ev.on('group-participants.update', async (update) => {
                try {
                    const wp = plugins.get('welcome');
                    if (wp?.onGroupUpdate) await wp.onGroupUpdate(sock, update);
                } catch (e) { console.error('[welcome]', e.message); }
            });

            // ── Message handler ───────────────────────────────────────────────
            sock.ev.on('messages.upsert', async ({ messages, type }) => {
                // Accept notify (new), append, and prepend (history)
                if (!['notify', 'append', 'prepend'].includes(type)) return;

                for (const rawMsg of messages) {
                    try {
                        // Status broadcasts → anonview only
                        if (rawMsg.key?.remoteJid === 'status@broadcast') {
                            const av = plugins.get('anonview');
                            if (av?.onStatus) av.onStatus(sock, rawMsg, null).catch(() => {});
                            continue;
                        }

                        if (!rawMsg.message) continue;
                        storeMsg(rawMsg);

                        // Unwrap view-once, ephemeral etc.
                        const unwrap = (msg) => {
                            for (const w of ['ephemeralMessage','viewOnceMessage','viewOnceMessageV2','viewOnceMessageV2Extension','documentWithCaptionMessage','editedMessage']) {
                                if (msg[w]?.message) return unwrap(msg[w].message);
                            }
                            return msg;
                        };
                        rawMsg.message = unwrap(rawMsg.message);

                        // Serialize
                        let m;
                        try {
                            m = await serializeMessage(sock, rawMsg);
                        } catch (err) {
                            console.error('[serialize]', err.message);
                            continue;
                        }

                        console.log(`[MSG] from=${m.sender} body="${(m.body||'').slice(0,60)}"`);

                        // ── Command routing ───────────────────────────────────
                        if (m.body && m.body.startsWith(global.BOT_PREFIX)) {
                            const parts = m.body.slice(global.BOT_PREFIX.length).trim().split(/\s+/);
                            const cmdName = parts.shift().toLowerCase();
                            const args = parts;
                            const plugin = plugins.get(cmdName);

                            if (plugin) {
                                try {
                                    await plugin.execute(sock, m, args);
                                    // Silently try to delete the command message (don't crash if it fails)
                                    setTimeout(() => {
                                        sock.sendMessage(m.from, { delete: m.key }).catch(() => {});
                                    }, 500);
                                } catch (err) {
                                    console.error(`[CMD:${cmdName}]`, err.message);
                                    try { await m.reply(`⚠️ Error in command *${cmdName}*: ${err.message.slice(0,100)}`); } catch (_) {}
                                }
                            }
                            // Don't run onMessage hooks for commands
                            continue;
                        }

                        // ── onMessage hooks (non-command messages) ────────────
                        for (const plugin of new Set(plugins.values())) {
                            if (typeof plugin.onMessage !== 'function') continue;
                            try {
                                await Promise.race([
                                    plugin.onMessage(sock, m),
                                    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
                                ]);
                            } catch (err) {
                                if (err.message !== 'timeout') {
                                    console.error(`[onMessage:${plugin.name}]`, err.message);
                                }
                            }
                        }

                    } catch (outerErr) {
                        console.error('[Handler] Outer error:', outerErr.message);
                    }
                }
            });

        } catch (err) {
            console.error('[Bot] Startup error:', err.message);
            setTimeout(startBot, 10000);
        }
    })();
}

// ── HTTP server ──────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/qr') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<!DOCTYPE html><html><head><title>XLICON-V2-MD</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;background:#111;color:#eee;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;box-sizing:border-box}h1{color:#25d366}#qr img{max-width:280px;border:6px solid #25d366;border-radius:12px;background:#fff;padding:10px}#qr .msg{font-size:1.1em;color:#25d366;padding:30px;border:2px dashed #25d366;border-radius:12px;text-align:center}#status{margin-top:16px;padding:8px 20px;border-radius:20px;font-weight:bold}.connected{background:#25d366;color:#000}.waiting{background:#333;color:#aaa}#sb{display:none;margin-top:20px;width:100%;max-width:580px}#sb h3{color:#25d366}#sb textarea{width:100%;height:110px;background:#222;color:#eee;border:1px solid #25d366;border-radius:8px;padding:10px;font-size:12px;resize:vertical;box-sizing:border-box}#sb button{margin-top:8px;padding:10px 20px;background:#25d366;color:#000;border:none;border-radius:8px;cursor:pointer;font-weight:bold}</style></head><body><h1>🤖 XLICON-V2-MD</h1><div id="qr"><div class="msg">⏳ Loading...</div></div><div id="status" class="waiting">Starting...</div><div id="sb"><h3>✅ Connected — Save your Session ID</h3><textarea id="sv" readonly></textarea><br><button onclick="const t=document.getElementById('sv');t.select();document.execCommand('copy')">Copy</button></div><script>async function poll(){try{const r=await fetch('/api/status');const d=await r.json();const q=document.getElementById('qr');const s=document.getElementById('status');if(d.status==='connected'){q.innerHTML='<div class="msg">✅ Bot Connected!</div>';s.textContent='Connected ✅';s.className='connected';const sr=await fetch('/api/session');const sj=await sr.json();if(sj.session){document.getElementById('sb').style.display='block';document.getElementById('sv').value=sj.session;}}else if(d.hasQR&&d.qr){q.innerHTML='<img src="'+d.qr+'" alt="QR">';s.textContent='Scan QR code ↑';s.className='waiting';}else{q.innerHTML='<div class="msg">⏳ Connecting...</div>';s.textContent=d.status;s.className='waiting';}}catch(e){}setTimeout(poll,4000);}poll();</script></body></html>`);
    } else if (req.url === '/api/status') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ status: botStatus, hasQR: !!latestQR, qr: latestQR, prefix: global.BOT_PREFIX, uptime: process.uptime() }));
    } else if (req.url === '/api/session') {
        const cp = path.join(__dirname, 'session', 'creds.json');
        if (fs.existsSync(cp)) {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ session: fs.readFileSync(cp, 'utf8').trim() }));
        } else {
            res.writeHead(404); res.end(JSON.stringify({ error: 'No session yet' }));
        }
    } else {
        res.writeHead(404); res.end(JSON.stringify({ error: 'Not found' }));
    }
});

server.listen(PORT, () => {
    console.log('[Server] Listening on port', PORT);
    loadPrefix();
});

process.on('uncaughtException', err => console.error('[uncaughtException]', err.message));
process.on('unhandledRejection', reason => console.error('[unhandledRejection]', reason?.message || reason));
