let _db=null;
async function getDb(){if(_db)return _db;if(!process.env.MONGO_URI)return null;try{const{MongoClient}=require('mongodb');const c=new MongoClient(process.env.MONGO_URI,{serverSelectionTimeoutMS:5000});await c.connect();_db=c.db('xlicon_bot');return _db;}catch(e){return null;}}
const cache=new Map();
async function isOn(jid){if(cache.has(jid))return cache.get(jid);const db=await getDb();const v=db?(await db.collection('group_settings').findOne({_id:jid}))?.antiforward===true:false;cache.set(jid,v);return v;}
async function setOn(jid,val){cache.set(jid,val);const db=await getDb();if(db)await db.collection('group_settings').updateOne({_id:jid},{$set:{antiforward:val}},{upsert:true});}
module.exports={name:'antiforward',aliases:['noforward','blockforward','af'],description:'Block forwarded messages in the group — admin only',
async execute(sock,m,args){
    if(!m.isGroup) return m.reply('❌ Only works in groups.');
    if(!m.isAdmin&&!m.isBotAdmin) return m.reply('❌ Admin only.');
    const sub=(args[0]||'').toLowerCase();
    if(sub==='on'){await setOn(m.from,true);return m.reply('✅ Anti-Forward ON\n\nAll forwarded messages from non-admins will be deleted automatically.');}
    if(sub==='off'){await setOn(m.from,false);return m.reply('✅ Anti-Forward OFF');}
    const status=await isOn(m.from);
    m.reply('╭━━━ 🚫 ANTI-FORWARD ━━━╮\n\nStatus: '+(status?'✅ ON':'❌ OFF')+'\n\n.antiforward on — Block all forwarded messages\n.antiforward off — Allow forwards');
},
async onMessage(sock,m){
    if(!m.isGroup||m.isAdmin||!m.from) return;
    const on=await isOn(m.from); if(!on) return;
    const msg=m.raw?.message;
    if(!msg) return;
    const isForwarded=Object.values(msg).some(v=>v?.contextInfo?.isForwarded===true||v?.contextInfo?.forwardingScore>0);
    if(!isForwarded) return;
    await sock.sendMessage(m.from,{delete:m.key});
    await sock.sendMessage(m.from,{text:'🚫 @'+m.sender?.split('@')[0]+' Forwarded messages are not allowed in this group.',mentions:[m.sender]},{quoted:m});
}};