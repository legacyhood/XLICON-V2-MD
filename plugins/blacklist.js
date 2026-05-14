let _db=null;
async function getDb(){if(_db)return _db;if(!process.env.MONGO_URI)return null;try{const c=new MongoClient(process.env.MONGO_URI,{serverSelectionTimeoutMS:5000});await c.connect();_db=c.db('xlicon_bot');return _db;}catch(e){return null;}}
const blacklistCache=new Set();
let cacheLoaded=false;
async function loadCache(){
    if(cacheLoaded) return;
    const db=await getDb(); if(!db) return;
    const all=await db.collection('blacklist').find({}).toArray();
    all.forEach(u=>blacklistCache.add(u.num));
    cacheLoaded=true;
}
module.exports={name:'blacklist',aliases:['bl','ban','unban','globalban'],description:'Globally ban a number from using the bot in any chat — owner only',
async execute(sock,m,args){
    const owners=global.owners||[];
    const isOwner = m.isOwner;[0]===(m.sender||'').split('@')[0]);
    if(!isOwner) return m.reply('❌ Owner only command.');
    const db=await getDb(); if(!db) return m.reply('❌ MongoDB not connected.');
    await loadCache();
    const sub=(args[0]||'').toLowerCase();
    if(sub==='add'||sub==='ban'){
        const target=m.mentionedJid?.[0]||m.quoted?.sender;
        const num=target?(target.replace(/:\d+@/,'@').split('@')[0]):args[1]?.replace(/[^0-9]/g,'');
        if(!num) return m.reply('❌ Usage: .blacklist add @user\nOr: .blacklist add 2348XXXXXXXXX');
        blacklistCache.add(num);
        await db.collection('blacklist').updateOne({num},{$set:{num,addedAt:new Date(),addedBy:m.sender}},{upsert:true});
        return m.reply('🚫 +'+num+' globally blacklisted. They can no longer use any bot commands.');
    }
    if(sub==='remove'||sub==='unban'){
        const num=args[1]?.replace(/[^0-9]/g,'');
        if(!num) return m.reply('❌ Usage: .blacklist remove 2348XXXXXXXXX');
        blacklistCache.delete(num);
        await db.collection('blacklist').deleteOne({num});
        return m.reply('✅ +'+num+' removed from blacklist.');
    }
    if(sub==='list'){
        const all=await db.collection('blacklist').find({}).toArray();
        if(!all.length) return m.reply('📋 Blacklist is empty.');
        return m.reply('🚫 *Blacklisted Numbers:*\n\n'+all.map((u,i)=>(i+1)+'. +'+u.num).join('\n')+'\n\nUse .blacklist remove <num> to unban');
    }
    m.reply('╭━━━ 🚫 BLACKLIST ━━━╮\n\n.blacklist add @user — Global ban\n.blacklist add 2348XX — Ban by number\n.blacklist remove 2348XX — Unban\n.blacklist list — See all banned\n\n⚠️ Owner only');
},
isBlacklisted(num){return blacklistCache.has(num?.replace(/[^0-9]/g,''));},
async onStart(){await loadCache();}};