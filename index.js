const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage, generateWAMessageFromContent, fetchLatestWaWebVersion, proto } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const http = require('http');
const QRCode = require('qrcode');
const { Boom } = require('@hapi/boom');
const { sendButtons, sendInteractiveMessage } = require('gifted-btns');
const serializeMessage = require('./handler.js');

global.generateWAMessageFromContent = generateWAMessageFromContent;
global.proto = proto;
require('./config');

// ── Session restore ──────────────────────────────────────────────────────────
(async () => {
    if (!fs.existsSync(__dirname + '/session/creds.json')) {
        let sessionJson = global.sessionid || null;
        if (!sessionJson && process.env.MONGO_URI) {
            console.log('[Session] No local session — checking MongoDB...');
            sessionJson = await loadSessionFromMongo();
        }
        if (sessionJson) {
            try {
                const sessionData = JSON.parse(sessionJson);
                fs.mkdirSync(__dirname + '/session', { recursive: true });
                fs.writeFileSync(__dirname + '/session/creds.json', JSON.stringify(sessionData, null, 2));
                console.log('[Session] Session restored successfully');
            } catch (err) {
                console.error('[Session] Error restoring session:', err);
            }
        }
    }
})();

// ── MongoDB ──────────────────────────────────────────────────────────────────
const { MongoClient } = require('mongodb');

async function saveSessionToMongo(sessionJson) {
    if (!process.env.MONGO_URI) return;
    let client;
    try {
        client = new MongoClient(process.env.MONGO_URI);
        await client.connect();
        const db = client.db('xlicon_bot');
        await db.collection('sessions').replaceOne(
            { _id: 'main_session' },
            { _id: 'main_session', session: sessionJson, updatedAt: new Date() },
            { upsert: true }
        );
    } catch (e) {
        console.error('[MongoDB] Session backup failed:', e.message);
    } finally {
        if (client) await client.close();
    }
}

async function loadSessionFromMongo() {
    if (!process.env.MONGO_URI) return null;
    let client;
    try {
        client = new MongoClient(process.env.MONGO_URI);
        await client.connect();
        const db = client.db('xlicon_bot');
        const doc = await db.collection('sessions').findOne({ _id: 'main_session' });
        if (doc && doc.session) return doc.session;
    } catch (e) {
        console.error('[MongoDB] Session load failed:', e.message);
    } finally {
        if (client) await client.close();
    }
    return null;
}
// ─────────────────────────────────────────────────────────────────────────────

global.BOT_PREFIX = '.';
global.ANON_READ = false; // ghost mode — toggled by anonread plugin

const AUTH_FOLDER = './session';
const PLUGIN_FOLDER = './plugins';
const PORT = process.env.PORT || 3000;

let latestQR = '';
let botStatus = 'disconnected';
let presenceInterval = null;
let sock = null;
let isConnecting = false;

// ── In-memory message store (fixes "Waiting for this message" on self-chat) ──
const msgStore = new Map();
const MSG_STORE_LIMIT = 1000;

function storeMsg(msg) {
    if (!msg?.key?.id || !msg.message) return;
    msgStore.set(msg.key.id, msg.message);
    if (msgStore.size > MSG_STORE_LIMIT) {
        msgStore.delete(msgStore.keys().next().value);
    }
}
// ─────────────────────────────────────────────────────────────────────────────

function loadPrefix() {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (config.prefix) {
                global.BOT_PREFIX = config.prefix;
                console.log(`Loaded prefix: ${global.BOT_PREFIX}`);
            }
        } catch (err) {
            console.error('Error loading config:', err);
        }
    }
    startBot();
}

