'use strict';
const https = require('https');
const http  = require('http');
const path  = require('path');
const fs    = require('fs');

// ─── Naija Pidgin captions ────────────────────────────────────────────────────
const CAPTIONS = [
    '\ud83d\udc38\ud83d\udd25 VAWULENCE HAS BEEN ACTIVATED!!\n\nSomebody don do something wey dem no suppose do. Pepper don rest, e don reach fire now.',
    '\ud83d\udc38 Faculty of VAWULENCE\nDepartment of Senior Vawulence Studies\nCourse: HOW TO SCATTER THINGS 101\n\nAdmission form dey open. No WAEC required — only levels.',
    '\ud83d\udc38\ud83d\udca5 PUT PRESSURE! Make the VAWULENCE loud!!\n\nE don pass explanation. We don pass the talking stage. E don reach action time.',
    '\ud83d\udc38\ud83d\udd25 Today weather forecast:\nHeavy vawulence with scattered pepper soup\nExpected arrival: RIGHT NOW\n\nAbeg run if you no get levels.',
    '\ud83d\udc38 Vawulence loading...\n\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2591 99%\n\nPlease hold. The chaos is almost ready. Do not turn off your phone.',
    '\ud83d\udc38\ud83d\udd25 When person do you anyhow and you don reach your limit:\n\nNo talk, no beg — just VAWULENCE.\nBBN energy. Naija style. Full charge.',
    '\ud83d\udc38\ud83d\udcaa The vawulence was there from the beginning.\nWe tried peace. Peace no work.\nWe tried calm. Calm no work.\n\nSo we carry vawulence gbas gbos.',
    '\ud83d\udc38\ud83d\udd25 MINISTRY OF VAWULENCE — OFFICIAL NOTICE\n\nThis is to inform the general public:\n• Nonsense no longer accepted\n• Vawulence delivery: IMMEDIATE\n• No refund. No apology. Amen.',
    '\ud83d\udc38 Them say be the change you want to see in the world.\nSo we changed to VAWULENCE PROFESSOR.\n\nClass is now in session. Sit down.',
    '\ud83d\udc38\ud83d\udd25 When e pain you reach spirit level:\n\nNo cry. No beg.\nFull gbas, correct gbos.\nNaija certified. Worldwide approved.',
    '\ud83d\udc38\ud83d\udca5 VAWULENCE ALERT \u26a0\ufe0f\n\nPerson wey think say dem smart:\nYour grace period don expire.\nSettlement? No. Dialogue? No.\nOnly VAWULENCE available. Collect am.',
    '\ud83d\udc38 Abeg respect yourself before vawulence respect you FOR you.\n\nWe tried gentle. We tried nice.\nNow na Faculty of Vawulence first class degree dey show.',
    '\ud83d\udc38\ud83d\udd25 This na certified Naija vawulence.\nNot the small small one.\nThe one wey your ancestors go feel.\nFull voltage. No inverter. Direct current.',
    '\ud83d\udc38 BREAKING: Vawulence levels critical!\n\nPerson don cross the line.\nAll peacekeepers evacuated.\nOnly vawulence remains. Stay safe. \ud83d\udd25',
    '\ud83d\udc38\ud83d\udd25 Chairman of Vawulence has entered the chat.\n\nE no dey reason. E no dey negotiate.\nE only dey deliver — hot hot, no cooling period.',
    '\ud83d\udc38 When your patience don finish completely:\n\nYou become Professor Emeritus of Vawulence.\nHonorary degree. No thesis required.',
];

function randItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ─── Domains to BLOCK (stock photos, news faces, random people) ───────────────
const BLOCKED_DOMAINS = [
    'shutterstock','gettyimages','istockphoto','alamy','dreamstime',
    'depositphotos','123rf','adobe.com','fotolia','bigstockphoto',
    'stockphoto','canstockphoto','pond5','offset.com','vecteezy',
    'freepik','unsplash','pexels','pixabay',
    // news/people photos we don't want for generic search
    'bbc.co','cnn.com','theguardian','nytimes','reuters','apnews',
    'thepunch','dailypost','vanguardngr','premiumtimes',
];

// ─── Preferred domains (Pinterest, Twitter media — actual memes) ──────────────
const PREFERRED_DOMAINS = ['pinimg.com','pbs.twimg.com','i.redd.it','preview.redd.it','lookaside.fbsbx.com','cdninstagram.com'];

function domainOf(url) {
    try { return new URL(url).hostname; } catch(e) { return ''; }
}

function isBlocked(url) {
    var d = domainOf(url).toLowerCase();
    return BLOCKED_DOMAINS.some(function(b){ return d.indexOf(b) !== -1; });
}

