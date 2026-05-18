/**
 * autoscheduler.js — Daily automated content scheduler
 * Persists in MongoDB — survives restarts
 *
 * Commands:
 *   .auto add <type> <HH:MM>   — schedule daily content
 *   .auto list                  — show all schedules for this chat
 *   .auto remove <id>           — remove a schedule
 *   .auto stop                  — remove all schedules in this chat
 *   .auto test <type>           — preview content now
 *   .auto types                 — show available content types
 *
 * Types: bible, quote, riddle, joke, fact, news, morningnews, eveningnews, motivation
 */

const nodeFetch = require('node-fetch');
const https2 = require('https');

const getDb = () => global.getMongoDb();
let _sock = null;
let _timerStarted = false;

// ── Static content banks ──────────────────────────────────────────────────────

const QUOTES = [
    { q: 'The only way to do great work is to love what you do.', a: 'Steve Jobs' },
    { q: 'In the middle of every difficulty lies opportunity.', a: 'Albert Einstein' },
    { q: 'It does not matter how slowly you go as long as you do not stop.', a: 'Confucius' },
    { q: 'Believe you can and you are halfway there.', a: 'Theodore Roosevelt' },
    { q: 'The future belongs to those who believe in the beauty of their dreams.', a: 'Eleanor Roosevelt' },
    { q: 'Success is not final, failure is not fatal: It is the courage to continue that counts.', a: 'Winston Churchill' },
    { q: 'Life is what happens when you are busy making other plans.', a: 'John Lennon' },
    { q: 'Your time is limited, do not waste it living someone else life.', a: 'Steve Jobs' },
    { q: 'The best time to plant a tree was 20 years ago. The second best time is now.', a: 'Chinese Proverb' },
    { q: 'An unexamined life is not worth living.', a: 'Socrates' },
    { q: 'Spread love everywhere you go. Let no one come to you without leaving happier.', a: 'Mother Teresa' },
    { q: 'When you reach the end of your rope, tie a knot and hang on.', a: 'Franklin D. Roosevelt' },
    { q: 'Do not go where the path may lead; go where there is no path and leave a trail.', a: 'Ralph Waldo Emerson' },
    { q: 'You will face many defeats in life, but never let yourself be defeated.', a: 'Maya Angelou' },
    { q: 'The greatest glory in living lies not in never falling, but in rising every time we fall.', a: 'Nelson Mandela' },
    { q: 'Never let the fear of striking out keep you from playing the game.', a: 'Babe Ruth' },
    { q: 'If life were predictable it would cease to be life and be without flavor.', a: 'Eleanor Roosevelt' },
];

const RIDDLES = [
    { q: 'I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?', a: 'A map' },
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
    { q: 'What has 13 hearts but no other organs?', a: 'A deck of cards' },
    { q: 'I shave every day, but my beard stays the same. Who am I?', a: 'A barber' },
];

const JOKES = [
    ['Why do scientists not trust atoms?', 'Because they make up everything!'],
    ['Why did the scarecrow win an award?', 'Because he was outstanding in his field!'],
    ['Why do eggs not tell jokes?', 'They would crack each other up!'],
    ['What do you call a fake noodle?', 'An impasta!'],
    ['Why did the bicycle fall over?', 'It was two-tired!'],
    ['I told my wife she was drawing her eyebrows too high.', 'She looked surprised.'],
    ['What do you call cheese that is not yours?', 'Nacho cheese!'],
    ['Why did the math book look so sad?', 'Because it had too many problems!'],
    ['What do you call a sleeping dinosaur?', 'A dino-snore!'],
    ['Why do skeletons not fight each other?', 'They do not have the guts!'],
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
    'Every morning is a fresh start. Yesterday failures are today lessons.',
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
    return new Promise((resolve, reject) => {
        https2.get(url, { headers: { 'User-Agent': 'XLICONBot/1.0' } }, r => {
            if (r.statusCode === 301 || r.statusCode === 302) {
                return httpsGet(r.headers.location).then(resolve).catch(reject);
            }
            let d = '';
            r.on('data', c => { d += c; });
            r.on('end', () => resolve(d));
        }).on('error', reject);
    });
}

function parseRSS(xml, limit) {
    if (limit === undefined) limit = 5;
    const items = [];
    // Use RegExp constructor to avoid forward-slash issues in regex literals
    const itemRe = new RegExp('<item>([\s\S]*?)<\/item>', 'g');
    let m;
    while ((m = itemRe.exec(xml)) !== null && items.length < limit) {
        const inner = m[1];
        const getTag = function(tag) {
            const tagRe = new RegExp('<' + tag + '[^>]*>([\s\S]*?)<\/' + tag + '>');
            const x = tagRe.exec(inner);
            if (!x) return '';
            return x[1].replace(/<![CDATA[/g, '').replace(/]]>/g, '').trim();
        };
        let link = getTag('link');
        if (link.indexOf('?') !== -1) link = link.split('?')[0];
        items.push({ title: getTag('title'), link: link, desc: getTag('description').slice(0, 120) });
    }
    return items;
}

