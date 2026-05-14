const getDb = () => global.getMongoDb();
const jobs=new Map();
function startJob(sock,post){
    if(jobs.has(post._id?.toString())) return;
    const[h,min]=(post.time||'08:00').split(':').map(Number);
    function scheduleNext(){
        const now=new Date();
        const next=new Date(now);
        next.setHours(h,min,0,0);
        if(next<=now) next.setDate(next.getDate()+1);
        const delay=next-now;
        const t=setTimeout(async()=>{
            try{await sock.sendMessage(post.chatJid,{text:post.message});}catch(_){}
            scheduleNext();
        },delay);
        jobs.set(post._id?.toString(),t);
    }
    scheduleNext();
}
module.exports={name:'autopost',aliases:['schedule','schedulepost','autobroadcast'],description:'Schedule a message to be posted automatically every day at a set time',
async execute(sock,m,args){
    const db=await getDb(); if(!db) return m.reply('❌ MongoDB not connected.');
    const isOwner = m.isOwner;
    if(!isOwner&&!m.isAdmin) return m.reply('❌ Owner or group admin only.');
    const sub=(args[0]||'').toLowerCase();
    if(sub==='add'||sub==='set'){
        const time=args[1]; const msg=args.slice(2).join(' ');
        if(!time||!/^\d{1,2}:\d{2}$/.test(time)||!msg) return m.reply('❌ Usage: .autopost add HH:MM <message>\nExample: .autopost add 08:00 Good morning everyone! ☀️');
        const post={chatJid:m.from,time,message:msg,createdAt:new Date()};
        const r=await db.collection('autoposts').insertOne(post);
        post._id=r.insertedId;
        startJob(sock,post);
        return m.reply('✅ Auto-post scheduled!\n\nTime: '+time+' daily\nMessage: '+msg);
    }
    if(sub==='list'){
        const posts=await db.collection('autoposts').find({chatJid:m.from}).toArray();
        if(!posts.length) return m.reply('📋 No auto-posts scheduled.\nAdd one: .autopost add 08:00 Good morning!');
        return m.reply('📋 *Scheduled Posts:*\n\n'+posts.map((p,i)=>(i+1)+'. '+p.time+' — '+p.message.slice(0,50)).join('\n')+'\n\nUse .autopost remove <number> to cancel one');
    }
    if(sub==='remove'||sub==='delete'){
        const idx=parseInt(args[1])-1;
        const posts=await db.collection('autoposts').find({chatJid:m.from}).toArray();
        if(isNaN(idx)||idx<0||idx>=posts.length) return m.reply('❌ Invalid number. Use .autopost list first.');
        const post=posts[idx];
        clearTimeout(jobs.get(post._id?.toString()));
        jobs.delete(post._id?.toString());
        await db.collection('autoposts').deleteOne({_id:post._id});
        return m.reply('✅ Auto-post removed.');
    }
    if(sub==='clear'){
        const posts=await db.collection('autoposts').find({chatJid:m.from}).toArray();
        posts.forEach(p=>{clearTimeout(jobs.get(p._id?.toString()));jobs.delete(p._id?.toString());});
        await db.collection('autoposts').deleteMany({chatJid:m.from});
        return m.reply('✅ All auto-posts cleared.');
    }
    m.reply('╭━━━ ⏰ AUTO-POST ━━━╮\n\n.autopost add HH:MM <text> — Schedule daily post\n.autopost list — View scheduled posts\n.autopost remove <n> — Cancel a post\n.autopost clear — Cancel all\n\nExample:\n.autopost add 07:00 Good morning! ☀️');
},
async onStart(sock){
    const db=await getDb(); if(!db) return;
    const posts=await db.collection('autoposts').find({}).toArray();
    for(const post of posts) startJob(sock,post);
}};