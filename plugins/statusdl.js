/**
 * Status Downloader
 * Sends a specific contact's cached statuses to your DM on demand.
 * Requires anonview to be ON so statuses get cached as they arrive.
 */

module.exports = {
    name: 'statusdl',
    aliases: ['getstatus', 'vstatus'],
    description: 'Download cached statuses for a specific contact',

    async execute(sock, m, args) {
        if (!m.isOwner) return m.reply('❌ This command is for the owner only.');

        const cache = global.statusCache;
        if (!cache || cache.size === 0) {
            return m.reply(
`❌ No statuses cached yet.

Make sure *anonview* is ON (.anonview) and wait for contacts to post statuses.
They arrive automatically as people update their status.`
            );
        }

        const sub = (args[0] || '').toLowerCase();

        // ── .statusdl list — show who has cached statuses ─────────────────
        if (!sub || sub === 'list') {
            const lines = [];
            for (const [jid, entries] of cache.entries()) {
                const num   = jid.split('@')[0];
                const name  = entries[entries.length - 1]?.pushName || num;
                const count = entries.length;
                const ago   = Math.round((Date.now() - entries[entries.length - 1].ts) / 60000);
                lines.push(`  • +${num} (${name}) — ${count} status${count > 1 ? 'es' : ''}, ${ago}m ago`);
            }
            return m.reply(
`╭━━━━━━━━━━━━━━━━━━━━━━╮
┃    📥 *CACHED STATUSES*   ┃
╰━━━━━━━━━━━━━━━━━━━━━━╯

${lines.join('\n')}

📖 *Download:* .statusdl <number>
  e.g. .statusdl 2348012345678`
            );
        }

        // ── .statusdl clear — clear all cached statuses ───────────────────
        if (sub === 'clear') {
            cache.clear();
            return m.reply('✅ Status cache cleared.');
        }

        // ── .statusdl <number> — send that contact's statuses to owner DM ─
        const numClean = sub.replace(/\D/g, '');
        const targetJid = `${numClean}@s.whatsapp.net`;

        const entries = cache.get(targetJid);
        if (!entries || entries.length === 0) {
            return m.reply(
`❌ No cached statuses for *+${numClean}*.

Either:
• They haven't posted a status since anonview was turned ON
• Or anonview is OFF — run *.anonview* to enable caching`
            );
        }

        const ownerJid = (global.owners || [])[0] || sock.user.id;
        const name     = entries[entries.length - 1]?.pushName || numClean;

        await m.reply(`📥 Sending ${entries.length} status${entries.length > 1 ? 'es' : ''} from *${name}* (+${numClean}) to your DM...`);

        let sent = 0;
        for (const entry of entries) {
            try {
                const ago     = Math.round((Date.now() - entry.ts) / 60000);
                const timeStr = ago < 60 ? `${ago}m ago` : `${Math.round(ago / 60)}h ago`;
                const header  = `👤 *${entry.pushName || numClean}* (+${numClean})\n🕐 ${timeStr}`;

                if (entry.type === 'image') {
                    await sock.sendMessage(ownerJid, {
                        image: entry.buffer,
                        caption: `${header}${entry.caption ? '\n📝 ' + entry.caption : ''}`
                    });
                } else if (entry.type === 'video') {
                    await sock.sendMessage(ownerJid, {
                        video: entry.buffer,
                        mimetype: 'video/mp4',
                        caption: `${header}${entry.caption ? '\n📝 ' + entry.caption : ''}`
                    });
                } else if (entry.type === 'text') {
                    await sock.sendMessage(ownerJid, {
                        text: `${header}\n\n📝 ${entry.text}`
                    });
                } else if (entry.type === 'audio') {
                    await sock.sendMessage(ownerJid, {
                        audio: entry.buffer,
                        mimetype: 'audio/ogg; codecs=opus',
                        ptt: true
                    });
                }
                sent++;
                // Small delay between sends to avoid rate limiting
                await new Promise(r => setTimeout(r, 500));
            } catch (e) {
                console.error('[statusdl] send error:', e.message);
            }
        }

        await m.reply(`✅ Sent ${sent}/${entries.length} statuses from *${name}* to your DM.`);
    }
};
