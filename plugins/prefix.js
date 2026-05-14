let _db=null;
async function getDb(){if(_db)return _db;if(!process.env.MONGO_URI)return null;try{const c=new MongoClient(process.env.MONGO_URI,{serverSelectionTimeoutMS:5000});await c.connect();_db=c.db('xlicon_bot');return _db;}catch(e){return null;}}
module.exports={name:'prefix',aliases:['setprefix','changeprefix','botprefix'],description:'Change the bot command prefix without touching Railway — owner only',
async execute(sock,m,args){
    const isOwner = m.isOwner;
    if(!isOwner) return m.reply('❌ Owner only command.');
    const newPrefix=args[0];
    if(!newPrefix) {
        const current=global.BOT_PREFIX||'.';
        return m.reply('╭━━━ ⚙️ BOT PREFIX ━━━╮\n\nCurrent prefix: *'+current+'*\n\nChange it: .prefix <new_prefix>\n\nExamples:\n.prefix !\n.prefix /\n.prefix #\n\n⚠️ Changing this will require using the new prefix immediately.');
    }
    if(newPrefix.length>3) return m.reply('❌ Prefix must be 1-3 characters.');
    const old=global.BOT_PREFIX||'.';
    global.BOT_PREFIX=newPrefix;
    const db=await getDb();
    if(db) await db.collection('bot_settings').updateOne({_id:'prefix'},{$set:{prefix:newPrefix,updatedAt:new Date()}},{upsert:true});
    await m.reply('✅ *Prefix changed!*\n\nOld prefix: *'+old+'*\nNew prefix: *'+newPrefix+'*\n\nAll commands now start with: *'+newPrefix+'help*, *'+newPrefix+'menu*, etc.\n\n💾 Saved — survives restarts');
},
async onStart(){
    const db=await getDb(); if(!db) return;
    const s=await db.collection('bot_settings').findOne({_id:'prefix'});
    if(s?.prefix) global.BOT_PREFIX=s.prefix;
}};