const getDb = () => global.getMongoDb();
module.exports={name:'backup',aliases:['export','dumpdb'],description:'Export all bot settings to a JSON file sent to your DM — owner only',
async execute(sock,m,args){
    const isOwner = m.isOwner;
    if(!isOwner) return m.reply('❌ Owner only command.');
    const db=await getDb(); if(!db) return m.reply('❌ MongoDB not connected.');
    await m.react('⏳');
    try{
        const collections=['bot_settings','group_settings','auto_replies','aichat_settings','notes','todos','birthdays','spy_list','autoposts','slowmode','blacklist'];
        const backup={exportedAt:new Date().toISOString(),collections:{}};
        for(const col of collections){
            backup.collections[col]=await db.collection(col).find({}).toArray();
        }
        const json=JSON.stringify(backup,null,2);
        const buf=Buffer.from(json);
        const destJid=m.sender?.split('@')[0]+'@s.whatsapp.net';
        await sock.sendMessage(destJid,{document:buf,fileName:'xlicon_backup_'+Date.now()+'.json',mimetype:'application/json',caption:'📦 *XLICON Bot Backup*\n\nExported: '+new Date().toLocaleString()+'\nCollections: '+collections.length+'\nSize: '+(buf.length/1024).toFixed(1)+' KB\n\nKeep this file safe!'});
        if(destJid!==m.from) await m.reply('✅ Backup sent to your DM!');
        await m.react('✅');
    }catch(e){await m.react('❌');await m.reply('❌ Backup failed: '+e.message);}
}};