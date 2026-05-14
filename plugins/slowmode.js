const lastMsg=new Map(); // chatJid+senderJid → timestamp
let _db=null;
async function getDb(){if(_db)return _db;if(!process.env.MONGO_URI)return null;try{const c=new MongoClient(process.env.MONGO_URI,{serverSelectionTimeoutMS:5000});await c.connect();_db=c.db('xlicon_bot');return _db;}catch(e){return null;}}
const slowCache=new Map();
async function getSlowmode(jid){if(slowCache.has(jid))return slowCache.get(jid);const db=await getDb();const v=db?(await db.collection('slowmode').findOne({_id:jid}))?.seconds||0:0;slowCache.set(jid,v);return v;}
async function setSlowmode(jid,secs){slowCache.set(jid,secs);const db=await getDb();if(db)await db.collection('slowmode').updateOne({_id:jid},{$set:{seconds:secs}},{upsert:true});}
module.exports={name:'slowmode',aliases:['slow','cooldown','ratelimit'],description:'Set a cooldown between messages per member in a group — admin only',
async execute(sock,m,args){
    if(!m.isGroup) return m.reply('❌ Slowmode only works in groups.');
    if(!m.isAdmin&&!(global.owners||[]).some(o=>o.split('@')[0]===(m.sender||'').split('@')[0])) return m.reply('❌ Only group admins can change slowmode.');
    const secs=parseInt(args[0]);
    if(args[0]==='off'||secs===0){await setSlowmode(m.from,0);return m.reply('✅ Slowmode disabled.');}
    if(isNaN(secs)||secs<1) return m.reply('❌ Usage: .slowmode <seconds>\nExample: .slowmode 30\nDisable: .slowmode off\n\nSets a 30 second cooldown between messages per member.');
    await setSlowmode(m.from,secs);
    await m.reply('✅ Slowmode set to *'+secs+' seconds* per member in this group.');
},
async onMessage(sock,m){
    if(!m.isGroup||!m.from||!m.sender) return;
    const secs=await getSlowmode(m.from); if(!secs) return;
    if(m.isAdmin) return;
    const key=m.from+':'+m.sender;
    const last=lastMsg.get(key)||0;
    const now=Date.now();
    if(now-last<secs*1000){
        await sock.sendMessage(m.from,{delete:m.key});
        await sock.sendMessage(m.sender.split('@')[0]+'@s.whatsapp.net',{text:'⏳ Slowmode is active in that group ('+secs+'s cooldown). Please wait before sending another message.'});
    } else lastMsg.set(key,now);
}};