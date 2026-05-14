let _db=null;
async function getDb(){if(_db)return _db;if(!process.env.MONGO_URI)return null;try{const c=new MongoClient(process.env.MONGO_URI,{serverSelectionTimeoutMS:5000});await c.connect();_db=c.db('xlicon_bot');return _db;}catch(e){return null;}}
const MEDALS=['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
module.exports={name:'leaderboard',aliases:['lb','top','topmembers','rank','stats'],description:'Show the most active members in this group by message count',
async execute(sock,m,args){
    if(!m.isGroup) return m.reply('❌ Leaderboard is a group-only feature.');
    const db=await getDb();
    if(!db) return m.reply('❌ MongoDB not connected.');
    const period=(args[0]||'all').toLowerCase();
    let dateFilter={};
    if(period==='week') dateFilter={lastMsg:{$gte:new Date(Date.now()-7*86400000)}};
    else if(period==='month') dateFilter={lastMsg:{$gte:new Date(Date.now()-30*86400000)}};
    const top=await db.collection('msg_counts').find({group:m.from,...dateFilter}).sort({count:-1}).limit(10).toArray();
    if(!top.length) return m.reply('📊 No message data yet. Start chatting and I will track activity!');
    const period_label=period==='week'?'This Week':period==='month'?'This Month':'All Time';
    const list=top.map((u,i)=>MEDALS[i]+' @'+u.senderNum+' — '+u.count.toLocaleString()+' msgs').join('\n');
    const mentions=top.map(u=>u.senderNum+'@s.whatsapp.net');
    await sock.sendMessage(m.from,{text:'╭━━━ 📊 GROUP LEADERBOARD ━━━╮\n🏆 *Most Active Members*\n📅 Period: '+period_label+'\n\n'+list+'\n\n> .leaderboard week / month / all\n> Messages tracked since bot was added',mentions},{quoted:m});
},
async onMessage(sock,m){
    if(!m.isGroup||!m.from||!m.sender||m.key?.fromMe) return;
    const db=await getDb(); if(!db) return;
    const senderNum=(m.sender||'').split('@')[0].replace(/:\d+$/,'');
    await db.collection('msg_counts').updateOne({group:m.from,senderNum},{$inc:{count:1},$set:{lastMsg:new Date(),name:m.pushName||senderNum}},{upsert:true});
}};