module.exports = {
    name: 'creator',
    description: 'Show owner/creator contact card',
    aliases: ['owner', 'Gowner'],

    async execute(sock, m) {
        try {
            const owners = global.owners || [];
            if (!owners.length) return m.reply('❌ No owner configured. Set BOT_OWNER_JID in environment.');

            const contacts = owners.map(jid => {
                const num = jid.split('@')[0].replace(/:\d+$/, '');
                const vcard = [
                    'BEGIN:VCARD',
                    'VERSION:3.0',
                    'N:;XLICON Owner;;;',
                    'FN:XLICON Owner',
                    'TEL;waid=' + num + ':' + num,
                    'X-WA-BIZ-NAME:XLICON V2-MD',
                    'END:VCARD'
                ].join('\n');
                return { displayName: 'XLICON Owner', vcard };
            });

            await sock.sendMessage(m.from, { contacts: { contacts } });
        } catch (err) {
            console.error('[creator]', err.message);
            await m.reply('❌ Error fetching owner contact.').catch(() => {});
        }
    }
};
