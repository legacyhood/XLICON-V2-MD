const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, generateWAMessageFromContent, fetchLatestWaWebVersion, fetchLatestBaileysVersion, proto } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const http = require('http');
const QRCode = require('qrcode');
const { Boom } = require('@hapi/boom');
const zlib = require('zlib');
const serializeMessage = require('./handler.js');

global.generateWAMessageFromContent = generateWAMessageFromContent;
global.proto = proto;
require('./config');

global.BOT_PREFIX = '.';
global.ANON_READ = false;

const AUTH_FOLDER = './session';
const PLUGIN_FOLDER = './plugins';
const PORT = process.env.PORT || 3000;

// ── Live log capture ─────────────────────────────────────────────────────────
const LOG_BUFFER = [];
const LOG_MAX = 600;
function pushLog(level, args) {
    const line = args.map(a => (typeof a === 'string' ? a : require('util').inspect(a, { depth: 2 }))).join(' ');
    LOG_BUFFER.push({ t: Date.now(), level, line });
    if (LOG_BUFFER.length > LOG_MAX) LOG_BUFFER.shift();
}
const _clog = console.log.bind(console);
const _cerr = console.error.bind(console);
const _cwarn = console.warn.bind(console);
console.log   = (...a) => { pushLog('info',  a); _clog(...a); };
console.error = (...a) => { pushLog('error', a); _cerr(...a); };
console.warn  = (...a) => { pushLog('warn',  a); _cwarn(...a); };

let latestQR = '';
let botStatus = 'disconnected';
let presenceInterval = null;
let sock = null;
let reconnectAttempts = 0;
let generation = 0;
let startBotCalled = false;

// ── In-memory message store ──────────────────────────────────────────────────
const msgStore = new Map();
function storeMsg(msg) {
    if (!msg?.key?.id || !msg.message) return;
    msgStore.set(msg.key.id, msg.message);
    if (msgStore.size > 1000) msgStore.delete(msgStore.keys().next().value);
}

// ── MongoDB session ──────────────────────────────────────────────────────────
async function saveSessionToMongo(bundle) {
    if (!process.env.MONGO_URI) return;
    try {
        const { MongoClient } = require('mongodb');
        const c = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000, socketTimeoutMS: 5000 });
        await c.connect();
        await c.db('xlicon_bot').collection('sessions').replaceOne(
            { _id: 'main_session' },
            { _id: 'main_session', session: bundle, updatedAt: new Date() },
            { upsert: true }
        );
        await c.close();
    } catch (e) { console.error('[MongoDB] Session save failed:', e.message); }
}

async function loadSessionFromMongo() {
    if (!process.env.MONGO_URI) return null;
    try {
        const { MongoClient } = require('mongodb');
        const c = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000, socketTimeoutMS: 5000 });
        await c.connect();
        const doc = await c.db('xlicon_bot').collection('sessions').findOne({ _id: 'main_session' });
        await c.close();
        return doc?.session || null;
    } catch (e) { console.error('[MongoDB] Session load failed:', e.message); return null; }
}

async function loadStatusCacheFromMongo() {
    if (!process.env.MONGO_URI) return;
    try {
        const { MongoClient } = require('mongodb');
        const c = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000, socketTimeoutMS: 5000 });
        await c.connect();
        const docs = await c.db('xlicon_bot').collection('status_cache').find({}).toArray();
        await c.close();
        global.statusCache = global.statusCache || new Map();
        for (const doc of docs) {
            const entries = (doc.entries || []).map(e => ({
                ...e,
                buffer: e.buffer ? Buffer.from(e.buffer.buffer || e.buffer) : undefined
            }));
            global.statusCache.set(doc._id, entries);
        }
        if (docs.length) console.log(`[MongoDB] Status cache restored: ${docs.length} contact(s)`);
    } catch (e) { console.error('[MongoDB] Status cache load failed:', e.message); }
}

