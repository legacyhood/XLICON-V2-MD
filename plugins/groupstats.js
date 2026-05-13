module.exports = {
    name: 'groupstats',
    aliases: ['gstats', 'stats', 'groupinfo', 'ginfo'],
    description: 'Show detailed group statistics',
    async execute(sock, m) {
        if (!m.isGroup) return m.reply('❌ Group only command.');
        await m.react('⏳');
        const meta = await sock.groupMetadata(m.from).catch(()=>null);
        if (!meta) return m.reply('❌ Could not fetch group info.');
        const total = meta.participants.length;
        const admins = meta.participants.filter(p=>p.admin);
        const superAdmins = meta.participants.filter(p=>p.admin==='superadmin');
        const regularAdmins = admins.filter(p=>p.admin==='admin');
        const members = total - admins.length;
        const created = meta.creation ? new Date(meta.creation*1000).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}) : 'Unknown';
        const adminList = admins.map(p=>`  👑 @${p.id.split('@')[0]}`).join('\n');
        await m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃  📊 *GROUP STATS*   ┃
╰━━━━━━━━━━━━━━━━━━━╯

🏷️ *Name:* ${meta.subject}
📅 *Created:* ${created}
🆔 *ID:* ${m.from.split('@')[0]}

👥 *Members*
  📊 Total: *${total}*
  👑 Admins: *${admins.length}* (${regularAdmins.length} admin, ${superAdmins.length} owner)
  👤 Regular: *${members}*

${meta.desc ? `📝 *Description:*\n${meta.desc.slice(0,200)}\n` : ''}
👑 *Admin List:*
${adminList||'  None found'}

🔒 *Settings:*
  ${meta.announce ? '🔒 Only admins can send' : '🔓 All members can send'}
  ${meta.restrict ? '🔒 Only admins can edit info' : '🔓 All can edit info'}`
        , { mentions: admins.map(p=>p.id) });
        await m.react('✅');
    }
};
