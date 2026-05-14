module.exports={name:'report',aliases:['flag','reportuser'],description:'Report a member to group admins — works in groups only',
async execute(sock,m,args){
    if(!m.isGroup) return m.reply('❌ Report only works in groups.');
    const target=m.mentionedJid?.[0]||m.quoted?.sender;
    const reason=args.filter(a=>!a.startsWith('@')).join(' ')||'No reason given';
    const reporter=m.pushName||m.sender?.split('@')[0];
    if(!target) return m.reply('❌ Usage: .report @user <reason>\nOr reply to a message: .report <reason>');
    const targetNum=target.replace(/:\d+@/,'@').split('@')[0];
    const msg='🚨 *MEMBER REPORT*\n\nReported by: @'+m.sender?.split('@')[0]+'\nReported user: @'+targetNum+'\nReason: '+reason+'\n\nGroup: '+m.from;
    try{
        const meta=await sock.groupMetadata(m.from);
        const admins=meta.participants.filter(p=>p.admin).map(p=>p.id);
        const mentions=[m.sender,...admins,target].filter(Boolean);
        await sock.sendMessage(m.from,{text:msg,mentions},{quoted:m});
        await m.react('📩');
    }catch(e){await m.reply('❌ Could not send report: '+e.message);}
}};