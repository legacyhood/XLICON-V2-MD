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

// Restore session: check SESSION_ID env var first, then MongoDB
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


// ── MongoDB session backup ──────────────────────────────────────────────────
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
        console.log('[MongoDB] Session backed up successfully');
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
        if (doc && doc.session) {
            console.log('[MongoDB] Session loaded from database');
            return doc.session;
        }
    } catch (e) {
        console.error('[MongoDB] Session load failed:', e.message);
    } finally {
        if (client) await client.close();
    }
    return null;
}
// ───────────────────────────────────────────────────────────────────────────

global.BOT_PREFIX = '.';
const AUTH_FOLDER = './session';
const PLUGIN_FOLDER = './plugins';
const PORT = process.env.PORT || 3000;

let latestQR = '';
let botStatus = 'disconnected';
let pairingCodes = new Map();
let presenceInterval = null;
let sock = null;
let isConnecting = false;

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
    
    if (!fs.existsSync(AUTH_FOLDER)) {
        fs.mkdirSync(AUTH_FOLDER, { recursive: true });
    }
    
    const credsPath = path.join(AUTH_FOLDER, 'creds.json');
    if (fs.existsSync(credsPath)) {
        try {
            const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
            if (creds.noiseKey && creds.noiseKey.private) {
                console.log('Using existing session...');
            } else {
                console.log('Invalid session detected, will create new one...');
            }
        } catch (err) {
            console.log('Corrupted session, will create new one...');
        }
    }

    (async () => {
        try {
            const { version, isLatest } = await fetchLatestWaWebVersion();
            console.log(`Using WA v${version.join(".")}, isLatest: ${isLatest}`);

            const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
            
            sock = makeWASocket({
                version, 
                logger: pino({ level: 'info' }),
                auth: state,
                printQRInTerminal: true,
                keepAliveIntervalMs: 10000,
                markOnlineOnConnect: true,
                syncFullHistory: false,
                browser: ['Bot', 'Chrome', '1.0.0']
            });
            
            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    console.log('Generating QR code...');
                    QRCode.toDataURL(qr, (err, url) => { 
                        if (!err) {
                            latestQR = url;
                        }
                    });
                }

                if (connection === 'close') {
                    botStatus = 'disconnected';
                    isConnecting = false;
                    if (presenceInterval) {
                        clearInterval(presenceInterval);
                        presenceInterval = null;
                    }

                    const statusCode = (lastDisconnect?.error instanceof Boom)
                        ? lastDisconnect.error.output.statusCode
                        : 0;

                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                    console.log(
                        "Connection closed:",
                        lastDisconnect?.error?.message,
                        "reconnecting:",
                        shouldReconnect
                    );

                    if (shouldReconnect) {
                        console.log('Reconnecting in 5 seconds...');
                        setTimeout(() => startBot(), 5000);
                    } else {
                        console.log('Logged out. Cleaning up session...');
                        if (fs.existsSync(AUTH_FOLDER)) {
                            fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
                            console.log('Session folder removed');
                        }
                        setTimeout(() => startBot(), 3000);
                    }
                } else if (connection === 'open') {
                    botStatus = 'connected';
                    isConnecting = false;
                    console.log('Bot is connected!');

                    presenceInterval = setInterval(() => {
                        if (sock?.ws?.readyState === 1) {
                            sock.sendPresenceUpdate('available');
                        }
                    }, 10000);

                    try { 
                        await sock.sendMessage(sock.user.id, { 
                            text: `Bot linked successfully!\nPrefix: ${global.BOT_PREFIX}\nConnected: ${new Date().toLocaleString()}` 
                        }); 
                    } catch (err) { 
                        console.error('Could not send welcome message:', err); 
                    }
                } else if (connection === 'connecting') {
                    botStatus = 'connecting';
                    isConnecting = true;
                    console.log('Bot is connecting...');
                }
            });

            sock.ev.on('creds.update', async () => {
                await saveCreds();
                console.log('Credentials updated');
                // Backup session to MongoDB after every credential change
                const credsPath = path.join(AUTH_FOLDER, 'creds.json');
                if (fs.existsSync(credsPath)) {
                    const sessionJson = fs.readFileSync(credsPath, 'utf8');
                    await saveSessionToMongo(sessionJson);
                }
            });

            const plugins = new Map();
            const pluginPath = path.join(__dirname, PLUGIN_FOLDER);
            
            if (fs.existsSync(pluginPath)) {
                try {
                    const pluginFiles = fs.readdirSync(pluginPath).filter(file => file.endsWith('.js'));
                    
                    for (const file of pluginFiles) {
                        try {
                            const plugin = require(path.join(pluginPath, file));
                            if (plugin.name && typeof plugin.execute === 'function') {
                                plugins.set(plugin.name.toLowerCase(), plugin);
                                if (Array.isArray(plugin.aliases)) {
                                    plugin.aliases.forEach(alias => {
                                        plugins.set(alias.toLowerCase(), plugin);
                                    });
                                }
                                console.log(`Loaded plugin: ${plugin.name}`);
                            } else {
                                console.warn(`Invalid plugin structure in ${file}`);
                            }
                        } catch (error) {
                            console.error(`Failed to load plugin ${file}:`, error.message);
                        }
                    }
                    console.log(`Total plugins loaded: ${plugins.size}`);
                } catch (error) {
                    console.error('Error loading plugins:', error);
                }
            } else {
                console.log('No plugins folder found');
            }
           
            sock.ev.on('messages.upsert', async ({ messages, type }) => {
                // Accept notify (incoming) and append (sent from other devices/self)
                if (type !== 'notify' && type !== 'append') return;

                for (const rawMsg of messages) {
                    // Skip status broadcasts
                    if (rawMsg.key.remoteJid === 'status@broadcast') {
                        try { await sock.readMessages([rawMsg.key]); } catch {}
                        continue;
                    }

                    // Skip if no message content
                    if (!rawMsg.message) continue;

                    // Unwrap nested message types (viewOnceMessageV2Extension, ephemeralMessage, etc.)
                    const unwrap = (msg) => {
                        const wrappers = ['ephemeralMessage','viewOnceMessage','viewOnceMessageV2',
                                          'viewOnceMessageV2Extension','documentWithCaptionMessage',
                                          'editedMessage'];
                        for (const w of wrappers) {
                            if (msg[w]?.message) return unwrap(msg[w].message);
                        }
                        return msg;
                    };
                    rawMsg.message = unwrap(rawMsg.message);

                    let m;
                    try {
                        m = await serializeMessage(sock, rawMsg);
                    } catch (err) {
                        console.error('[Handler] serializeMessage error:', err.message);
                        continue;
                    }

                    console.error(`[MSG] from:${m.sender} body:"${m.body}" prefix:"${global.BOT_PREFIX}"`);

                    if (m.body && m.body.startsWith(global.BOT_PREFIX)) {
                        const args = m.body.slice(global.BOT_PREFIX.length).trim().split(/\s+/);
                        const commandName = args.shift().toLowerCase();
                        console.error(`[CMD] command:"${commandName}" plugins:${plugins.size}`);
                        const plugin = plugins.get(commandName);

                        if (plugin) {
                            try {
                                await plugin.execute(sock, m, args);
                            } catch (err) {
                                console.error(`[CMD] Plugin error (${commandName}):`, err.message);
                                await m.reply('⚠️ Error running command: ' + commandName);
                            }
                        } else {
                            console.error(`[CMD] No plugin found for: "${commandName}"`);
                        }
                    }

                    for (const plugin of plugins.values()) {
                        if (typeof plugin.onMessage === 'function') {
                            try {
                                await plugin.onMessage(sock, m);
                            } catch (err) {
                                console.error(`[onMessage] error (${plugin.name}):`, err.message);
                            }
                        }
                    }
                }
            });

            sock.ev.on('group-participants.update', async (update) => {
                console.log('Group update:', update);
            });

            sock.ev.on('messages.reaction', async (reactions) => {
                console.log('Reaction update:', reactions);
            });

        } catch (error) {
            console.error('Bot startup error:', error);
            isConnecting = false;
            setTimeout(() => startBot(), 10000);
        }
    })();
}

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
    h1{color:#25d366;margin-bottom:4px}
    p{color:#aaa;margin:4px 0 20px}
    #qr img{max-width:280px;border:6px solid #25d366;border-radius:12px;background:#fff;padding:10px}
    #qr .msg{font-size:1.2em;color:#25d366;padding:40px 20px;border:2px dashed #25d366;border-radius:12px;text-align:center}
    #status{margin-top:16px;padding:8px 20px;border-radius:20px;font-weight:bold}
    .connected{background:#25d366;color:#000}
    .waiting{background:#333;color:#aaa}
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
    <p style="color:#aaa;font-size:13px">Copy this and set it as <strong>SESSION_ID</strong> in Railway so the bot reconnects after restarts without scanning again.</p>
    <textarea id="session-val" readonly></textarea><br>
    <button onclick="copySession()">Copy SESSION_ID</button>
    <span id="copied">Copied!</span>
  </div>
  <script>
    function copySession(){
      const t=document.getElementById('session-val');
      t.select();document.execCommand('copy');
      const c=document.getElementById('copied');
      c.style.display='inline';
      setTimeout(()=>c.style.display='none',2000);
    }
    async function poll(){
      try{
        const r=await fetch('/api/status');
        const d=await r.json();
        const qd=document.getElementById('qr');
        const sd=document.getElementById('status');
        if(d.status==='connected'){
          qd.innerHTML='<div class="msg">✅ Connected!</div>';
          sd.textContent='Connected';sd.className='connected';
          const sr=await fetch('/api/session');
          const sj=await sr.json();
          if(sj.session){
            document.getElementById('session-box').style.display='block';
            document.getElementById('session-val').value=sj.session;
          }
        } else if(d.hasQR&&d.qr){
          qd.innerHTML='<img src="'+d.qr+'" alt="QR Code">';
          sd.textContent='Waiting for scan...';sd.className='waiting';
        } else {
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
        res.end(JSON.stringify({ status: botStatus, hasQR: !!latestQR, qr: latestQR, prefix: global.BOT_PREFIX, timestamp: new Date().toISOString(), uptime: process.uptime() }));

    } else if (url === '/api/session') {
        const credsPath = path.join(__dirname, 'session', 'creds.json');
        if (fs.existsSync(credsPath)) {
            try {
                const session = fs.readFileSync(credsPath, 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ session: session.trim() }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Could not read session' }));
            }
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No session yet — connect the bot first by scanning the QR at /' }));
        }

    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found', available_endpoints: ['/', '/api/status', '/api/session'] }));
    }
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Status API: http://localhost:${PORT}/api/status`);
    loadPrefix();
});

process.on('SIGINT', () => {
    console.log('Shutting down...');
    if (presenceInterval) clearInterval(presenceInterval);
    if (sock) sock.end();
    process.exit(0);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
});
