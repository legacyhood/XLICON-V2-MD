module.exports = {
    name: 'info',
    aliases: ['whois', 'userinfo', 'groupinfo', 'gi'],
    description: 'Get info about a user or the current group',

    async execute(sock, m, args) {
        try {
            await m.react('⏳');

            // Group info mode
            if (m.isGroup && (args[0] === 'group' || args[0] === 'g' || (!m.quoted && !m.mentionedJid?.length && !args.length))) {
                const meta = await sock.groupMetadata(m.from).catch(() => null);
                if (!meta) return m.reply('❌ Could not fetch group info.');

                const admins = meta.participants.filter(p => p.admin).map(p => `• @${p.id.split('@')[0]}`).join('\n');
                const total = meta.participants.length;
                const adminCount = meta.participants.filter(p => p.admin).length;
                const created = meta.creation ? new Date(meta.creation * 1000).toLocaleDateString('en-GB') : 'Unknown';

                return m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃   📋 *GROUP INFO*    ┃
╰━━━━━━━━━━━━━━━━━━━╯

🏷️ *Name:* ${meta.subject}
👥 *Members:* ${total}
👑 *Admins:* ${adminCount}
📅 *Created:* ${created}
${meta.desc ? '\n📝 *Description:*\n' + meta.desc : ''}

👑 *Admin List:*
${admins}`
                );
            }

            // User info mode
            let jid = m.sender;
            if (m.quoted) jid = m.quoted.sender || m.quoted.key?.participant || m.quoted.key?.remoteJid;
            else if (m.mentionedJid?.length) jid = m.mentionedJid[0];
            jid = jid.replace(/:\d+@/, '@');
            if (!jid.includes('@')) jid += '@s.whatsapp.net';

            const num = jid.split('@')[0];
            const ppUrl = await sock.profilePictureUrl(jid, 'image').catch(() => null);

            let statusText = 'Hidden / not available';
            try {
                const status = await sock.fetchStatus(jid).catch(() => null);
                if (status?.status) statusText = status.status;
            } catch (_) {}

            const text =
`╭━━━━━━━━━━━━━━━━━━━╮
┃    👤 *USER INFO*    ┃
╰━━━━━━━━━━━━━━━━━━━╯

📱 *Number:* +${num}
🆔 *JID:* ${jid}
💬 *About:* ${statusText}
🖼️ *Profile Pic:* ${ppUrl ? 'Available' : 'Hidden'}`;

            if (ppUrl) {
                const fetch = require('node-fetch');
                const res = await fetch(ppUrl);
                const buf = Buffer.from(await res.arrayBuffer());
                await sock.sendMessage(m.from, { image: buf, caption: text, mentions: [jid] }, { quoted: m });
            } else {
                await m.reply(text);
            }

            await m.react('✅');
        } catch (err) {
            console.error('[info] Error:', err.message);
            await m.react('❌');
            await m.reply('❌ Failed to fetch info. Try again.');
        }
    }
};