// ── Content generators ────────────────────────────────────────────────────────

async function generateContent(type) {
    const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    if (type === 'bible') {
        const ref = rand(BIBLE_VERSES);
        try {
            const raw = await nodeFetch('https://bible-api.com/' + encodeURIComponent(ref) + '?translation=kjv');
            const d = await raw.json();
            return '\u256d\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u256e\n'
                 + '\u2503   \ud83d\udcd6  DAILY BIBLE VERSE  \u2503\n'
                 + '\u2570\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u256f\n\n'
                 + (d.reference || ref) + '\n\n'
                 + '"' + (d.text || '').trim() + '"\n\n'
                 + '— KJV Bible\n\n'
                 + '\ud83d\udcc5 ' + today;
        } catch (e) {
            return '\ud83d\udcd6 Daily Bible Verse\n\n"For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life." — John 3:16 (KJV)\n\n\ud83d\udcc5 ' + today;
        }
    }

    if (type === 'quote') {
        const q = rand(QUOTES);
        return '\ud83d\udcac Quote of the Day\n\n"' + q.q + '"\n\n— ' + q.a + '\n\n\ud83d\udcc5 ' + today;
    }

    if (type === 'riddle') {
        const r = rand(RIDDLES);
        return '\ud83e\udde9 Daily Riddle\n\n\u2753 ' + r.q + '\n\n\ud83d\udca1 Reply with your answer!\n_(Answer will be revealed in 10 minutes)_\n\n\ud83d\udcc5 ' + today;
    }

    if (type === 'joke') {
        const joke = rand(JOKES);
        return '\ud83d\ude02 Joke of the Day\n\n' + joke[0] + '\n\n' + joke[1] + ' \ud83d\ude02\n\n\ud83d\udcc5 ' + today;
    }

    if (type === 'fact') {
        try {
            const raw = await nodeFetch('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en');
            const d = await raw.json();
            return '\ud83d\udd2c Daily Fact\n\n' + d.text + '\n\n\ud83d\udcc5 ' + today;
        } catch (e) {
            return '\ud83d\udd2c Daily Fact\n\nDid you know? Honey never spoils — archaeologists have found 3000-year-old honey in Egyptian tombs that was still edible!\n\n\ud83d\udcc5 ' + today;
        }
    }

    if (type === 'motivation') {
        return '\u2600\ufe0f Morning Motivation\n\n' + rand(MOTIVATION) + '\n\n\ud83d\udcc5 ' + today;
    }

    if (type === 'news' || type === 'morningnews') {
        try {
            const xml = await httpsGet('https://feeds.bbci.co.uk/news/world/rss.xml');
            const items = parseRSS(xml, 5);
            let msg = '\ud83c\udf05 Morning News — ' + today + '\n\nTop headlines from BBC World:\n\n';
            items.forEach(function(item, i) {
                msg += (i + 1) + '. ' + item.title + '\n';
                if (item.desc) msg += '   ' + item.desc + '\n';
                msg += '   ' + item.link + '\n\n';
            });
            return msg.trim();
        } catch (e) {
            return '\ud83c\udf05 Morning News\n\nUnable to fetch news right now. Check back later!\n\n\ud83d\udcc5 ' + today;
        }
    }

    if (type === 'eveningnews') {
        try {
            const xml = await httpsGet('https://feeds.bbci.co.uk/news/world/rss.xml');
            const items = parseRSS(xml, 5);
            let msg = '\ud83c\udfd9 Evening News — ' + today + '\n\nBBC World — Evening Edition:\n\n';
            items.forEach(function(item, i) {
                msg += (i + 1) + '. ' + item.title + '\n';
                if (item.desc) msg += '   ' + item.desc + '\n';
                msg += '   ' + item.link + '\n\n';
            });
            return msg.trim();
        } catch (e) {
            return '\ud83c\udfd9 Evening News\n\nUnable to fetch news right now. Check back later!\n\n\ud83d\udcc5 ' + today;
        }
    }

    return null;
}

// ── Scheduler engine ──────────────────────────────────────────────────────────

const RIDDLE_TIMERS = new Map();