function startBot() {
    console.log('Starting WhatsApp Bot...');
    isConnecting = true;

    if (!fs.existsSync(AUTH_FOLDER)) fs.mkdirSync(AUTH_FOLDER, { recursive: true });

    (async () => {
        try {
            const { version, isLatest } = await fetchLatestWaWebVersion();
            console.log(`Using WA v${version.join('.')}, isLatest: ${isLatest}`);

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
                // Provides encryption keys for retries — fixes "Waiting for this message"
                getMessage: async (key) => {
                    if (msgStore.has(key.id)) return msgStore.get(key.id);
                    return proto.Message.fromObject({});
                }
            });

            // ── Connection updates ─────────────────────────────────────────
            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;
                if (qr) {
                    QRCode.toDataURL(qr, (err, url) => { if (!err) latestQR = url; });
                }
                if (connection === 'close') {
                    botStatus = 'disconnected';
                    isConnecting = false;
                    if (presenceInterval) { clearInterval(presenceInterval); presenceInterval = null; }
                    const statusCode = (lastDisconnect?.error instanceof Boom)
                        ? lastDisconnect.error.output.statusCode : 0;
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                    console.log('Connection closed:', lastDisconnect?.error?.message, '— reconnecting:', shouldReconnect);
                    if (shouldReconnect) {
                        setTimeout(() => startBot(), 5000);
                    } else {
                        if (fs.existsSync(AUTH_FOLDER)) fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
                        setTimeout(() => startBot(), 3000);
                    }
                } else if (connection === 'open') {
                    botStatus = 'connected';
                    isConnecting = false;
                    console.log('Bot connected!');
                    presenceInterval = setInterval(() => {
                        if (sock?.ws?.readyState === 1) sock.sendPresenceUpdate('available');
                    }, 10000);
                    try {
                        await sock.sendMessage(sock.user.id, {
                            text: `✅ Bot linked!\nPrefix: ${global.BOT_PREFIX}\nConnected: ${new Date().toLocaleString()}`
                        });
                    } catch (_) {}
                } else if (connection === 'connecting') {
                    botStatus = 'connecting';
                    isConnecting = true;
                }
            });

            sock.ev.on('creds.update', async () => {
                await saveCreds();
                const cp = path.join(AUTH_FOLDER, 'creds.json');
                if (fs.existsSync(cp)) {
                    await saveSessionToMongo(fs.readFileSync(cp, 'utf8'));
                }
            });

            // ── Load plugins ───────────────────────────────────────────────
            const plugins = new Map();
            const pluginPath = path.join(__dirname, PLUGIN_FOLDER);
            if (fs.existsSync(pluginPath)) {
                const files = fs.readdirSync(pluginPath).filter(f => f.endsWith('.js'));
                for (const file of files) {
                    try {
                        const plugin = require(path.join(pluginPath, file));
                        if (plugin.name && typeof plugin.execute === 'function') {
                            plugins.set(plugin.name.toLowerCase(), plugin);
                            if (Array.isArray(plugin.aliases)) {
                                plugin.aliases.forEach(a => plugins.set(a.toLowerCase(), plugin));
                            }
                            console.log(`Loaded plugin: ${plugin.name}`);
                        }
                    } catch (err) {
                        console.error(`Failed to load plugin ${file}:`, err.message);
                    }
                }
                console.log(`Total plugins loaded: ${plugins.size}`);
            }

            // ── Anti-delete: listen for message deletions ──────────────────
            sock.ev.on('messages.delete', async (item) => {
                const adPlugin = plugins.get('antidelete');
                if (!adPlugin || typeof adPlugin.onDelete !== 'function') return;
                // item is either { keys: [...] } or a single key array
                const keys = Array.isArray(item) ? item : (item.keys || []);
                if (keys.length) await adPlugin.onDelete(sock, keys).catch(console.error);
            });

            // ── Message handler ────────────────────────────────────────────
            sock.ev.on('messages.upsert', async ({ messages, type }) => {
                if (type !== 'notify' && type !== 'append') return;

                for (const rawMsg of messages) {
                    // ── Status broadcasts ──────────────────────────────────
                    if (rawMsg.key.remoteJid === 'status@broadcast') {
                        // Pass to anonview plugin (does NOT call readMessages — truly anonymous)
                        const avPlugin = plugins.get('anonview');
                        if (avPlugin && typeof avPlugin.onStatus === 'function') {
                            await avPlugin.onStatus(sock, rawMsg, null).catch(console.error);
                        }
                        // Do NOT call sock.readMessages() — that sends a "seen" receipt to the poster
                        continue;
                    }

                    if (!rawMsg.message) continue;

                    // Store for getMessage() key lookup
                    storeMsg(rawMsg);

                    // Unwrap nested message wrappers
                    const unwrap = (msg) => {
                        for (const w of ['ephemeralMessage','viewOnceMessage','viewOnceMessageV2',
                                         'viewOnceMessageV2Extension','documentWithCaptionMessage','editedMessage']) {
                            if (msg[w]?.message) return unwrap(msg[w].message);
                        }
                        return msg;
                    };
                    rawMsg.message = unwrap(rawMsg.message);

                    let m;
                    try {
                        m = await serializeMessage(sock, rawMsg);
                    } catch (err) {
                        console.error('[Handler] serialize error:', err.message);
                        continue;
                    }

                    // Ghost mode: skip sending read receipts (never call readMessages)
                    // When ANON_READ is false (default), also don't call readMessages —
                    // blue ticks require explicit opt-in. This is intentional.

                    console.log(`[MSG] from:${m.sender} body:"${m.body}"`);

                    // ── Command routing ────────────────────────────────────
                    if (m.body && m.body.startsWith(global.BOT_PREFIX)) {
                        const args = m.body.slice(global.BOT_PREFIX.length).trim().split(/\s+/);
                        const commandName = args.shift().toLowerCase();
                        const plugin = plugins.get(commandName);
                        if (plugin) {
                            try {
                                await plugin.execute(sock, m, args);
                                // ── Delete command message so nobody sees what was typed ──
                                // Works in: groups (if bot is admin), self-chat, DMs owned by bot account
                                await sock.sendMessage(m.from, { delete: m.key }).catch(() => {});
                            } catch (err) {
                                console.error(`[CMD] Error in ${commandName}:`, err.message);
                                await m.reply('⚠️ Error running command: ' + commandName).catch(() => {});
                                await sock.sendMessage(m.from, { delete: m.key }).catch(() => {});
                            }
                        }
                    }

                    // ── onMessage hooks (auto-react, anti-delete save, etc.) ─
                    for (const plugin of new Set(plugins.values())) {
                        if (typeof plugin.onMessage === 'function') {
                            await plugin.onMessage(sock, m).catch(err =>
                                console.error(`[onMessage] error (${plugin.name}):`, err.message)
                            );
                        }
                    }
                }
            });

            sock.ev.on('group-participants.update', (update) => {
                console.log('Group update:', JSON.stringify(update));
            });

        } catch (error) {
            console.error('Bot startup error:', error);
            isConnecting = false;
            setTimeout(() => startBot(), 10000);
        }
    })();
}

