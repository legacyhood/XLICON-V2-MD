module.exports={name:'contact',aliases:['vcard','savecontact','getcontact'],description:'Generate a contact card (.vcf) from any WhatsApp user — tap to save to phone',
async execute(sock,m,args){
    const target=m.mentionedJid?.[0]||m.quoted?.sender||(m.sender||'');
    const num=target.replace(/:\d+@/,'@').split('@')[0];
    if(!num) return m.reply('❌ Usage: .contact @user\nOr reply to a message: .contact');
    await m.react('⏳');
    try{
        let name=m.pushName||'+'+num;
        try{const prof=await sock.fetchStatus(target);name=prof?.status?prof.status.slice(0,40):name;}catch(_){}
        const vcard='BEGIN:VCARD\nVERSION:3.0\nFN:'+name+'\nTEL;type=CELL;waid='+num+':+'+num+'\nEND:VCARD';
        await sock.sendMessage(m.from,{contacts:{displayName:name,contacts:[{vcard}]}},{quoted:m});
        await m.react('✅');
    }catch(e){await m.react('❌');await m.reply('❌ Could not generate contact card: '+e.message);}
}};