async function fireJob(job) {
    const activeSock = _sock || global.sock;
    if (!activeSock) return;
    try {
        const riddle = job.type === 'riddle' ? rand(RIDDLES) : null;
        const text = await generateContent(job.type);
        if (!text) return;
        await activeSock.sendMessage(job.chatJid, { text: text });

        if (riddle) {
            const key = job.chatJid + String(job._id);
            if (RIDDLE_TIMERS.has(key)) clearTimeout(RIDDLE_TIMERS.get(key));
            const t = setTimeout(async function() {
                try { await _sock.sendMessage(job.chatJid, { text: '\ud83d\udca1 Riddle Answer: ' + riddle.a }); } catch (e) {}
                RIDDLE_TIMERS.delete(key);
            }, 10 * 60 * 1000);
            RIDDLE_TIMERS.set(key, t);
        }

        const db = await getDb();
        if (db) {
            await db.collection('auto_schedules').updateOne(
                { _id: job._id },
                { $set: { lastRun: new Date() } }
            );
        }
    } catch (e) {
        console.error('[autoscheduler] fireJob error:', e.message);
    }
}

function parseHHMM(str) {
    const match = str.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const h = parseInt(match[1], 10);
    const min = parseInt(match[2], 10);
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;
    return { h: h, min: min };
}

async function checkSchedules() {
    const activeSock = _sock || global.sock;
    if (!activeSock) return;
    const db = await getDb();
    if (!db) return;
    const now = new Date();
    // UTC+1 = WAT (Nigeria) — schedules fire at the time you typed, not server UTC
    const UTC_OFFSET = 1;
    const localMs  = now.getTime() + UTC_OFFSET * 3600000;
    const local    = new Date(localMs);
    const curH = local.getUTCHours();
    const curM = local.getUTCMinutes();

    const jobs = await db.collection('auto_schedules').find({ enabled: true }).toArray();
    for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        const t = parseHHMM(job.time);
        if (!t) continue;
        if (t.h !== curH || t.min !== curM) continue;
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
    const now = new Date();
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    setTimeout(function() {
        checkSchedules();
        setInterval(checkSchedules, 60 * 1000);
    }, msUntilNextMinute);
}

// ── Command handler ───────────────────────────────────────────────────────────

const VALID_TYPES = ['bible', 'quote', 'riddle', 'joke', 'fact', 'news', 'morningnews', 'eveningnews', 'motivation'];

const TYPES_INFO = [
    '\ud83d\udccb Available Types',
    '',
    '\ud83d\udcd6 bible       — Random Bible verse',
    '\ud83d\udcac quote       — Inspirational quote',
    '\ud83e\udde9 riddle      — Daily riddle (answer in 10 min)',
    '\ud83d\ude02 joke        — Random joke',
    '\ud83d\udd2c fact        — Interesting fact',
    '\ud83c\udf05 morningnews — BBC morning headlines',
    '\ud83c\udfd9 eveningnews — BBC evening recap',
    '\ud83d\udcf0 news        — BBC world news',
    '\u2600\ufe0f motivation  — Morning motivation',
    '',
    'Usage:  .auto add <type> <HH:MM>',
    '',
    'Examples:',
    '.auto add bible 06:00',
    '.auto add morningnews 07:30',
    '.auto add eveningnews 18:00',
    '.auto add riddle 12:00',
].join('\n');

// Called by index.js when bot connects — starts timer immediately on boot
async function onStartHandler(sock) {
    _sock = sock;
    startGlobalTimer();
    console.log('[autoscheduler] Timer started via onStart hook');
}

