module.exports = {
    name: 'delete',
    aliases: ['del', 'unsend', 'remove'],
    description: 'Delete any message by replying to it (bot must be admin in groups)',

    async execute(sock, m, args) {
        const owners = global.owners || [];
        const senderNum = (m.sender || '').split('@')[0].replace(/:\d+$/, '');
        const isOwner = owners.some(o => o.split('@')[0].replace(/:\d+$/, '') === senderNum);

        if (!m.quoted) {
            return m.reply(
`❌ Reply to a message to delete it.

*Usage:*
  Reply to any message → *${global.BOT_PREFIX || '.'}delete*

*Note:* Bot must be group admin to delete others' messages.`
            );
        }

        // Check permission: owner can delete anything, group members can delete own messages only
        if (m.isGroup) {
            const groupMeta = await sock.groupMetadata(m.chat).catch(() => null);
            const botId = (sock.user?.id || '').split(':')[0] + '@s.whatsapp.net';
            const botAdmin = groupMeta?.participants?.find(p => p.id === botId)?.admin;

            if (!botAdmin && !isOwner) {
                return m.reply('❌ Bot must be a group admin to delete messages.');
            }

            const quotedSender = m.quoted.sender || m.quoted.key?.participant;
            const isOwnMessage = quotedSender === m.sender ||
                                 (sock.user?.id && quotedSender === sock.user.id.split(':')[0] + '@s.whatsapp.net');

            // Non-owners can only delete their own messages
            if (!isOwner && !isOwnMessage) {
                const senderAdmin = groupMeta?.participants?.find(p =>
                    p.id === (m.sender.includes('@') ? m.sender : m.sender + '@s.whatsapp.net')
                )?.admin;
                if (!senderAdmin) {
                    return m.reply('❌ You can only delete your own messages unless you are a group admin or owner.');
                }
            }
        }

        try {
            await sock.sendMessage(m.chat, {
                delete: m.quoted.key
            });
            // React silently to confirm
            await m.react('🗑️').catch(() => {});
        } catch (err) {
            await m.reply(`❌ Could not delete the message: ${err.message.slice(0, 80)}`);
        }
    }
};
