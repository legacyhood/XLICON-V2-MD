'use strict';
const path = require('path');
const fs = require('fs');

const CAPTIONS = [
    '\ud83d\udc38\ud83d\udd25 VAWULENCE HAS BEEN ACTIVATED!!\n\nSomebody don do something wey dem no suppose do. Pepper don rest, e don reach fire now.',
    '\ud83d\udc38 Faculty of VAWULENCE\nDepartment of Senior Vawulence Studies\nCourse Title: HOW TO SCATTER THINGS 101\n\nAdmission form dey open. No WAEC required \u2014 only levels.',
    '\ud83d\udc38\ud83d\udca5 PUT PRESSURE!\nMake the VAWULENCE loud!!\n\nE don do pass explanation. We don pass the talking stage. It is time.',
    '\ud83d\udc38\ud83d\udd25 Today weather forecast:\nHeavy vawulence with scattered pepper soup\nExpected arrival time: RIGHT NOW\n\nAbeg run if you no get levels.',
    '\ud83d\udc38 Vawulence loading...\n\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2591 99%\n\nPlease hold. The chaos is almost ready. Do not turn off your phone.',
    '\ud83d\udc38\ud83d\udd25 When person do you anyhow and you don reach your limit:\n\nNo talk, no beg \u2014 just VAWULENCE.\nBBN energy. Naija style. Full charge.',
    '\ud83d\udc38\ud83d� The vawulence was there from the beginning.\nWe tried peace. Peace no work.\nWe tried calm. Calm no work.\n\nSo we carry vawulence gbas gbos.',
    '\ud83d\udc38\ud83d\udd25 MINISTRY OF VAWULENCE \u2014 OFFICIAL NOTICE\n\nThis is to inform the general public that:\n\u2022 Nonsense is no longer being accepted\n\u2022 Vawulence delivery starts immediately\n\u2022 No refund. No apology. Amen.',
    '\ud83d\udc38 Them say be the change you want to see in the world\nSo we changed to VAWULENCE PROFESSOR.\n\nClass is now in session. Sit down.',
    '\ud83d\udc38\ud83d\udd25 When e pain you reach spirit level:\n\nNo cry. No beg.\nJust vawulence \u2014 full gbas, correct gbos.\nNaija certified. Worldwide approved.',
    '\ud83d\udc38\ud83d\udca5 VAWULENCE ALERT \u26a0\ufe0f\n\nThe person wey think say dem smart:\nYour grace period don expire.\nSettlement? No. Dialogue? No.\nOnly VAWULENCE dey available. Collect am.',
    '\ud83d\udc38 Abeg respect yourself before vawulence respect you FOR you.\n\nWe tried gentle. We tried nice.\nNow na Faculty of Vawulence first class degree dey show.',
    '\ud83d\udc38\ud83d\udd25 This na certified Naija vawulence.\n\nNot the small small one.\nThe one wey your ancestors will feel.\nFull voltage. No inverter. Direct current.',
    '\ud83d\udc38 BREAKING: Vawulence levels critical!\n\nSources confirm that person don cross the line.\nAll peacekeepers have been evacuated.\nOnly vawulence remains. Stay safe. \ud83d\udd25',
    '\ud83d\udc38\ud83d\udd25 Chairman of Vawulence has entered the chat.\n\nE no dey reason. E no dey negotiate.\nE only dey deliver \u2014 hot hot, no cooling period.',
];

function randItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const MEME_NAMES = ['vawulence1.jpeg', 'vawulence2.jpeg', 'vawulence3.jpeg'];

module.exports = {
    name: 'vawulence',
    aliases: ['vaw', 'vawy', 'violence'],
    description: 'Send a Naija vawulence meme with a random Pidgin English caption \ud83d\udc38\ud83d\udd25',
    usage: '.vawulence [optional: target name or text]',

    async execute(sock, m, args) {
        const memeFile = path.join(__dirname, '..', 'assets', 'vawulence', randItem(MEME_NAMES));
        const target = args.length ? args.join(' ').trim() : null;
        let caption = randItem(CAPTIONS);
        if (target) caption = '\ud83d\udc38\ud83d\udd25 *' + target + '*\n\n' + caption;
        try {
            if (!fs.existsSync(memeFile)) throw new Error('asset missing: ' + memeFile);
            const imageBuffer = fs.readFileSync(memeFile);
            await sock.sendMessage(m.from, { image: imageBuffer, caption: caption, mimetype: 'image/jpeg' }, { quoted: m.raw });
            await m.react('\ud83d\udd25');
        } catch (e) {
            await m.reply('\ud83d\udc38\ud83d\udd25 VAWULENCE!!\n\n' + caption);
            await m.react('\ud83d\udd25');
        }
    },
};