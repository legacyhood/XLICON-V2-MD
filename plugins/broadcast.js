module.exports = {
    name: 'broadcast',
    aliases: ['bc', 'announce'],
    description: 'Send a message to all groups the bot is in (owner only)',

    async execute(sock, m, args) {
        const isOwner = m.isOwner;
        if (!isOwner) return m.reply('❌ This command is for the owner only.');

        const sub = (args[0] || '').toLowerCase();

        // ── .broadcast list — show all groups bot is in ───────────────────
        if (sub === 'list') {
            const groups = await sock.groupFetchAllParticipating().catch(() => ({}));
            const entries = Object.values(groups);
            if (!entries.length) return m.reply('❌ The bot is not in any groups.');
            const lines = entries.map((g, i) => `  ${i + 1}. ${g.subject}`).join('\n');
            return m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃  📋 *GROUPS LIST*    ┃
╰━━━━━━━━━━━━━━━━━━━╯

${lines}

Total: *${entries.length} group${entries.length > 1 ? 's' : ''}*`
            );
        }

        // ── .broadcast <message> — send text to all groups ────────────────
        const text = args.join(' ').trim();
        const hasText = !!text;
        const hasQuoted = !!m.quoted;
        const isMedia = m.isMedia;

        if (!hasText && !hasQuoted && !isMedia) {
            return m.reply(
`❌ Provide a message to broadcast.

*Usage:*
  .broadcast Your message here
  .broadcast (reply to a message/image/video)
  .broadcast list — see all groups bot is in`
            );
        }

        await m.react('⏳');

        const groups = await sock.groupFetchAllParticipating().catch(() => ({}));
        const groupIds = Object.keys(groups);
        if (!groupIds.length) return m.reply('❌ The bot is not in any groups.');

        const header = `╭━━━━━━━━━━━━━━━━━━━╮\n┃  📢 *ANNOUNCEMENT*  ┃\n╰━━━━━━━━━━━━━━━━━━━╯\n\n`;
        let sent = 0, failed = 0;

        for (const gid of groupIds) {
            try {
                if (hasText) {
                    // Plain text broadcast
                    await sock.sendMessage(gid, { text: header + text });

                } else if (hasQuoted && m.quoted.isMedia) {
                    // Quoted media — download and forward with header as caption
                    const buffer = await m.quoted.download().catch(() => null);
                    if (buffer) {
                        const qType = m.quoted.mediaType;
                        const caption = header + (m.quoted.body || '');
                        if (qType === 'image') {
                            await sock.sendMessage(gid, { image: buffer, caption });
                        } else if (qType === 'video') {
                            await sock.sendMessage(gid, { video: buffer, caption, mimetype: 'video/mp4' });
                        } else {
                            await sock.sendMessage(gid, { text: header + (m.quoted.body || '') });
                        }
                    }

                } else if (hasQuoted) {
                    // Quoted text
                    await sock.sendMessage(gid, { text: header + (m.quoted.body || '') });

                } else if (isMedia) {
                    // The command message itself is media (image/video with caption)
                    const buffer = await m.download().catch(() => null);
                    if (buffer) {
                        const caption = header + (m.body || '');
                        if (m.mediaType === 'image') {
                            await sock.sendMessage(gid, { image: buffer, caption });
                        } else if (m.mediaType === 'video') {
                            await sock.sendMessage(gid, { video: buffer, caption, mimetype: 'video/mp4' });
                        }
                    }
                }

                sent++;
                // Delay to avoid WhatsApp rate limiting
                await new Promise(r => setTimeout(r, 1000));
            } catch (_) {
                failed++;
            }
        }

        await m.reply(
`✅ *Broadcast complete!*

📤 Sent: *${sent}*
❌ Failed: *${failed}*
📊 Total groups: *${groupIds.length}*`
        );
        await m.react('✅');
    }
};
