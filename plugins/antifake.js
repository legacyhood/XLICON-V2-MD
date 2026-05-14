let _db=null;
async function getDb(){if(_db)return _db;if(!process.env.MONGO_URI)return null;try{const c=new MongoClient(process.env.MONGO_URI,{serverSelectionTimeoutMS:5000});await c.connect();_db=c.db('xlicon_bot');return _db;}catch(e){return null;}}
const cache=new Map();
async function getSettings(jid){if(cache.has(jid))return cache.get(jid);const db=await getDb();const v=db?await db.collection('group_settings').findOne({_id:jid}):null;const s={antifake:v?.antifake||false,action:v?.antifake_action||'kick'};cache.set(jid,s);return s;}
async function setSetting(jid,key,val){const s=await getSettings(jid);s[key]=val;cache.set(jid,s);const db=await getDb();if(db)await db.collection('group_settings').updateOne({_id:jid},{$set:{[key]:val}},{upsert:true});}
module.exports={name:'antifake',aliases:['nobot','fakedetect','af2'],description:'Kick or warn members with no profile picture when they join — admin only',
async execute(sock,m,args){
    if(!m.isGroup) return m.reply('❌ Groups only.');
    if(!m.isAdmin) return m.reply('❌ Admin only.');
    const sub=(args[0]||'').toLowerCase();
    if(sub==='on'){await setSetting(m.from,'antifake',true);return m.reply('✅ Anti-Fake ON\n\nNew members with no profile picture will be automatically kicked.');}
    if(sub==='off'){await setSetting(m.from,'antifake',false);return m.reply('✅ Anti-Fake OFF');}
    if(sub==='warn'){await setSetting(m.from,'antifake_action','warn');return m.reply('✅ Anti-fake set to WARN (not kick).');}
    if(sub==='kick'){await setSetting(m.from,'antifake_action','kick');return m.reply('✅ Anti-fake set to KICK.');}
    const s=await getSettings(m.from);
    m.reply('╭━━━ 🔍 ANTI-FAKE ━━━╮\n\nStatus: '+(s.antifake?'✅ ON':'❌ OFF')+'\nAction: '+s.action.toUpperCase()+'\n\n.antifake on — Enable\n.antifake off — Disable\n.antifake kick — Auto-kick\n.antifake warn — Warn only');
},
async onParticipantsUpdate(sock,event){
    if(event.action!=='add') return;
    const db=await getDb(); if(!db) return;
    const settings=await getSettings(event.id);
    if(!settings.antifake) return;
    for(const jid of event.participants){
        try{
            const pp=await sock.profilePictureUrl(jid,'image').catch(()=>null);
            if(pp) continue;
            if(settings.action==='kick') await sock.groupParticipantsUpdate(event.id,[jid],'remove');
            else await sock.sendMessage(event.id,{text:'⚠️ @'+jid.split('@')[0]+' Please set a profile picture to stay in this group. You may be removed otherwise.',mentions:[jid]});
        }catch(_){}
    }
}};