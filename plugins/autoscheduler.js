/**
 * autoscheduler.js — Daily automated content scheduler
 * Persists in MongoDB — survives restarts
 *
 * Commands:
 *   .auto add <type> <HH:MM>          — schedule daily content
 *   .auto list                         — show all schedules for this chat
 *   .auto remove <id>                  — remove a schedule
 *   .auto stop                         — remove all schedules in this chat
 *   .auto types                        — show available content types
 *
 * Types: bible, quote, riddle, joke, fact, news, morningnews, eveningnews,
 *        motivation, horoscope
 */

const fetch = require('node-fetch');
const https2 = require('https');

const getDb = () => global.getMongoDb();
let _sock = null;          // WhatsApp socket reference
let _timerStarted = false; // only start one global interval

// ── Content generators ───────────────────────────────────────────────────────

const QUOTES = [
    { q: 'The only way to do great work is to love what you do.', a: 'Steve Jobs' },
    { q: 'In the middle of every difficulty lies opportunity.', a: 'Albert Einstein' },
    { q: 'It does not matter how slowly you go as long as you do not stop.', a: 'Confucius' },
    { q: 'Believe you can and you are halfway there.', a: 'Theodore Roosevelt' },
    { q: 'The future belongs to those who believe in the beauty of their dreams.', a: 'Eleanor Roosevelt' },
    { q: 'Success is not final, failure is not fatal: It is the courage to continue that counts.', a: 'Winston Churchill' },
    { q: 'Life is what happens when you are busy making other plans.', a: 'John Lennon' },
    { q: 'Your time is limited, do not waste it living someone else's life.', a: 'Steve Jobs' },
    { q: 'The best time to plant a tree was 20 years ago. The second best time is now.', a: 'Chinese Proverb' },
    { q: 'An unexamined life is not worth living.', a: 'Socrates' },
    { q: 'Spread love everywhere you go. Let no one ever come to you without leaving happier.', a: 'Mother Teresa' },
    { q: 'When you reach the end of your rope, tie a knot and hang on.', a: 'Franklin D. Roosevelt' },
    { q: 'Always remember that you are absolutely unique, just like everyone else.', a: 'Margaret Mead' },
    { q: 'Do not go where the path may lead; go instead where there is no path and leave a trail.', a: 'Ralph Waldo Emerson' },
    { q: 'You will face many defeats in life, but never let yourself be defeated.', a: 'Maya Angelou' },
    { q: 'The greatest glory in living lies not in never falling, but in rising every time we fall.', a: 'Nelson Mandela' },
    { q: 'In the end, it is not the years in your life that count. It is the life in your years.', a: 'Abraham Lincoln' },
    { q: 'Never let the fear of striking out keep you from playing the game.', a: 'Babe Ruth' },
    { q: 'You have brains in your head. You have feet in your shoes. You can steer yourself any direction you choose.', a: 'Dr. Seuss' },
    { q: 'If life were predictable it would cease to be life and be without flavor.', a: 'Eleanor Roosevelt' },
];

const RIDDLES = [
    { q: 'I have cities, but no houses live there. I have mountains, but no trees. I have water, but no fish. What am I?', a: 'A map' },
    { q: 'The more you take, the more you leave behind. What am I?', a: 'Footsteps' },
    { q: 'I speak without a mouth and hear without ears. I have no body, but come alive with wind. What am I?', a: 'An echo' },
    { q: 'What has hands but cannot clap?', a: 'A clock' },
    { q: 'I am light as a feather, yet the strongest man cannot hold me for five minutes. What am I?', a: 'Breath' },
    { q: 'What gets wetter as it dries?', a: 'A towel' },
    { q: 'I have a head and a tail but no body. What am I?', a: 'A coin' },
    { q: 'The more you have of it, the less you see. What is it?', a: 'Darkness' },
    { q: 'What can travel around the world while staying in a corner?', a: 'A stamp' },
    { q: 'I have keys but no locks. I have space but no room. You can enter but cannot go inside. What am I?', a: 'A keyboard' },
    { q: 'What has an eye but cannot see?', a: 'A needle' },
    { q: 'What can you catch but not throw?', a: 'A cold' },
    { q: 'What runs but never walks, has a mouth but never talks, has a head but never weeps?', a: 'A river' },
    { q: 'What has 13 hearts but no other organs?', a: 'A deck of cards' },
    { q: 'I shave every day, but my beard stays the same. Who am I?', a: 'A barber' },
];

const JOKES = [
    ['Why do not scientists trust atoms?', 'Because they make up everything!'],
    ['Why did the scarecrow win an award?', 'Because he was outstanding in his field!'],
    ['Why do not eggs tell jokes?', 'They would crack each other up!'],
    ['What do you call a fake noodle?', 'An impasta!'],
    ['Why did the bicycle fall over?', 'It was two-tired!'],
    ['I told my wife she was drawing her eyebrows too high.', 'She looked surprised.'],
    ['What do you call cheese that is not yours?', 'Nacho cheese!'],
    ['Why cannot you give Elsa a balloon?', 'Because she will let it go!'],
    ['What do you call a fish without eyes?', 'A fsh!'],
    ['Why did the math book look so sad?', 'Because it had too many problems!'],
    ['What do you call a sleeping dinosaur?', 'A dino-snore!'],
    ['Why did the golfer bring an extra pair of pants?', 'In case he got a hole in one!'],
    ['What do you call a pig that does karate?', 'A pork chop!'],
    ['Why do not skeletons fight each other?', 'They do not have the guts!'],
    ['What did the ocean say to the beach?', 'Nothing, it just waved!'],
];

const MOTIVATION = [
    'Good morning! Today is a new opportunity. Make the most of every moment.',
    'Rise and shine! Great things are waiting for you today.',
    'Good morning! Remember: every expert was once a beginner. Keep going.',
    'A new day, a new beginning. Your attitude determines your direction.',
    'Good morning! The secret of getting ahead is getting started.',
    'Today is your chance to do something amazing. Seize it!',
    'Wake up with determination. Go to bed with satisfaction.',
    'Good morning! Push yourself, because no one else is going to do it for you.',
    'Every morning is a fresh start. Yesterday's failures are today's lessons.',
    'Good morning! Believe in yourself and you are halfway there.',
];

const BIBLE_VERSES = [
    'John 3:16', 'Psalm 23:1', 'Romans 8:28', 'Proverbs 3:5-6', 'Philippians 4:13',
    'Jeremiah 29:11', 'Isaiah 40:31', 'Matthew 6:33', 'Psalm 46:1', 'Romans 15:13',
    'Joshua 1:9', '1 Corinthians 13:4', 'Psalm 119:105', 'Matthew 11:28', 'John 14:6',
    'Galatians 5:22-23', 'Hebrews 11:1', 'James 1:2-3', 'Proverbs 31:25', 'Psalm 27:1',
];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function httpsGet(url) {
    return new Promise((res, rej) => {
        https2.get(url, { headers: { 'User-Agent': 'XLICONBot/1.0' } }, r => {
            if (r.statusCode === 301 || r.statusCode === 302) return httpsGet(r.headers.location).then(res).catch(rej);
            let d = ''; r.on('data', c => d += c); r.on('end', () => res(d));
        }).on('error', rej);
    });
}

function parseRSS(xml, limit = 5) {
    const items = [];
    const re = /<item>([sS]*?)</item>/g;
    let m;
    while ((m = re.exec(xml)) !== null && items.length < limit) {
        const get = tag => { const r2 = new RegExp('<' + tag + '[^>]*>([\s\S]*?)<\/' + tag + '>'); const x = r2.exec(m[1]); return x ? x[1].replace(/<![CDATA[|]]>/g, '').trim() : ''; };
        let link = get('link'); if (link.includes('?')) link = link.split('?')[0];
        items.push({ title: get('title'), link, desc: get('description').slice(0, 120) });
    }
    return items;
}

async function generateContent(type) {
    const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    switch (type) {
        case 'bible': {
            const ref = rand(BIBLE_VERSES);
            try {
                const raw = await fetch('https://bible-api.com/' + encodeURIComponent(ref) + '?translation=kjv');
                const d = await raw.json();
                return '╭━━━━━━━━━━━━━━━━━━━━━━━╮\n'
                     + '┃   📖  DAILY BIBLE VERSE  ┃\n'
                     + '╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n'
                     + d.reference + '\n\n'
                     + '"' + (d.text || '').trim() + '"\n\n'
                     + '— KJV Bible\n\n'
                     + '📅 ' + today;
            } catch {
                return '📖 Daily Bible Verse\n\n"For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life." — John 3:16 (KJV)\n\n📅 ' + today;
            }
        }

        case 'quote': {
            const q = rand(QUOTES);
            return '╭━━━━━━━━━━━━━━━━━━━━━━╮\n'
                 + '┃   💬  QUOTE OF THE DAY   ┃\n'
                 + '╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n'
                 + '"' + q.q + '"\n\n'
                 + '— ' + q.a + '\n\n'
                 + '📅 ' + today;
        }

        case 'riddle': {
            const r = rand(RIDDLES);
            return '╭━━━━━━━━━━━━━━━━━━━━━━╮\n'
                 + '┃   🧩  DAILY RIDDLE       ┃\n'
                 + '╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n'
                 + '❓ ' + r.q + '\n\n'
                 + '💡 Reply with your answer!\n'
                 + '_(Answer will be revealed in 10 minutes)_\n\n'
                 + '📅 ' + today;
        }

        case 'joke': {
            const [setup, punchline] = rand(JOKES);
            return '╭━━━━━━━━━━━━━━━━━━━━━━╮\n'
                 + '┃   😂  JOKE OF THE DAY    ┃\n'
                 + '╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n'
                 + setup + '\n\n'
                 + punchline + ' 😂\n\n'
                 + '📅 ' + today;
        }

        case 'fact': {
            const APIS = [
                { url: 'https://uselessfacts.jsph.pl/api/v2/facts/random?language=en', parse: d => d.text },
                { url: 'https://catfact.ninja/fact', parse: d => '🐱 Cat fact: ' + d.fact },
                { url: 'https://api.chucknorris.io/jokes/random', parse: d => d.value },
            ];
            const api = rand(APIS);
            try {
                const raw = await fetch(api.url);
                const d = await raw.json();
                return '╭━━━━━━━━━━━━━━━━━━━━━━╮\n'
                     + '┃   🔬  DAILY FACT         ┃\n'
                     + '╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n'
                     + api.parse(d) + '\n\n'
                     + '📅 ' + today;
            } catch {
                return '╭━━━━━━━━━━━━━━━━━━━━━━╮\n┃   🔬  DAILY FACT         ┃\n╰━━━━━━━━━━━━━━━━━━━━━━╯\n\nDid you know? Honey never spoils — archaeologists have found 3000-year-old honey in Egyptian tombs that was still edible!\n\n📅 ' + today;
            }
        }

        case 'motivation': {
            return '╭━━━━━━━━━━━━━━━━━━━━━━╮\n'
                 + '┃   ☀️  MORNING MOTIVATION  ┃\n'
                 + '╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n'
                 + rand(MOTIVATION) + '\n\n'
                 + '📅 ' + today;
        }

        case 'news':
        case 'morningnews': {
            try {
                const xml = await httpsGet('https://feeds.bbci.co.uk/news/world/rss.xml');
                const items = parseRSS(xml, 5);
                let msg = '╭━━━━━━━━━━━━━━━━━━━━━━╮\n'
                        + '┃   🌅  MORNING NEWS       ┃\n'
                        + '╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n'
                        + '📅 ' + today + '\n\n'
                        + 'Top headlines from BBC World:\n\n';
                items.forEach((item, i) => {
                    msg += (i + 1) + '. ' + item.title + '\n';
                    if (item.desc) msg += '   ' + item.desc + '\n';
                    msg += '   ' + item.link + '\n\n';
                });
                return msg.trim();
            } catch {
                return '🌅 Morning News\n\nUnable to fetch news right now. Check back later!\n\n📅 ' + today;
            }
        }

        case 'eveningnews': {
            try {
                const xml = await httpsGet('https://feeds.bbci.co.uk/news/world/rss.xml');
                const items = parseRSS(xml, 5);
                let msg = '╭━━━━━━━━━━━━━━━━━━━━━━╮\n'
                        + '┃   🌆  EVENING NEWS RECAP  ┃\n'
                        + '╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n'
                        + '📅 ' + today + '\n\n'
                        + 'BBC World — Evening Edition:\n\n';
                items.forEach((item, i) => {
                    msg += (i + 1) + '. ' + item.title + '\n';
                    if (item.desc) msg += '   ' + item.desc + '\n';
                    msg += '   ' + item.link + '\n\n';
                });
                return msg.trim();
            } catch {
                return '🌆 Evening News\n\nUnable to fetch news right now. Check back later!\n\n📅 ' + today;
            }
        }

        default:
            return null;
    }
}

// ── Scheduler engine ─────────────────────────────────────────────────────────

const RIDDLE_TIMERS = new Map(); // track answer reveal timers

async function fireJob(job) {
    if (!_sock) return;
    try {
        const text = await generateContent(job.type);
        if (!text) return;
        await _sock.sendMessage(job.chatJid, { text });

        // For riddles — reveal answer after 10 minutes
        if (job.type === 'riddle') {
            const rid = rand(RIDDLES);
            const key = job.chatJid + job._id;
            if (RIDDLE_TIMERS.has(key)) clearTimeout(RIDDLE_TIMERS.get(key));
            const t = setTimeout(async () => {
                try { await _sock.sendMessage(job.chatJid, { text: '💡 Riddle Answer: ' + rid.a }); } catch {}
                RIDDLE_TIMERS.delete(key);
            }, 10 * 60 * 1000);
            RIDDLE_TIMERS.set(key, t);
        }

        // Update lastRun in DB
        const db = await getDb();
        if (db) await db.collection('auto_schedules').updateOne(
            { _id: job._id },
            { $set: { lastRun: new Date() } }
        );
    } catch (e) {
        console.error('[autoscheduler] fireJob error:', e.message);
    }
}

function parseHHMM(str) {
    const m = str.match(/^(d{1,2}):(d{2})$/);
    if (!m) return null;
    const h = parseInt(m[1]), min = parseInt(m[2]);
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;
    return { h, min };
}

async function checkSchedules() {
    if (!_sock) return;
    const db = await getDb();
    if (!db) return;
    const now = new Date();
    const curH = now.getHours();
    const curM = now.getMinutes();

    const jobs = await db.collection('auto_schedules').find({ enabled: true }).toArray();
    for (const job of jobs) {
        const t = parseHHMM(job.time);
        if (!t) continue;
        if (t.h !== curH || t.min !== curM) continue;

        // Check if already ran this minute
        if (job.lastRun) {
            const lr = new Date(job.lastRun);
            if (lr.getFullYear() === now.getFullYear() &&
                lr.getMonth() === now.getMonth() &&
                lr.getDate() === now.getDate() &&
                lr.getHours() === curH &&
                lr.getMinutes() === curM) continue;
        }

        fireJob(job);
    }
}

function startGlobalTimer() {
    if (_timerStarted) return;
    _timerStarted = true;
    // Run every 60 seconds, aligned to the minute
    const now = new Date();
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    setTimeout(() => {
        checkSchedules();
        setInterval(checkSchedules, 60 * 1000);
    }, msUntilNextMinute);
}

// ── Command handler ──────────────────────────────────────────────────────────

const VALID_TYPES = ['bible', 'quote', 'riddle', 'joke', 'fact', 'news', 'morningnews', 'eveningnews', 'motivation'];

const TYPES_INFO = `╭━━━━━━━━━━━━━━━━━━━━━━━╮
┃   📋  AVAILABLE TYPES    ┃
╰━━━━━━━━━━━━━━━━━━━━━━━╯

📖 bible       — Random Bible verse
💬 quote       — Inspirational quote
🧩 riddle      — Daily riddle (answer in 10 min)
😂 joke        — Random joke
🔬 fact        — Interesting fact
🌅 morningnews — BBC morning headlines
🌆 eveningnews — BBC evening recap
📰 news        — BBC world news
☀️ motivation  — Morning motivation

Usage:
.auto add <type> <HH:MM>

Examples:
.auto add bible 06:00
.auto add morningnews 07:30
.auto add quote 09:00
.auto add riddle 12:00
.auto add eveningnews 18:00`;

module.exports = {
    name: 'auto',
    aliases: ['autopost', 'scheduler', 'daily'],
    description: 'Schedule daily automated content (bible, news, quotes, riddles...)',

    async execute(sock, m, args) {
        _sock = sock;
        startGlobalTimer();

        const db = await getDb();
        const sub = (args[0] || '').toLowerCase();

        // .auto types
        if (sub === 'types' || sub === 'list-types') {
            return m.reply(TYPES_INFO);
        }

        // .auto list
        if (sub === 'list') {
            if (!db) return m.reply('❌ Database not connected.');
            const jobs = await db.collection('auto_schedules').find({ chatJid: m.from }).toArray();
            if (!jobs.length) return m.reply('📭 No schedules set for this chat.\n\nUse .auto add <type> <HH:MM> to add one.');
            let msg = '╭━━━━━━━━━━━━━━━━━━━━━━━╮\n┃   📅  YOUR SCHEDULES     ┃\n╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n';
            jobs.forEach((j, i) => {
                msg += (i + 1) + '. ' + j.type.toUpperCase() + ' at ' + j.time + '\n';
                msg += '   ID: ' + j._id.toString().slice(-6) + '\n';
                msg += '   Status: ' + (j.enabled ? '🟢 Active' : '🔴 Paused') + '\n\n';
            });
            msg += 'To remove: .auto remove <last-6-chars-of-ID>';
            return m.reply(msg);
        }

        // .auto stop
        if (sub === 'stop' || sub === 'clear') {
            if (!db) return m.reply('❌ Database not connected.');
            const result = await db.collection('auto_schedules').deleteMany({ chatJid: m.from });
            return m.reply('🗑️ Removed all ' + result.deletedCount + ' schedule(s) for this chat.');
        }

        // .auto remove <id>
        if (sub === 'remove' || sub === 'delete' || sub === 'rm') {
            if (!db) return m.reply('❌ Database not connected.');
            const shortId = args[1];
            if (!shortId) return m.reply('Usage: .auto remove <ID>\nGet IDs from .auto list');
            const jobs = await db.collection('auto_schedules').find({ chatJid: m.from }).toArray();
            const job = jobs.find(j => j._id.toString().slice(-6) === shortId);
            if (!job) return m.reply('❌ Schedule ID not found. Use .auto list to see your IDs.');
            await db.collection('auto_schedules').deleteOne({ _id: job._id });
            return m.reply('✅ Removed ' + job.type.toUpperCase() + ' at ' + job.time + ' schedule.');
        }

        // .auto test <type>
        if (sub === 'test') {
            const type = args[1]?.toLowerCase();
            if (!VALID_TYPES.includes(type)) return m.reply('❌ Unknown type. Use .auto types to see options.');
            await m.react('⏳');
            const text = await generateContent(type).catch(e => '❌ Error: ' + e.message);
            return m.reply(text);
        }

        // .auto add <type> <HH:MM>
        if (sub === 'add') {
            const type = args[1]?.toLowerCase();
            const timeStr = args[2];

            if (!type || !timeStr) return m.reply(
`Usage: .auto add <type> <HH:MM>

Examples:
.auto add bible 06:00
.auto add morningnews 07:30
.auto add eveningnews 18:00
.auto add quote 09:00
.auto add riddle 12:00

Use .auto types to see all options`
            );

            if (!VALID_TYPES.includes(type))
                return m.reply('❌ Unknown type: ' + type + '\n\nUse .auto types to see available options.');

            const parsed = parseHHMM(timeStr);
            if (!parsed)
                return m.reply('❌ Invalid time format. Use HH:MM (24-hour)\n\nExamples: 06:00 | 07:30 | 18:00 | 21:00');

            if (!db) return m.reply('❌ Database not connected.');

            // Check limit per chat
            const existing = await db.collection('auto_schedules').countDocuments({ chatJid: m.from });
            if (existing >= 10) return m.reply('❌ Maximum 10 schedules per chat.\nRemove one first with .auto remove <id>');

            // Check duplicate
            const dup = await db.collection('auto_schedules').findOne({ chatJid: m.from, type, time: timeStr });
            if (dup) return m.reply('⚠️ You already have ' + type.toUpperCase() + ' scheduled at ' + timeStr);

            await db.collection('auto_schedules').insertOne({
                chatJid: m.from,
                type,
                time: timeStr,
                enabled: true,
                createdAt: new Date(),
                lastRun: null,
            });

            const typeEmojis = { bible:'📖', quote:'💬', riddle:'🧩', joke:'😂', fact:'🔬', news:'📰', morningnews:'🌅', eveningnews:'🌆', motivation:'☀️' };
            const emoji = typeEmojis[type] || '📅';

            return m.reply(
`╭━━━━━━━━━━━━━━━━━━━━━━━╮
┃   ✅  SCHEDULE CREATED   ┃
╰━━━━━━━━━━━━━━━━━━━━━━━╯

${emoji} Type   : ${type.toUpperCase()}
⏰ Time   : ${timeStr} daily
🔄 Status : 🟢 Active

This chat will receive ${type} automatically every day at ${timeStr}.

Use .auto list to see all schedules
Use .auto test ${type} to preview now`
            );
        }

        // Default help
        return m.reply(
`╭━━━━━━━━━━━━━━━━━━━━━━━╮
┃   📅  AUTO SCHEDULER     ┃
╰━━━━━━━━━━━━━━━━━━━━━━━╯

Schedule daily content that sends automatically every day at your chosen time.

Commands:
.auto add <type> <HH:MM>   — add schedule
.auto list                  — view schedules
.auto remove <id>           — remove one
.auto stop                  — remove all
.auto test <type>           — preview now
.auto types                 — see all types

Examples:
.auto add bible 06:00
.auto add morningnews 07:00
.auto add riddle 12:00
.auto add eveningnews 18:00
.auto add motivation 05:30`
        );
    },

    // Boot scheduler on first message (so sock reference is captured)
    async onMessage(sock) {
        if (_sock) return;
        _sock = sock;
        startGlobalTimer();
    },
};
