let _db=null;
async function getDb(){if(_db)return _db;if(!process.env.MONGO_URI)return null;try{const{MongoClient}=require('mongodb');const c=new MongoClient(process.env.MONGO_URI,{serverSelectionTimeoutMS:5000});await c.connect();_db=c.db('xlicon_bot');return _db;}catch(e){return null;}}
module.exports={name:'birthday',aliases:['bday','bd','setbirthday'],description:'Set and track birthdays. Bot auto-wishes on the day in groups',
async execute(sock,m,args){
    const db=await getDb();
    if(!db) return m.reply('❌ MongoDB not connected.');
    const sub=(args[0]||'').toLowerCase();
    if(sub==='list'){
        const all=await db.collection('birthdays').find(m.isGroup?{groups:m.from}:{}).toArray();
        if(!all.length) return m.reply('📋 No birthdays saved yet.\n\nAdd yours: .birthday set 25/12');
        const today=new Date(); const mm=today.getMonth()+1; const dd=today.getDate();
        const sorted=all.sort((a,b)=>{const[ad,am]=a.date.split('/').map(Number);const[bd,bm]=b.date.split('/').map(Number);const da=(am-mm)*31+(ad-dd);const db2=(bm-mm)*31+(bd-dd);return(da<0?da+365:da)-(db2<0?db2+365:db2);});
        return m.reply('🎂 *Birthdays:*\n\n'+sorted.map(b=>'• '+b.name+' — '+b.date+(b.date===dd+'/'+mm?' 🎂 TODAY!':'')).join('\n'));
    }
    if(sub==='set'||sub==='add'){
        const dateStr=args[1]; const name=args.slice(2).join(' ')||m.pushName||m.sender?.split('@')[0];
        if(!dateStr||!/^\d{1,2}\/\d{1,2}$/.test(dateStr)) return m.reply('❌ Usage: .birthday set DD/MM [Name]\nExample: .birthday set 25/12 John');
        const jid=(m.sender||'').replace(/:\d+@/,'@');
        await db.collection('birthdays').updateOne({jid},{$set:{jid,name,date:dateStr,updatedAt:new Date()},$addToSet:{groups:m.from}},{upsert:true});
        return m.reply('🎂 Birthday saved! *'+name+' — '+dateStr+'*\n\nI will wish you on your special day! 🎉');
    }
    if(sub==='remove'||sub==='delete'){
        const jid=(m.sender||'').replace(/:\d+@/,'@');
        await db.collection('birthdays').deleteOne({jid});
        return m.reply('✅ Birthday removed.');
    }
    m.reply('╭━━━ 🎂 BIRTHDAYS ━━━╮\n\n.birthday set DD/MM — Register your birthday\n.birthday list — See all birthdays\n.birthday remove — Remove yours\n\nExample: .birthday set 14/02');
},
async onMessage(sock,m){
    try{
        const db=await getDb(); if(!db) return;
        const now=new Date(); const dd=now.getDate(); const mm=now.getMonth()+1;
        const dateStr=dd+'/'+mm;
        const hour=now.getHours();
        if(hour!==8) return;
        const birthdays=await db.collection('birthdays').find({date:dateStr}).toArray();
        for(const b of birthdays){
            if(!b.jid) continue;
            const lastWished=b.lastWished;
            if(lastWished&&new Date(lastWished).toDateString()===now.toDateString()) continue;
            await sock.sendMessage(b.jid.split('@')[0]+'@s.whatsapp.net',{text:'🎂🎉 *Happy Birthday, '+b.name+'!* 🎉🎂\n\nWishing you a fantastic day filled with joy and everything you deserve! May all your dreams come true this year! 🥳\n\n— XLICON Bot 🤖'});
            for(const gid of(b.groups||[])){
                await sock.sendMessage(gid,{text:'🎂 *Happy Birthday @'+b.jid.split('@')[0]+'!* 🎉\n\nEvery'+String.fromCharCode(111)+'ne wish '+b.name+' a wonderful birthday today! 🥳🎊',mentions:[b.jid]});
            }
            await db.collection('birthdays').updateOne({jid:b.jid},{$set:{lastWished:now}});
        }
    }catch(_){}
}};