// ── Build full session bundle from disk ──────────────────────────────────────
function buildSessionBundle() {
    const sessionDir = path.join(__dirname, 'session');
    const bundle = {};
    try {
        const files = fs.readdirSync(sessionDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
            bundle[file] = JSON.parse(fs.readFileSync(path.join(sessionDir, file), 'utf8'));
        }
    } catch (_) {}
    return bundle;
}

// ── Restore session synchronously before anything else starts ────────────────
function decompressSession(raw) {
    if (typeof raw !== 'string') return raw;
    if (raw.startsWith('XLICON_GZ:')) {
        const buf = Buffer.from(raw.slice(10), 'base64');
        return zlib.gunzipSync(buf).toString('utf8');
    }
    return raw;
}

function restoreSessionSync() {
    if (fs.existsSync(__dirname + '/session/creds.json')) {
        console.log('[Session] Session files already present on disk');
        return;
    }
    const sessionJson = global.sessionid;
    if (!sessionJson) {
        console.log('[Session] No SESSION_ID set — will show QR code');
        return;
    }
    try {
        fs.mkdirSync(__dirname + '/session', { recursive: true });
        const decompressed = decompressSession(sessionJson);
        const parsed = typeof decompressed === 'string' ? JSON.parse(decompressed) : decompressed;
        if (parsed['creds.json']) {
            for (const [filename, content] of Object.entries(parsed)) {
                fs.writeFileSync(
                    path.join(__dirname, 'session', filename),
                    JSON.stringify(content, null, 2)
                );
            }
            console.log('[Session] Restored', Object.keys(parsed).length, 'session file(s) from SESSION_ID');
        } else {
            fs.writeFileSync(__dirname + '/session/creds.json', JSON.stringify(parsed, null, 2));
            console.log('[Session] Restored from legacy SESSION_ID (creds.json only)');
        }
    } catch (e) {
        console.error('[Session] Restore error:', e.message);
    }
}

// ── Load MongoDB session async (always preferred over SESSION_ID env var) ─────
async function restoreSessionFromMongo() {
    if (fs.existsSync(__dirname + '/session/creds.json')) return;
    const sessionJson = await loadSessionFromMongo();
    if (!sessionJson) return;
    try {
        fs.mkdirSync(__dirname + '/session', { recursive: true });
        const decompressed = decompressSession(sessionJson);
        const parsed = typeof decompressed === 'string' ? JSON.parse(decompressed) : decompressed;
        if (parsed['creds.json']) {
            for (const [filename, content] of Object.entries(parsed)) {
                fs.writeFileSync(path.join(__dirname, 'session', filename), JSON.stringify(content, null, 2));
            }
            console.log('[Session] Restored', Object.keys(parsed).length, 'file(s) from MongoDB');
        } else {
            fs.writeFileSync(__dirname + '/session/creds.json', JSON.stringify(parsed, null, 2));
            console.log('[Session] Restored from MongoDB (legacy format)');
        }
    } catch (e) { console.error('[Session] MongoDB restore error:', e.message); }
}

async function clearSession() {
    try { fs.rmSync(AUTH_FOLDER, { recursive: true, force: true }); } catch(_) {}
    if (process.env.MONGO_URI) {
        try {
            const { MongoClient } = require('mongodb');
            const c = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000, socketTimeoutMS: 5000 });
            await c.connect();
            await c.db('xlicon_bot').collection('sessions').deleteOne({ _id: 'main_session' });
            await c.close();
            console.log('[Session] Cleared from MongoDB');
        } catch(e) { console.error('[Session] MongoDB clear failed:', e.message); }
    }
}

