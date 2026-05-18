/**
 * Status Downloader — download cached statuses from contacts.
 * Uses in-memory global.statusCache (populated by anonview plugin).
 */

const getDb = () => global.getMongoDb();

module.exports = {
    name: 'statusdl',
    aliases: ['getstatus', 'vstatus'],
    description: 'Download cached statuses for a specific contact',

    async execute(sock, m, args) {
        if (!m.isOwner) return m.reply('\u274c This command is for the owner only.');

        const sub = (args[0] || '').toLowerCase();

        // .statusdl clear — checked FIRST before empty-cache guard
        if (sub === 'clear') {
            const cache = global.statusCache;
            const memCount = cache ? cache.size : 0;
            if (cache) cache.clear();
            const db = await getDb();
            let mongoCount = 0;
            if (db) {
                try {
                    const result = await db.collection('status_cache').deleteMany({});
                    mongoCount = result.deletedCount;
                } catch (e) {}
            }
            return m.reply(
                '\u2705 Status cache cleared!\n' +
                '\ud83d\udcf2 Memory: ' + memCount + ' contacts removed\n' +
                '\u2601\ufe0f MongoDB: ' + mongoCount + ' docs removed'
            );
        }

        const cache = global.statusCache;
        if (!cache || cache.size === 0) {
            return m.reply(
                '\u274c No statuses cached yet.\n\n' +
                'Make sure *anonview* is ON (.anonview) and wait for contacts to post statuses.\n' +
                'They arrive automatically as people update their status.'
            );
        }

        // .statusdl list
        if (!sub || sub === 'list') {
            const lines = [];
            for (const [jid, entries] of cache.entries()) {
                const num  = jid.split('@')[0];
                const name = entries[entries.length - 1]?.pushName || num;
                const cnt  = entries.length;
                const ago  = Math.round((Date.now() - entries[entries.length - 1].ts) / 60000);
                lines.push('  \u2022 +' + num + ' (' + name + ') \u2014 ' + cnt + ' status' + (cnt > 1 ? 'es' : '') + ', ' + ago + 'm ago');
            }
            return m.reply(
                '\ud83d\udce5 *Cached Statuses*\n\n' +
                lines.join('\n') +
                '\n\n\ud83d\udcd6 *Download:* .statusdl <number>\n  e.g. .statusdl 2348012345678'
            );
        }

        // .statusdl <number>
        const numClean  = sub.replace(/\D/g, '');
        const targetJid = numClean + '@s.whatsapp.net';
        const entries   = cache.get(targetJid);

        if (!entries || entries.length === 0) {
            return m.reply(
                '\u274c No cached statuses for *+' + numClean + '*.\n\n' +
                'Either:\n' +
                '\u2022 They have not posted a status since anonview was turned ON\n' +
                '\u2022 Or anonview is OFF \u2014 run *.anonview* to enable'
            );
        }

        const ownerJid = (global.owners || [])[0] || sock.user.id;
        const name = entries[entries.length - 1]?.pushName || numClean;
        await m.reply('\ud83d\udce5 Sending ' + entries.length + ' status' + (entries.length > 1 ? 'es' : '') + ' from *' + name + '* (+' + numClean + ') to your DM...');

        let sent = 0;
        for (const entry of entries) {
            try {
                const ago     = Math.round((Date.now() - entry.ts) / 60000);
                const timeStr = ago < 60 ? ago + 'm ago' : Math.round(ago / 60) + 'h ago';
                const header  = '\ud83d\udc64 *' + (entry.pushName || numClean) + '* (+' + numClean + ')\n\ud83d\udd50 ' + timeStr;
                if (entry.type === 'image' && entry.buffer) {
                    await sock.sendMessage(ownerJid, { image: entry.buffer, caption: header + (entry.caption ? '\n\ud83d\udcdd ' + entry.caption : '') });
                } else if (entry.type === 'video' && entry.buffer) {
                    await sock.sendMessage(ownerJid, { video: entry.buffer, mimetype: 'video/mp4', caption: header + (entry.caption ? '\n\ud83d\udcdd ' + entry.caption : '') });
                } else if (entry.type === 'text') {
                    await sock.sendMessage(ownerJid, { text: header + '\n\n\ud83d\udcdd ' + entry.text });
                } else if (entry.type === 'audio' && entry.buffer) {
                    await sock.sendMessage(ownerJid, { audio: entry.buffer, mimetype: 'audio/ogg; codecs=opus', ptt: true });
                }
                sent++;
                await new Promise(r => setTimeout(r, 500));
            } catch (e) {}
        }
        await m.reply('\u2705 Sent ' + sent + '/' + entries.length + ' statuses from *' + name + '* to your DM.');
    }
};
