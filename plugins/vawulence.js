'use strict';
const path = require('path');
const fs   = require('fs');

// ─── Naija Pidgin captions ────────────────────────────────────────────────────
const CAPTIONS = [
    '\ud83d\udc38\ud83d\udd25 VAWULENCE HAS BEEN ACTIVATED!!\n\nSomebody don do something wey dem no suppose do. Pepper don rest, e don reach fire now.',
    '\ud83d\udc38 Faculty of VAWULENCE\nDepartment of Senior Vawulence Studies\nCourse: HOW TO SCATTER THINGS 101\n\nAdmission form dey open. No WAEC required \u2014 only levels.',
    '\ud83d\udc38\ud83d\udca5 PUT PRESSURE! Make the VAWULENCE loud!!\n\nE don pass explanation. We done pass the talking stage. E don reach action time.',
    '\ud83d\udc38\ud83d\udd25 Today weather forecast:\nHeavy vawulence with scattered pepper soup\nExpected arrival: RIGHT NOW\n\nAbeg run if you no get levels.',
    '\ud83d\udc38 Vawulence loading...\n\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2591 99%\n\nPlease hold. The chaos is almost ready. Do not turn off your phone.',
    '\ud83d\udc38\ud83d\udd25 When person do you anyhow and you don reach your limit:\n\nNo talk, no beg \u2014 just VAWULENCE.\nBBN energy. Naija style. Full charge.',
    '\ud83d\udc38\ud83d\udcaa The vawulence was there from the beginning.\nWe tried peace. Peace no work.\nWe tried calm. Calm no work.\n\nSo we carry vawulence gbas gbos.',
    '\ud83d\udc38\ud83d\udd25 MINISTRY OF VAWULENCE \u2014 OFFICIAL NOTICE\n\nThis is to inform the general public:\n\u2022 Nonsense no longer accepted\n\u2022 Vawulence delivery: IMMEDIATE\n\u2022 No refund. No apology. Amen.',
    '\ud83d\udc38 Them say be the change you want to see in the world.\nSo we changed to VAWULENCE PROFESSOR.\n\nClass is now in session. Sit down.',
    '\ud83d\udc38\ud83d\udd25 When e pain you reach spirit level:\n\nNo cry. No beg.\nFull gbas, correct gbos.\nNaija certified. Worldwide approved.',
    '\ud83d\udc38\ud83d\udca5 VAWULENCE ALERT \u26a0\ufe0f\n\nPerson wey think say dem smart:\nYour grace period don expire.\nSettlement? No. Dialogue? No.\nOnly VAWULENCE available. Collect am.',
    '\ud83d\udc38 Abeg respect yourself before vawulence respect you FOR you.\n\nWe tried gentle. We tried nice.\nNow na Faculty of Vawulence first class degree dey show.',
    '\ud83d\udc38\ud83d\udd25 This na certified Naija vawulence.\nNot the small small one.\nThe one wey your ancestors go feel.\nFull voltage. No inverter. Direct current.',
    '\ud83d\udc38 BREAKING: Vawulence levels critical!\n\nPerson don cross the line.\nAll peacekeepers evacuated.\nOnly vawulence remains. Stay safe. \ud83d\udd25',
    '\ud83d\udc38\ud83d\udd25 Chairman of Vawulence has entered the chat.\n\nE no dey reason. E no dey negotiate.\nE only dey deliver \u2014 hot hot, no cooling period.',
    '\ud83d\udc38 When your patience don finish completely:\n\nYou become Professor Emeritus of Vawulence.\nHonorary degree. No thesis required.',
];

// ─── All locally stored verified meme images ─────────────────────────────────
const MEME_FILES = ["vawulence1.jpeg","vawulence2.jpeg","vawulence3.jpeg","v4.jpg","v5.png","v6.jpg","v7.webp","v8.jpg","v9.jpg","v10.jpg","v11.jpg","v12.jpg","v13.jpg","v14.jpg"];

const MEME_DIR = path.join(__dirname, '..', 'assets', 'vawulence');

function randItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function pickLocalMeme() {
    // Shuffle and try until one exists on disk (handles Railway cold pulls)
    const shuffled = MEME_FILES.slice().sort(function() { return Math.random() - 0.5; });
    for (var i = 0; i < shuffled.length; i++) {
        var f = path.join(MEME_DIR, shuffled[i]);
        if (fs.existsSync(f)) {
            var buf = fs.readFileSync(f);
            var ext = shuffled[i].split('.').pop().toLowerCase();
            var ct = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
            return { buf: buf, ct: ct, name: shuffled[i] };
        }
    }
    return null;
}

// ─── Plugin export ────────────────────────────────────────────────────────────
module.exports = {
    name: 'vawulence',
    aliases: ['vaw', 'vawy', 'violence'],
    description: 'Send a random verified Pepe-frog vawulence meme with Naija Pidgin caption \ud83d\udc38\ud83d\udd25',
    usage: '.vawulence [optional topic e.g. Tinubu / NEPA / Arsenal]',

    async execute(sock, m, args) {
        var topic = args.length ? args.join(' ').trim() : null;
        var caption = randItem(CAPTIONS);
        if (topic) caption = '\ud83d\udc38\ud83d\udd25 *' + topic + ' Vawulence*\n\n' + caption;

        await m.react('\u23f3');

        var imgData = pickLocalMeme();

        try {
            if (imgData) {
                await sock.sendMessage(
                    m.from,
                    { image: imgData.buf, caption: caption, mimetype: imgData.ct },
                    { quoted: m.raw }
                );
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