// ── HTTP server ──────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
    const url = req.url;
    if (url === '/' || url === '/qr') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<!DOCTYPE html>
<html>
<head>
  <title>XLICON-V2-MD — Scan QR</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body{font-family:sans-serif;background:#111;color:#eee;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;box-sizing:border-box}
    h1{color:#25d366;margin-bottom:4px}p{color:#aaa;margin:4px 0 20px}
    #qr img{max-width:280px;border:6px solid #25d366;border-radius:12px;background:#fff;padding:10px}
    #qr .msg{font-size:1.2em;color:#25d366;padding:40px 20px;border:2px dashed #25d366;border-radius:12px;text-align:center}
    #status{margin-top:16px;padding:8px 20px;border-radius:20px;font-weight:bold}
    .connected{background:#25d366;color:#000}.waiting{background:#333;color:#aaa}
    #session-box{display:none;margin-top:24px;width:100%;max-width:600px}
    #session-box h3{color:#25d366}
    #session-box textarea{width:100%;height:120px;background:#222;color:#eee;border:1px solid #25d366;border-radius:8px;padding:10px;font-size:12px;resize:vertical;box-sizing:border-box}
    #session-box button{margin-top:8px;padding:10px 24px;background:#25d366;color:#000;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:14px}
    #copied{display:none;color:#25d366;margin-left:10px;font-weight:bold}
  </style>
</head>
<body>
  <h1>XLICON-V2-MD Bot</h1>
  <p>Scan the QR code with WhatsApp to connect your bot</p>
  <div id="qr"><div class="msg">⏳ Loading...</div></div>
  <div id="status" class="waiting">Starting...</div>
  <div id="session-box">
    <h3>✅ Bot Connected — Save your Session ID</h3>
    <p style="color:#aaa;font-size:13px">Copy this and set it as <strong>SESSION_ID</strong> in Railway.</p>
    <textarea id="session-val" readonly></textarea><br>
    <button onclick="copySession()">Copy SESSION_ID</button>
    <span id="copied">Copied!</span>
  </div>
  <script>
    function copySession(){const t=document.getElementById('session-val');t.select();document.execCommand('copy');const c=document.getElementById('copied');c.style.display='inline';setTimeout(()=>c.style.display='none',2000);}
    async function poll(){
      try{
        const r=await fetch('/api/status');const d=await r.json();
        const qd=document.getElementById('qr');const sd=document.getElementById('status');
        if(d.status==='connected'){
          qd.innerHTML='<div class="msg">✅ Connected!</div>';
          sd.textContent='Connected';sd.className='connected';
          const sr=await fetch('/api/session');const sj=await sr.json();
          if(sj.session){document.getElementById('session-box').style.display='block';document.getElementById('session-val').value=sj.session;}
        }else if(d.hasQR&&d.qr){
          qd.innerHTML='<img src="'+d.qr+'" alt="QR Code">';
          sd.textContent='Waiting for scan...';sd.className='waiting';
        }else{
          qd.innerHTML='<div class="msg">⏳ Starting bot, please wait...</div>';
          sd.textContent=d.status||'starting';sd.className='waiting';
        }
      }catch(e){}
      setTimeout(poll,4000);
    }
    poll();
  </script>
</body>
</html>`);
    } else if (url === '/api/status') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ status: botStatus, hasQR: !!latestQR, qr: latestQR, prefix: global.BOT_PREFIX, ghostMode: global.ANON_READ, timestamp: new Date().toISOString(), uptime: process.uptime() }));
    } else if (url === '/api/session') {
        const cp = path.join(__dirname, 'session', 'creds.json');
        if (fs.existsSync(cp)) {
            try {
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ session: fs.readFileSync(cp, 'utf8').trim() }));
            } catch (e) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Could not read session' }));
            }
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'No session yet' }));
        }
    } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found', endpoints: ['/', '/api/status', '/api/session'] }));
    }
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    loadPrefix();
});

process.on('SIGINT', () => {
    if (presenceInterval) clearInterval(presenceInterval);
    if (sock) sock.end();
    process.exit(0);
});
process.on('uncaughtException', err => console.error('Uncaught Exception:', err));
process.on('unhandledRejection', reason => console.error('Unhandled Rejection:', reason));
