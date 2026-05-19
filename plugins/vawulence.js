'use strict';
const path = require('path');
const fs = require('fs');

// ── Vawulence meme plugin ────────────────────────────────────────────────────
// Command: .vawulence           — sends random vawulence meme with Naija caption
// Command: .vawulence [text]    — custom target text with random meme
// Command: .vawulence @mention  — vawulence directed at mentioned person

// Naija pidgin vawulence captions — rotated randomly
const CAPTIONS = [
    '🐸🔥 VAWULENCE HAS BEEN ACTIVATED!!\n\nSomebody done do something wey dem no suppose do. Pepper don rest, e don reach fire.',
    '🐸 Faculty of VAWULENCE\nDepartment of Senior Vawulence Studies\nCourse: HOW TO SCATTER THINGS 101\n\nAdmission form dey open. No WAEC required — only levels.',
    '🐸💥 PUT PRESSURE!\nMake the VAWULENCE loud!!\n\nE don do pass explanation. We don pass the talking stage. It is time.',
    '🐸🔥 Today forecast for this group:\nHeavy vawulence with scattered pepper soup\nExpected time of arrival: NOW\n\nAbeg run if you no get levels.',
    '🐸 Vawulence loading...\n█████████░ 99%\n\nPlease wait. The chaos is almost ready. Do not turn off your phone.',
    '🐸🔥 When person do you anyhow and you don reach your limit:\n\nNo talk, no beg — just VAWULENCE.\nBBN energy. Naija style. Full charge.',
    '🐸💪 The vawulence was there from the beginning.\nWe tried peace. Peace no work.\nWe tried calm. Calm no work.\n\nSo we carry vawulence gbas gbos.',
    '🐸🔥 MINISTRY OF VAWULENCE OFFICIAL NOTICE\n\nThis is to inform the general public that:\n— Nonsense is no longer being accepted\n— Vawulence delivery starts immediately\n— No refund. No apology.',
    '🐸 Them say "be the change you want to see"\nSo we changed to VAWULENCE PROFESSOR.\n\nClass is now in session. Sit down.',
    '🐸🔥 When e pain you reach spirit level:\n\nNo cry, no beg.\nJust vawulence — full gbas, correct gbos.\nNaija certified. Worldwide approved.',
    '🐸💥 VAWULENCE NOTICE ⚠️\n\nThe person wey think say them smart:\nYour grace period don expire.\nSettlement? No. Dialogue? No.\nOnly VAWULENCE dey available.',
    '🐸 Abeg respect yourself before vawulence respect you for you.\n\nWe tried gentle. We done tried nice.\nNow na Faculty of Vawulence degree dey show.',
];

// Pick one at random
function randomCaption() {
    return CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)];
}

// Resolve asset path relative to project root
function assetPath(name) {
    return path.join(__dirname, '..', 'assets', 'vawulence', name);
}

const MEME_FILES = ['vawulence1.jpeg', 'vawulence2.jpeg', 'vawulence3.jpeg'];

function randomMeme() {
    return MEME_FILES[Math.floor(Math.random() * MEME_FILES.length)];
}

module.exports = {
    name: 'vawulence',
    description: 'Send Naija vawulence meme',
    usage: '.vawulence [target/text]',

    async onCommand(m, { sock, args }) {
        if (m.body.toLowerCase().split(' ')[0] !== '.vawulence') return;

        const target = args.join(' ').trim();
        const memeFile = assetPath(randomMeme());
        let caption = randomCaption();

        if (target) {
            caption = '🐸🔥 @' + target.replace('@', '').trim() + '\n\n' + caption;
        }

        try {
            const imageBuffer = fs.readFileSync(memeFile);
            await sock.sendMessage(m.from, {
                image: imageBuffer,
                caption: caption,
                mimetype: 'image/jpeg',
            }, { quoted: m.raw });
            await m.react('🔥');
        } catch (e) {
            // fallback: text only
            await m.reply('🐸🔥 VAWULENCE!!\n\n' + caption);
        }
    },
};
