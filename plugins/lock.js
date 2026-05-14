const getDb = () => global.getMongoDb();
const cache=new Map();
async function getLocks(jid){if(cache.has(jid))return cache.get(jid);const db=await getDb();const v=db?(await db.collection('group_settings').findOne({_id:jid}))?.locks||[]:[];cache.set(jid,v);return v;}
async function setLocks(jid,locks){cache.set(jid,locks);const db=await getDb();if(db)await db.collection('group_settings').updateOne({_id:jid},{$set:{locks}},{upsert:true});}
const TYPES={media:['imageMessage','videoMessage','stickerMessage','documentMessage','audioMessage'],text:['conversation','extendedTextMessage'],image:['imageMessage'],video:['videoMessage'],audio:['audioMessage'],sticker:['stickerMessage'],doc:['documentMessage'],link:['extendedTextMessage']};
module.exports={name:'lock',aliases:['lockchat','restrict'],description:'Lock certain message types in a group — admin only',
async execute(sock,m,args){
    if(!m.isGroup) return m.reply('❌ Groups only.');
    if(!m.isAdmin) return m.reply('❌ Admin only.');
    const sub=(args[0]||'').toLowerCase();
    if(sub==='list'){
        const locks=await getLocks(m.from);
        return m.reply('🔒 *Locked types:* '+(locks.length?locks.join(', '):'none')+'\n\nTypes: media, text, image, video, audio, sticker, doc, link');
    }
    if(sub==='all'){await setLocks(m.from,['media','text']);return m.reply('🔒 All messages locked for non-admins.');}
    if(sub==='none'||sub==='clear'){await setLocks(m.from,[]);return m.reply('🔓 All message types unlocked.');}
    const type=args[0]?.toLowerCase(); if(!TYPES[type]) return m.reply('❌ Unknown type. Options: media, text, image, video, audio, sticker, doc, link, all, none, list');
    const action=(args[1]||'on').toLowerCase();
    const locks=await getLocks(m.from);
    if(action==='off'){await setLocks(m.from,locks.filter(l=>l!==type));return m.reply('🔓 '+type+' unlocked for non-admins.');}
    if(!locks.includes(type)){locks.push(type);await setLocks(m.from,locks);}
    m.reply('🔒 '+type+' locked — non-admins cannot send '+type+' messages.');
},
async onMessage(sock,m){
    if(!m.isGroup||m.isAdmin||!m.from||m.key?.fromMe) return;
    const locks=await getLocks(m.from); if(!locks.length) return;
    const msgType=Object.keys(m.raw?.message||{})[0];
    const isLink=m.body&&/(https?:\/\/|www\.)/i.test(m.body);
    const blocked=locks.some(lock=>{
        if(lock==='link') return isLink;
        return(TYPES[lock]||[]).includes(msgType);
    });
    if(!blocked) return;
    await sock.sendMessage(m.from,{delete:m.key});
    await sock.sendMessage(m.from,{text:'🔒 @'+m.sender?.split('@')[0]+' That message type is locked in this group.',mentions:[m.sender]});
}};