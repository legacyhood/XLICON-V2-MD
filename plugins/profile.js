const fetch = require('node-fetch');

module.exports = {
    name: 'profile',
    aliases: ['pp', 'dp', 'profilepic'],
    description: 'Download profile picture of any user',

    async execute(sock, m, args) {
        try {
            let jid;

            if (m.quoted) {
                jid = m.quoted.sender || m.quoted.key?.participant || m.quoted.key?.remoteJid;
            } else if (m.mentionedJid && m.mentionedJid.length > 0) {
                jid = m.mentionedJid[0];
            } else if (args.length > 0) {
                const num = args[0].replace(/[^0-9]/g, '');
                if (num) jid = num + '@s.whatsapp.net';
            }

            if (!jid) jid = m.sender;
            if (jid && !jid.includes('@')) jid = jid + '@s.whatsapp.net';
            // Normalize :xx device suffix
            jid = jid.replace(/:\d+@/, '@');

            await m.react('⏳');

            const ppUrl = await sock.profilePictureUrl(jid, 'image').catch(() => null);

            if (!ppUrl) {
                await m.react('❌');
                return m.reply('❌ No profile picture found — the user may have it hidden or the number is invalid.');
            }

            const res = await fetch(ppUrl);
            const buffer = Buffer.from(await res.arrayBuffer());
            const num = jid.split('@')[0];

            await sock.sendMessage(m.from, {
                image: buffer,
                caption: `╭━━━━━━━━━━━━━━━━━╮\n┃  📸 *PROFILE PIC*  ┃\n╰━━━━━━━━━━━━━━━━━╯\n\n👤 *User:* @${num}\n📱 *Number:* +${num}`,
                mentions: [jid]
            }, { quoted: m });

            await m.react('✅');
        } catch (err) {
            console.error('[Profile] Error:', err.message);
            await m.react('❌');
            await m.reply('❌ Failed to fetch profile picture. Try again later.');
        }
    }
};
