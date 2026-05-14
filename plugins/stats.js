let _db=null;
async function getDb(){if(_db)return _db;if(!process.env.MONGO_URI)return null;try{const{MongoClient}=require('mongodb');const c=new MongoClient(process.env.MONGO_URI,{serverSelectionTimeoutMS:5000});await c.connect();_db=c.db('xlicon_bot');return _db;}catch(e){return null;}}
module.exports={name:'stats',aliases:['botstats','analytics','dashboard'],description:'Show full bot statistics — messages, commands, active chats, uptime',
async execute(sock,m,args){
    const db=await getDb();
    const up=process.uptime();
    const uptimeStr=Math.floor(up/3600)+'h '+Math.floor((up%3600)/60)+'m '+Math.floor(up%60)+'s';
    const mem=(process.memoryUsage().rss/1024/1024).toFixed(1);
    const cpu=process.cpuUsage();
    await m.react('⏳');
    try{
        let totalMsgs=0,totalGroups=0,totalUsers=0,totalNotes=0,totalReminders=0,totalAiChats=0;
        if(db){
            [totalMsgs,totalGroups,totalUsers,totalNotes,totalAiChats]= await Promise.all([
                db.collection('msg_counts').aggregate([{$group:{_id:null,total:{$sum:'$count'}}}]).toArray().then(r=>r[0]?.total||0),
                db.collection('msg_counts').distinct('group').then(r=>r.length),
                db.collection('msg_counts').distinct('senderNum').then(r=>r.length),
                db.collection('notes').countDocuments(),
                db.collection('aichat_settings').countDocuments({enabled:true})
            ]);
        }
        const aiProvider=process.env.GROQ_API_KEY?'Groq/Llama 3 🟢':process.env.ANTHROPIC_API_KEY?'Claude 🟢':'Not set ❌';
        await m.reply('╭━━━ 📊 BOT STATISTICS ━━━╮\n\n⏱️ Uptime: '+uptimeStr+'\n💾 RAM: '+mem+' MB\n🤖 AI Provider: '+aiProvider+'\n\n📬 Total Messages Tracked: '+totalMsgs.toLocaleString()+'\n👥 Active Groups: '+totalGroups+'\n👤 Unique Users: '+totalUsers+'\n📝 Saved Notes: '+totalNotes+'\n🤖 AI Auto-Chat Chats: '+totalAiChats+'\n\n🔌 MongoDB: '+(db?'✅ Connected':'❌ Disconnected')+'\n🟢 Status: Online\n\n> .leaderboard — see top members in a group');
        await m.react('📊');
    }catch(e){await m.react('❌');await m.reply('❌ Error fetching stats: '+e.message);}
}};