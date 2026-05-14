const getDb = () => global.getMongoDb();
let maintenanceMode=false;
let maintenanceMsg='🔧 Bot is currently under maintenance. Please try again later.';
module.exports={name:'maintenance',aliases:['maint','offline','botmaintenance'],description:'Put the bot into maintenance mode — ignores all non-owner commands — owner only',
async execute(sock,m,args){
    const isOwner = m.isOwner;
    if(!isOwner) return m.reply('❌ Owner only command.');
    const sub=(args[0]||'').toLowerCase();
    if(sub==='on'){
        maintenanceMode=true;
        const customMsg=args.slice(1).join(' ');
        if(customMsg) maintenanceMsg=customMsg;
        const db=await getDb();
        if(db) await db.collection('bot_settings').updateOne({_id:'maintenance'},{$set:{enabled:true,message:maintenanceMsg}},{upsert:true});
        return m.reply('🔧 *Maintenance mode ON*\n\nAll non-owner commands are now ignored.\nMessage shown: '+maintenanceMsg+'\n\nTurn off: .maintenance off');
    }
    if(sub==='off'){
        maintenanceMode=false;
        const db=await getDb();
        if(db) await db.collection('bot_settings').updateOne({_id:'maintenance'},{$set:{enabled:false}},{upsert:true});
        return m.reply('✅ *Maintenance mode OFF*\n\nBot is back online and accepting all commands!');
    }
    if(sub==='msg'||sub==='message'){
        maintenanceMsg=args.slice(1).join(' ')||maintenanceMsg;
        const db=await getDb();
        if(db) await db.collection('bot_settings').updateOne({_id:'maintenance'},{$set:{message:maintenanceMsg}},{upsert:true});
        return m.reply('✅ Maintenance message updated:\n\n'+maintenanceMsg);
    }
    m.reply('╭━━━ 🔧 MAINTENANCE ━━━╮\n\nStatus: '+(maintenanceMode?'🔴 ON — Bot offline':'🟢 OFF — Bot online')+'\n\n.maintenance on — Take bot offline\n.maintenance off — Bring bot online\n.maintenance on <custom message> — Custom message\n.maintenance msg <text> — Update message\n\n⚠️ Owner only');
},
isActive(){return maintenanceMode;},
getMessage(){return maintenanceMsg;},
async onStart(){
    const db=await getDb(); if(!db) return;
    const s=await db.collection('bot_settings').findOne({_id:'maintenance'});
    if(s?.enabled){maintenanceMode=true;if(s.message)maintenanceMsg=s.message;}
}};
