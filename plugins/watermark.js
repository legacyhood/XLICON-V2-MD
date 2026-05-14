const fetch = require('node-fetch');
module.exports = {
    name: 'watermark',
    aliases: ['wm', 'addtext', 'stamp'],
    description: 'Add a text watermark to an image — reply to or send an image with .watermark <text>',
    async execute(sock, m, args) {
        const text = args.join(' ').trim() || 'XLICON';
        const hasImg = m.type === 'imageMessage' || (m.quoted && m.quoted.type === 'imageMessage');
        if (!hasImg) return m.reply('❌ Reply to an image or send one with this command.\nExample: .watermark My Name  (reply to image)');
        try {
            await m.react('⏳');
            const target = m.type === 'imageMessage' ? m : m.quoted;
            const buf = await target.download();

            // Use html5 canvas via cloudinary-style API (no native deps)
            // Encode image to base64, use freeimage.host or similar
            // Fallback: overlay text via sharp alternative — use jimp if available
            let jimp;
            try { jimp = require('jimp'); } catch (_) { jimp = null; }

            if (jimp) {
                const img = await jimp.read(buf);
                const w = img.getWidth(); const h = img.getHeight();
                let font;
                try { font = await jimp.loadFont(jimp.FONT_SANS_64_WHITE); } catch (_) {
                    try { font = await jimp.loadFont(jimp.FONT_SANS_32_WHITE); } catch (_) {
                        font = await jimp.loadFont(jimp.FONT_SANS_16_WHITE);
                    }
                }
                const tw = jimp.measureText(font, text);
                const th = jimp.measureTextHeight(font, text, w);
                img.print(font, w - tw - 20, h - th - 20, text);
                const out = await img.getBufferAsync(jimp.MIME_JPEG);
                await sock.sendMessage(m.from, { image: out, caption: '🖼️ Watermark added: *' + text + '*' }, { quoted: m });
                return await m.react('✅');
            }

            // Without jimp: use photon API (free, no key) to overlay text
            // encode image to base64 data URI and use textoverlay approach
            const b64 = buf.toString('base64');
            const mime = 'image/jpeg';
            // Use cloudimage or placeholder text — send original with caption note
            await sock.sendMessage(m.from, {
                image: buf,
                caption: '🖼️ *' + text + '*\n\n_(Watermark text shown in caption — image processing library not yet installed on server. Owner: run \'npm install jimp\' locally and push to Railway for embedded watermarks.)_'
            }, { quoted: m });
            await m.react('✅');
        } catch (e) {
            await m.react('❌');
            await m.reply('❌ Watermark failed: ' + e.message);
        }
    }
};