function startBot() {
    if (startBotCalled && sock) return; // prevent double-start
    startBotCalled = true;
    console.log('[Bot] Starting...');
    if (sock) { try { sock.ws?.terminate(); } catch(_) {} sock = null; }
    const myGen = ++generation;
    if (!fs.existsSync(AUTH_FOLDER)) fs.mkdirSync(AUTH_FOLDER, { recursive: true });

    (async () => {
        try {
            console.log('[Bot] Fetching WA version...');
            const { version } = await fetchLatestWaWebVersion().catch(async (e) => {
                console.warn('[Bot] fetchLatestWaWebVersion failed:', e.message, '— falling back');
                return fetchLatestBaileysVersion();
            });
            console.log('[Bot] WA version:', version?.join?.('.') || version);

            const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
            console.log('[Bot] Auth state loaded, creating socket...');

            sock = makeWASocket({
                version,
                logger: pino({ level: 'silent' }),
                auth: state,
                keepAliveIntervalMs: 10000,
                markOnlineOnConnect: true,
                syncFullHistory: false,
                browser: ['XLICON-V2-MD', 'Chrome', '1.0.0'],
                getMessage: async (key) => {
                    if (msgStore.has(key.id)) return msgStore.get(key.id);
                    return proto.Message.fromObject({});
                }
            });

            sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
                if (generation !== myGen) return;
                if (qr) {
                    console.log('[Bot] QR code received');
                    QRCode.toDataURL(qr, (err, url) => { if (!err) latestQR = url; });
                }
                if (connection === 'close') {
                    botStatus = 'disconnected';
                    latestQR = '';
                    startBotCalled = false;
                    if (presenceInterval) { clearInterval(presenceInterval); presenceInterval = null; }
                    const code = (lastDisconnect?.error instanceof Boom) ? lastDisconnect.error.output.statusCode : 0;
                    console.log('[Bot] Disconnected, code:', code, 'reason:', lastDisconnect?.error?.message || 'unknown', 'attempt:', reconnectAttempts + 1);
                    if (code === DisconnectReason.loggedOut || code === 401) {
                        // WhatsApp explicitly logged us out — only then clear session
                        console.log('[Bot] Logged out by WhatsApp — clearing session for fresh QR');
                        await clearSession();
                        reconnectAttempts = 0;
                        setTimeout(startBot, 3000);
                    } else {
                        // Network blip, Railway restart, etc. — keep the same session and retry
                        reconnectAttempts++;
                        const delay = Math.min(5000 * reconnectAttempts, 60000); // backoff up to 60s
                        console.log('[Bot] Retrying in', delay / 1000 + 's', '(keeping session)...');
                        setTimeout(startBot, delay);
                    }
                } else if (connection === 'open') {
                    botStatus = 'connected';
                    reconnectAttempts = 0;
                    global.botStartTime = Date.now();
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
                    console.log('[Bot] Connecting to WhatsApp...');
                }
            });

            sock.ev.on('creds.update', async () => {
                await saveCreds();
                const bundle = buildSessionBundle();
                if (bundle['creds.json']) {
                    saveSessionToMongo(JSON.stringify(bundle)).catch(() => {});
                }
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

            sock.ev.on('messages.delete', async (item) => {
                try {
                    const ad = plugins.get('antidelete');
                    if (!ad?.onDelete) return;
                    const keys = Array.isArray(item) ? item : (item.keys || []);
                    if (keys.length) await ad.onDelete(sock, keys);
                } catch (e) { console.error('[antidelete]', e.message); }
            });

            sock.ev.on('group-participants.update', async (update) => {
                try {
                    const wp = plugins.get('welcome');
                    if (wp?.onGroupUpdate) await wp.onGroupUpdate(sock, update);
                } catch (e) { console.error('[welcome]', e.message); }
            });

            sock.ev.on('messages.upsert', async ({ messages, type }) => {
                if (!['notify', 'append', 'prepend'].includes(type)) return;
                for (const rawMsg of messages) {
                    try {
                        if (rawMsg.key?.remoteJid === 'status@broadcast') {
                            const av = plugins.get('anonview');
                            if (av?.onStatus) av.onStatus(sock, rawMsg, null).catch(() => {});
                            continue;
                        }
                        if (!rawMsg.message) continue;
                        storeMsg(rawMsg);
                        {
                            const _voTypes = ['viewOnceMessage','viewOnceMessageV2','viewOnceMessageV2Extension'];
                            if (!rawMsg.key.fromMe && _voTypes.some(t => rawMsg.message[t])) {
                                const _vop = plugins.get('viewonce');
                                if (_vop?.onAutoViewOnce) _vop.onAutoViewOnce(sock, rawMsg).catch(() => {});
                            }
                        }
                        const unwrap = (msg) => {
                            for (const w of ['ephemeralMessage','viewOnceMessage','viewOnceMessageV2','viewOnceMessageV2Extension','documentWithCaptionMessage','editedMessage']) {
                                if (msg[w]?.message) return unwrap(msg[w].message);
                            }
                            return msg;
                        };
                        rawMsg.message = unwrap(rawMsg.message);
                        let m;
                        try {
                            m = await serializeMessage(sock, rawMsg);
                        } catch (err) {
                            console.error('[serialize]', err.message);
                            continue;
                        }
                        if (m.body && m.body.startsWith(global.BOT_PREFIX)) {
                            const parts = m.body.slice(global.BOT_PREFIX.length).trim().split(/\s+/);
                            const cmdName = parts.shift().toLowerCase();
                            const args = parts;
                            const plugin = plugins.get(cmdName);
                            if (plugin) {
                                try {
                                    await plugin.execute(sock, m, args);
                                } catch (err) {
                                    console.error(`[CMD:${cmdName}]`, err.message);
                                    try { await m.reply(`⚠️ Error in command *${cmdName}*: ${err.message.slice(0,100)}`); } catch (_) {}
                                }
                            }
                            continue;
                        }
                        if (rawMsg.key?.fromMe) continue;
                        for (const plugin of new Set(plugins.values())) {
                            if (typeof plugin.onMessage !== 'function') continue;
                            try {
                                await Promise.race([
                                    plugin.onMessage(sock, m),
                                    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
                                ]);
                            } catch (err) {
                                if (err.message !== 'timeout') console.error(`[onMessage:${plugin.name}]`, err.message);
                            }
                        }
                    } catch (outerErr) {
                        console.error('[Handler] Outer error:', outerErr.message);
                    }
                }
            });

        } catch (err) {
            console.error('[Bot] Startup error:', err.message, err.stack?.split('\n')[1] || '');
            startBotCalled = false;
            setTimeout(startBot, 10000);
        }
    })();
}

