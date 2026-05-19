'use strict';
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const path = require('path');
const fs   = require('fs');

const MEME_DIR = path.join(__dirname, '..', 'assets', 'vawulence');

module.exports = {
    name: 'savevaw',
    aliases: ['addvaw', 'addvawulence'],
    description: 'Owner-only: save an image permanently into the vawulence meme pool',
    usage: '.savevaw — caption an image, or reply to any image',

    async execute(sock, m, args) {
        if (!m.isOwner) return m.reply('\u274c Only the bot owner can save vawulence images.');

        // Accept: image sent WITH this caption, OR a replied-to image
        const target = (m.type === 'imageMessage' && m.isMedia) ? m
                     : (m.quoted && m.quoted.type === 'imageMessage' && m.quoted.isMedia) ? m.quoted
                     : null;

        if (!target) {
            return m.reply(
                '\ud83d\udcf8 *How to add a vawulence image:*\n\n' +
                '1\ufe0f\u20e3 Send an image and type *.savevaw* as the caption\n' +
                '2\ufe0f\u20e3 OR reply to any image with *.savevaw*\n\n' +
                'Saved images are used FIRST (before any online source) every time someone calls *.vawulence*.'
            );
        }

        await m.react('\u23f3');

        const buffer = await downloadMediaMessage(
            { message: target.message, key: target.key },
            'buffer', {}, sock
        ).catch(() => null);

        if (!buffer || buffer.length < 2000) {
            await m.react('\u274c');
            return m.reply('\u274c Could not download the image. Please try again.');
        }

        const mime = (target.message && target.message.imageMessage && target.message.imageMessage.mimetype) || 'image/jpeg';
        const ext  = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';

        if (!fs.existsSync(MEME_DIR)) fs.mkdirSync(MEME_DIR, { recursive: true });

        const filename = 'vaw_' + Date.now() + '.' + ext;
        fs.writeFileSync(path.join(MEME_DIR, filename), buffer);

        const total = fs.readdirSync(MEME_DIR)
            .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f)).length;

        await m.react('\u2705');
        await m.reply(
            '\u2705 *Vawulence image saved!*\n\n' +
            '\ud83d\udcc1 ' + filename + '  (' + (buffer.length / 1024).toFixed(1) + ' KB)\n' +
            '\ud83d\udc38 Total saved memes: *' + total + '*\n\n' +
            '_Your images are always sent first when anyone uses .vawulence_'
        );
    },
};
