module.exports = {
    name: 'broadcast',
    aliases: ['bc', 'announce'],
    description: 'Broadcast a message to all groups the bot is in (owner only)',

    async execute(sock, m, args) {
        const owners = (global.owners || ['233533763772@s.whatsapp.net']);
        const isOwner = owners.some(o => m.sender.includes(o.split('@')[0]));
        if (!isOwner) return m.reply('❌ This command is for the owner only.');

        const text = args.join(' ').trim();
        if (!text && !m.quoted) return m.reply('❌ Provide a message to broadcast.\n\nUsage: _.broadcast Your message here_');

        await m.react('⏳');

        const groups = await sock.groupFetchAllParticipating().catch(() => ({}));
        const groupIds = Object.keys(groups);

        if (!groupIds.length) return m.reply('❌ The bot is not in any groups.');

        let sent = 0, failed = 0;
        const broadcastText = text || m.quoted?.body || '';
        const header = `╭━━━━━━━━━━━━━━━━━━━╮\n┃  📢 *ANNOUNCEMENT*  ┃\n╰━━━━━━━━━━━━━━━━━━━╯\n\n`;

        for (const gid of groupIds) {
            try {
                await sock.sendMessage(gid, { text: header + broadcastText });
                sent++;
                await new Promise(r => setTimeout(r, 800)); // rate limit
            } catch (_) { failed++; }
        }

        await m.reply(`✅ Broadcast complete!\n\n📤 Sent: ${sent}\n❌ Failed: ${failed}\n📊 Total groups: ${groupIds.length}`);
        await m.react('✅');
    }
};