module.exports = {
    name: 'auto',
    aliases: ['autopost', 'scheduler', 'daily'],
    description: 'Schedule daily automated content (bible, news, quotes, riddles...)',

    async execute(sock, m, args) {
        _sock = sock;
        startGlobalTimer();

        const db = await getDb();
        const sub = (args[0] || '').toLowerCase();

        if (sub === 'types' || sub === 'list-types') {
            return m.reply(TYPES_INFO);
        }

        if (sub === 'list') {
            if (!db) return m.reply('\u274c Database not connected.');
            const jobs = await db.collection('auto_schedules').find({ chatJid: m.from }).toArray();
            if (!jobs.length) return m.reply('\ud83d\udced No schedules set for this chat.\n\nUse .auto add <type> <HH:MM> to add one.');
            let msg = '\ud83d\udcc5 Your Schedules\n\n';
            jobs.forEach(function(j, i) {
                msg += (i + 1) + '. ' + j.type.toUpperCase() + ' at ' + j.time + '\n';
                msg += '   ID: ' + String(j._id).slice(-6) + '\n';
                msg += '   Status: ' + (j.enabled ? '\ud83d\udfe2 Active' : '\ud83d\udd34 Paused') + '\n\n';
            });
            msg += 'To remove: .auto remove <last-6-chars-of-ID>';
            return m.reply(msg);
        }

        if (sub === 'stop' || sub === 'clear') {
            if (!db) return m.reply('\u274c Database not connected.');
            const result = await db.collection('auto_schedules').deleteMany({ chatJid: m.from });
            return m.reply('\ud83d\uddd1 Removed all ' + result.deletedCount + ' schedule(s) for this chat.');
        }

        if (sub === 'remove' || sub === 'delete' || sub === 'rm') {
            if (!db) return m.reply('\u274c Database not connected.');
            const shortId = args[1];
            if (!shortId) return m.reply('Usage: .auto remove <ID>\nGet IDs from .auto list');
            const jobs = await db.collection('auto_schedules').find({ chatJid: m.from }).toArray();
            const job = jobs.find(function(j) { return String(j._id).slice(-6) === shortId; });
            if (!job) return m.reply('\u274c Schedule ID not found. Use .auto list to see your IDs.');
            await db.collection('auto_schedules').deleteOne({ _id: job._id });
            return m.reply('\u2705 Removed ' + job.type.toUpperCase() + ' at ' + job.time + ' schedule.');
        }

        if (sub === 'test') {
            const type = (args[1] || '').toLowerCase();
            if (!VALID_TYPES.includes(type)) return m.reply('\u274c Unknown type. Use .auto types to see options.');
            await m.react('\u23f3');
            try {
                const text = await generateContent(type);
                return m.reply(text || '\u274c Could not generate content for type: ' + type);
            } catch (e) {
                return m.reply('\u274c Error: ' + e.message);
            }
        }

        if (sub === 'add') {
            const type = (args[1] || '').toLowerCase();
            const timeStr = args[2] || '';

            if (!type || !timeStr) {
                return m.reply([
                    'Usage: .auto add <type> <HH:MM>',
                    '',
                    'Examples:',
                    '.auto add bible 06:00',
                    '.auto add morningnews 07:30',
                    '.auto add eveningnews 18:00',
                    '.auto add quote 09:00',
                    '.auto add riddle 12:00',
                    '',
                    'Use .auto types to see all options',
                ].join('\n'));
            }

            if (!VALID_TYPES.includes(type)) {
                return m.reply('\u274c Unknown type: ' + type + '\n\nUse .auto types to see available options.');
            }

            const parsed = parseHHMM(timeStr);
            if (!parsed) {
                return m.reply('\u274c Invalid time format. Use HH:MM (24-hour)\n\nExamples: 06:00 | 07:30 | 18:00 | 21:00');
            }

            if (!db) return m.reply('\u274c Database not connected.');

            const existing = await db.collection('auto_schedules').countDocuments({ chatJid: m.from });
            if (existing >= 10) {
                return m.reply('\u274c Maximum 10 schedules per chat. Remove one first with .auto remove <id>');
            }

            const dup = await db.collection('auto_schedules').findOne({ chatJid: m.from, type: type, time: timeStr });
            if (dup) return m.reply('\u26a0\ufe0f You already have ' + type.toUpperCase() + ' scheduled at ' + timeStr);

            await db.collection('auto_schedules').insertOne({
                chatJid: m.from,
                type: type,
                time: timeStr,
                enabled: true,
                createdAt: new Date(),
                lastRun: null,
            });

            return m.reply([
                '\u2705 Schedule Created!',
                '',
                'Type   : ' + type.toUpperCase(),
                'Time   : ' + timeStr + ' daily',
                'Status : \ud83d\udfe2 Active',
                '',
                'This chat will receive ' + type + ' every day at ' + timeStr + '.',
                '',
                'Use .auto list to see all schedules',
                'Use .auto test ' + type + ' to preview now',
            ].join('\n'));
        }

        // Default help
        return m.reply([
            '\ud83d\udcc5 Auto Scheduler',
            '',
            'Schedule daily content that sends automatically every day at your chosen time.',
            '',
            'Commands:',
            '.auto add <type> <HH:MM>  — add schedule',
            '.auto list                — view schedules',
            '.auto remove <id>         — remove one',
            '.auto stop                — remove all',
            '.auto test <type>         — preview now',
            '.auto types               — see all types',
            '',
            'Examples:',
            '.auto add bible 06:00',
            '.auto add morningnews 07:00',
            '.auto add riddle 12:00',
            '.auto add eveningnews 18:00',
            '.auto add motivation 05:30',
        ].join('\n'));
    },

    async onMessage(sock, m) {
        if (!_sock) {
            _sock = sock;
            startGlobalTimer();
        }
    },

    onStart: onStartHandler,
};
