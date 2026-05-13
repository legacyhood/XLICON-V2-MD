module.exports = {
    name: 'add',
    aliases: ['addmember'],
    description: 'Add a member to the group by phone number',

    async execute(sock, m, args) {
        if (!m.isGroup) return m.reply('❌ This command only works in groups.');

        const botId = sock.user.id.replace(/:\d+@/, '@');
        const meta = await sock.groupMetadata(m.from).catch(() => null);
        const botMember = meta?.participants.find(p => p.id.replace(/:\d+@/, '@') === botId);
        if (!botMember?.admin) return m.reply('❌ I need to be an admin to add members.');

        const num = (args[0] || '').replace(/[^0-9]/g, '');
        if (!num || num.length < 7) return m.reply('❌ Please provide a valid phone number.\n\nUsage: _.add 233XXXXXXXXX_');

        const jid = num + '@s.whatsapp.net';
        await m.react('⏳');

        const result = await sock.groupParticipantsUpdate(m.from, [jid], 'add');
        const status = result?.[0]?.status;

        if (status === '200') {
            await sock.sendMessage(m.from, { text: `✅ @${num} has been added to the group!`, mentions: [jid] });
            await m.react('✅');
        } else if (status === '403') {
            await m.reply(`❌ +${num} has their privacy settings preventing them from being added to groups.`);
            await m.react('❌');
        } else if (status === '408') {
            await m.reply(`❌ +${num} is not on WhatsApp or the number is invalid.`);
            await m.react('❌');
        } else {
            await m.reply(`❌ Failed to add +${num}. Status: ${status}`);
            await m.react('❌');
        }
    }
};