function isPreferred(url) {
    var d = domainOf(url).toLowerCase();
    return PREFERRED_DOMAINS.some(function(p){ return d.indexOf(p) !== -1; });
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────
function makeRequest(url, headers) {
    return new Promise(function(resolve, reject) {
        var mod = url.startsWith('https') ? https : http;
        var req = mod.get(url, {
            headers: Object.assign({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
                'Accept': 'text/html,*/*',
                'Accept-Language': 'en-US,en;q=0.9',
            }, headers || {}),
            timeout: 12000,
        }, function(r) {
            if ([301,302,303,307,308].indexOf(r.statusCode) !== -1 && r.headers.location) {
                return makeRequest(r.headers.location, headers).then(resolve).catch(reject);
            }
            var chunks = [];
            r.on('data', function(c){ chunks.push(c); });
            r.on('end', function(){ resolve({ status: r.statusCode, body: Buffer.concat(chunks), ct: r.headers['content-type'] || '' }); });
        });
        req.on('error', reject);
        req.on('timeout', function(){ req.destroy(); reject(new Error('timeout')); });
    });
}

function decodeHtmlEntities(str) {
    return str.replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'");
}

// ─── Bing image search ────────────────────────────────────────────────────────
async function searchVawulenceImages(topic) {
    // Always anchor on "pepe frog vawulence meme" so we never get random people photos
    var query = topic
        ? (topic + ' vawulence pepe frog meme naija')
        : 'vawulence pepe frog meme naija site:pinimg.com OR site:twitter.com OR site:reddit.com';

    var url = 'https://www.bing.com/images/async?q=' + encodeURIComponent(query) + '&first=1&count=40&adlt=off&qft=';
    var r = await makeRequest(url, { 'Referer': 'https://www.bing.com/images/search?q=' + encodeURIComponent(query) });
    var decoded = decodeHtmlEntities(r.body.toString('utf8'));
    var all = [...decoded.matchAll(/"murl":"(https?:[^"]{10,})"/g)].map(function(m){ return m[1]; })
        .filter(function(u){ return /\.(jpg|jpeg|png|webp|gif)/i.test(u) || u.indexOf('pbs.twimg') !== -1 || u.indexOf('pinimg') !== -1; });

    // Remove blocked domains
    var clean = all.filter(function(u){ return !isBlocked(u); });

    // Sort: preferred domains first, rest after
    var preferred = clean.filter(function(u){ return isPreferred(u); });
    var others    = clean.filter(function(u){ return !isPreferred(u); });

    // Shuffle each group independently then combine: preferred first
    function shuffle(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
        }
        return arr;
    }

    return shuffle(preferred).concat(shuffle(others));
}

async function downloadImage(url) {
    var r = await makeRequest(url, { 'Referer': 'https://www.bing.com/' });
    if (r.status !== 200) throw new Error('HTTP ' + r.status);
    var ct = r.ct.split(';')[0].trim();
    if (!ct.startsWith('image/')) throw new Error('Not image: ' + ct);
    return { buf: r.body, ct: ct };
}

// ─── Fallback local memes ─────────────────────────────────────────────────────
const LOCAL_MEMES = ['vawulence1.jpeg', 'vawulence2.jpeg', 'vawulence3.jpeg'];
function getLocalMeme() {
    var file = path.join(__dirname, '..', 'assets', 'vawulence', randItem(LOCAL_MEMES));
    if (fs.existsSync(file)) return { buf: fs.readFileSync(file), ct: 'image/jpeg' };
    return null;
}

// ─── Plugin export ────────────────────────────────────────────────────────────
module.exports = {
    name: 'vawulence',
    aliases: ['vaw', 'vawy', 'violence'],
    description: 'Search real Pepe-frog vawulence memes and send with Naija Pidgin caption',
    usage: '.vawulence [optional topic e.g. Tinubu / NEPA / Arsenal]',

    async execute(sock, m, args) {
        var topic = args.length ? args.join(' ').trim() : null;
        var caption = randItem(CAPTIONS);
        if (topic) caption = '\ud83d\udc38\ud83d\udd25 *' + topic + ' Vawulence*\n\n' + caption;

        await m.react('\u23f3');

        var imgData = null;

        try {
            var urls = await searchVawulenceImages(topic);
            for (var i = 0; i < Math.min(urls.length, 8); i++) {
                try {
                    imgData = await downloadImage(urls[i]);
                    break;
                } catch (_) { /* try next */ }
            }
        } catch (_) { /* fall through */ }

        if (!imgData) imgData = getLocalMeme();

        try {
            if (imgData) {
                await sock.sendMessage(m.from, { image: imgData.buf, caption: caption, mimetype: imgData.ct }, { quoted: m.raw });
            } else {
                await m.reply('\ud83d\udc38\ud83d\udd25 VAWULENCE!!\n\n' + caption);
            }
            await m.react('\ud83d\udd25');
        } catch (_) {
            await m.reply('\ud83d\udc38\ud83d\udd25 VAWULENCE!!\n\n' + caption);
            await m.react('\ud83d\udd25');
        }
    },
};
