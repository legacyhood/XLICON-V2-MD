const presenceStates=new Map();
module.exports={name:'spy',aliases:['track','online','presence'],description:'Get notified in your DM when a specific contact comes online or goes offline',
async execute(sock,m,args){
    const db=await global.getMongoDb(); if(!db) return m.reply('❌ MongoDB not connected.');
    const sub=(args[0]||'').toLowerCase();
    if(!m.isOwner) return m.reply('❌ Owner only command.');
    if(sub==='list'){
        const list=await db.collection('spy_list').find({spierJid:m.sender}).toArray();
        if(!list.length) return m.reply('📋 Not spying on anyone.\nAdd: .spy add 2348XXXXXXXXX');
        return m.reply('👁️ *Spy List:*\n\n'+list.map((s,i)=>(i+1)+'. +'+s.targetNum+(presenceStates.get(s.targetJid)||'unknown'==='available'?' 🟢 Online':' ⚫ Offline')).join('\n')+'\n\nRemove: .spy remove <number>');
    }
    if(sub==='add'){
        const num=args[1]?.replace(/[^0-9]/g,''); if(!num) return m.reply('❌ Usage: .spy add 2348XXXXXXXXX');
        const targetJid=num+'@s.whatsapp.net';
        await db.collection('spy_list').updateOne({spierJid:m.sender,targetJid},{$set:{spierJid:m.sender,targetJid,targetNum:num,addedAt:new Date()}},{upsert:true});
        await sock.presenceSubscribe(targetJid).catch(()=>{});
        return m.reply('✅ Now tracking +'+num+'\n\nYou will be notified when they come online or go offline.\n\n.spy list — View all tracked contacts');
    }
    if(sub==='remove'||sub==='stop'){
        const idx=parseInt(args[1])-1;
        const list=await db.collection('spy_list').find({spierJid:m.sender}).toArray();
        if(isNaN(idx)||idx<0||idx>=list.length) return m.reply('❌ Invalid number. Use .spy list first.');
        await db.collection('spy_list').deleteOne({_id:list[idx]._id});
        return m.reply('✅ Stopped tracking +'+list[idx].targetNum);
    }
    m.reply('╭━━━ 👁️ SPY MODE ━━━╮\n\nGet notified when contacts go online/offline.\n\n.spy add 2348XXXXXXXXX — Track a number\n.spy list — View tracked contacts\n.spy remove <n> — Stop tracking\n\n⚠️ Owner only');
},
async onPresenceUpdate(sock,{id,presences}){
    const db=await global.getMongoDb(); if(!db) return;
    for(const[jid,presence] of Object.entries(presences)){
        const prev=presenceStates.get(jid);
        const curr=presence.lastKnownPresence;
        presenceStates.set(jid,curr);
        if(prev===curr) continue;
        const spiers=await db.collection('spy_list').find({targetJid:jid}).toArray();
        for(const s of spiers){
            const num=jid.split('@')[0];
            const status=curr==='available'?'🟢 *ONLINE*':'⚫ *OFFLINE*';
            const time=new Date().toLocaleTimeString('en-GB',{timeZone:process.env.TIME_ZONE||'Africa/Lagos'});
            await sock.sendMessage(s.spierJid,{text:'👁️ *SPY ALERT*\n\n+'+num+' is now '+status+'\n🕐 Time: '+time}).catch(()=>{});
        }
    }
},
async onStart(sock){
    const db=await global.getMongoDb(); if(!db) return;
    const all=await db.collection('spy_list').find({}).toArray();
    for(const s of all) await sock.presenceSubscribe(s.targetJid).catch(()=>{});
}};