// ── HTTP server ──────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/qr') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html><html><head><title>XLICON-V2-MD</title><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;background:#111;color:#eee;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;box-sizing:border-box}h1{color:#25d366}#qr img{max-width:280px;border:6px solid #25d366;border-radius:12px;background:#fff;padding:10px}#qr .msg{font-size:1.1em;color:#25d366;padding:30px;border:2px dashed #25d366;border-radius:12px;text-align:center}#status{margin-top:16px;padding:8px 20px;border-radius:20px;font-weight:bold}.connected{background:#25d366;color:#000}.waiting{background:#333;color:#aaa}#sb{display:none;margin-top:20px;width:100%;max-width:580px}#sb h3{color:#25d366}#sb textarea{width:100%;height:110px;background:#222;color:#eee;border:1px solid #25d366;border-radius:8px;padding:10px;font-size:12px;resize:vertical;box-sizing:border-box}#sb button{margin-top:8px;padding:10px 20px;background:#25d366;color:#000;border:none;border-radius:8px;cursor:pointer;font-weight:bold}#resetBtn{margin-top:16px;padding:10px 24px;background:#e53935;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:14px;display:block;width:100%;max-width:260px}</style></head><body><h1>🤖 XLICON-V2-MD</h1><div id="qr"><div class="msg">⏳ Loading...</div></div><div id="status" class="waiting">Starting...</div><div id="sb"><h3>✅ Connected — Save your Session ID</h3><textarea id="sv" readonly></textarea><br><button onclick="const t=document.getElementById('sv');t.select();document.execCommand('copy')">Copy</button></div><button id="resetBtn" onclick="resetSession()">🔄 Reset Session (New QR)</button><p id="resetMsg" style="color:#e53935;font-size:13px;display:none">Clearing session... reload in 5 seconds</p><script>async function resetSession(){if(!confirm('Clear the current session and show a fresh QR code?'))return;document.getElementById('resetMsg').style.display='block';await fetch('/api/reset',{method:'POST'});setTimeout(()=>location.reload(),5000);}async function poll(){try{const r=await fetch('/api/status');const d=await r.json();const q=document.getElementById('qr');const s=document.getElementById('status');if(d.status==='connected'){q.innerHTML='<div class="msg">✅ Bot Connected!</div>';s.textContent='Connected ✅';s.className='connected';const sr=await fetch('/api/session');const sj=await sr.json();if(sj.session){document.getElementById('sb').style.display='block';document.getElementById('sv').value=sj.session;}}else if(d.hasQR&&d.qr){q.innerHTML='<img src="'+d.qr+'" alt="QR">';s.textContent='Scan QR code ↑';s.className='waiting';}else{q.innerHTML='<div class="msg">⏳ Connecting...</div>';s.textContent=d.status;s.className='waiting';}}catch(e){}setTimeout(poll,4000);}poll();</script></body></html>`);
    } else if (req.url === '/api/status') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ status: botStatus, hasQR: !!latestQR, qr: latestQR, prefix: global.BOT_PREFIX, uptime: process.uptime() }));
    } else if (req.url === '/api/reset' && req.method === 'POST') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true, message: 'Clearing session and restarting...' }));
        console.log('[Session] Manual reset triggered via web UI');
        startBotCalled = false;
        setTimeout(async () => {
            await clearSession();
            startBot();
        }, 500);
    } else if (req.url === '/api/session') {
        const cp = path.join(__dirname, 'session', 'creds.json');
        if (fs.existsSync(cp)) {
            try {
                const bundle = buildSessionBundle();
                const raw = JSON.stringify(bundle);
                const compressed = zlib.gzipSync(Buffer.from(raw, 'utf8'));
                const sessionId = 'XLICON_GZ:' + compressed.toString('base64');
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ session: sessionId, fileCount: Object.keys(bundle).length, originalSize: raw.length, compressedSize: sessionId.length }));
            } catch (e) {
                res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
            }
        } else {
            res.writeHead(404); res.end(JSON.stringify({ error: 'No session yet' }));
        }
    } else if (req.url.startsWith('/api/logs')) {
        const params = new URL(req.url, 'http://localhost').searchParams;
        const since = parseInt(params.get('since') || '0', 10);
        const entries = since ? LOG_BUFFER.filter(e => e.t > since) : LOG_BUFFER;
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ logs: entries, serverTime: Date.now() }));
    } else if (req.url === '/logs') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html><html><head><title>XLICON Logs</title><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Courier New',monospace;background:#0d0d0d;color:#d4d4d4;display:flex;flex-direction:column;height:100vh}header{background:#111;border-bottom:1px solid #222;padding:12px 16px;display:flex;align-items:center;gap:12px;flex-shrink:0}header h1{color:#25d366;font-size:15px;font-weight:700;letter-spacing:.5px}#pill{padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;background:#1a3a1a;color:#25d366}#controls{margin-left:auto;display:flex;gap:8px}button{padding:5px 12px;border:1px solid #333;border-radius:6px;background:#1a1a1a;color:#aaa;cursor:pointer;font-size:12px}button:hover{background:#252525;color:#eee}button.active{background:#1a3a1a;color:#25d366;border-color:#25d366}#log{flex:1;overflow-y:auto;padding:10px 14px;display:flex;flex-direction:column;gap:1px}#log:empty::after{content:"Waiting for logs...";color:#444;font-size:13px;margin-top:20px}.entry{display:flex;gap:10px;font-size:12px;line-height:1.55;padding:1px 0;border-bottom:1px solid #141414}.ts{color:#555;flex-shrink:0;user-select:none}.lvl{flex-shrink:0;width:42px;font-weight:600}.lvl.info{color:#4ec9b0}.lvl.error{color:#f48771}.lvl.warn{color:#dcdcaa}.text{white-space:pre-wrap;word-break:break-all;flex:1}.text.error{color:#f48771}.text.warn{color:#dcdcaa}footer{background:#111;border-top:1px solid #222;padding:8px 16px;font-size:11px;color:#444;flex-shrink:0;display:flex;align-items:center;gap:12px}#count{margin-left:auto}</style></head><body><header><h1>🤖 XLICON-V2-MD — Live Logs</h1><span id="pill">LIVE</span><div id="controls"><button id="autoBtn" class="active" onclick="toggleAuto()">⏸ Pause</button><button onclick="clearView()">🗑 Clear view</button><button onclick="location.href='/'">← Bot</button></div></header><div id="log"></div><footer><span id="status">Connecting...</span><span id="count">0 entries</span></footer><script>let since=0,auto=true,count=0,paused=false;const box=document.getElementById('log');function fmt(ts){const d=new Date(ts);return d.toTimeString().slice(0,8)+'.'+(d.getMilliseconds()+'').padStart(3,'0');}function appendLogs(logs){if(!logs.length)return;if(paused)return;const atBottom=box.scrollHeight-box.scrollTop-box.clientHeight<60;const frag=document.createDocumentFragment();for(const e of logs){const el=document.createElement('div');el.className='entry';el.innerHTML='<span class="ts">'+fmt(e.t)+'</span><span class="lvl '+e.level+'">'+e.level+'</span><span class="text '+e.level+'">'+e.line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</span>';frag.appendChild(el);count++;}box.appendChild(frag);document.getElementById('count').textContent=count+' entries';if(atBottom)box.scrollTop=box.scrollHeight;}function clearView(){box.innerHTML='';count=0;document.getElementById('count').textContent='0 entries';}function toggleAuto(){paused=!paused;const btn=document.getElementById('autoBtn');btn.textContent=paused?'▶ Resume':'⏸ Pause';btn.className=paused?'':'active';}async function poll(){try{const r=await fetch('/api/logs?since='+since);const d=await r.json();if(d.logs&&d.logs.length){appendLogs(d.logs);since=d.serverTime;}document.getElementById('status').textContent='Live — last update '+new Date().toTimeString().slice(0,8);}catch(e){document.getElementById('status').textContent='Connection error — retrying...';}setTimeout(poll,2000);}poll();<\/script></body></html>`);
    } else {
        res.writeHead(404); res.end(JSON.stringify({ error: 'Not found' }));
    }
});

// ── Startup sequence ─────────────────────────────────────────────────────────
// 1. Restore session synchronously (SESSION_ID env var)
restoreSessionSync();

// 2. Load config overrides
try {
    const cp = path.join(__dirname, 'config.json');
    if (fs.existsSync(cp)) {
        const cfg = JSON.parse(fs.readFileSync(cp, 'utf8'));
        if (cfg.prefix) global.BOT_PREFIX = cfg.prefix;
        if (Array.isArray(cfg.owners) && cfg.owners.length) global.owners = cfg.owners;
    }
} catch (_) {}

// 3. Start HTTP server
server.listen(PORT, () => {
    console.log('[Server] Listening on port', PORT);
    console.log('[Startup] MONGO_URI set:', !!process.env.MONGO_URI);

    // Hard 8-second timeout — bot starts no matter what
    const deadline = new Promise(resolve => setTimeout(resolve, 8000));

    const preBot = (async () => {
        try {
            await restoreSessionFromMongo();
        } catch (e) {
            console.error('[Startup] restoreSessionFromMongo error:', e.message);
        }
        try {
            await loadStatusCacheFromMongo();
        } catch (e) {
            console.error('[Startup] loadStatusCacheFromMongo error:', e.message);
        }
    })();

    Promise.race([preBot, deadline]).then(() => {
        console.log('[Startup] Launching bot...');
        startBot();
    }).catch(e => {
        console.error('[Startup] Pre-bot failed:', e.message);
        startBot();
    });
});

process.on('uncaughtException', err => console.error('[uncaughtException]', err.message, err.stack?.split('\n')[1] || ''));
process.on('unhandledRejection', reason => console.error('[unhandledRejection]', reason?.message || reason));
