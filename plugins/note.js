const getDb = () => global.getMongoDb();
module.exports={name:'note',aliases:['notes','save','memo'],description:'Save and retrieve notes — group notes visible to all, private notes sent to your DM',
async execute(sock,m,args){
    const db=await getDb(); if(!db) return m.reply('❌ MongoDB not connected.');
    const sub=(args[0]||'').toLowerCase();
    const scope=sub==='private'?'private_'+m.sender?.replace(/:\d+@/,'@'):m.from;
    const subCmd=sub==='private'?args[1]?.toLowerCase():sub;
    const restStart=sub==='private'?2:1;
    if(subCmd==='add'||subCmd==='set'){
        const title=args[restStart]; const content=args.slice(restStart+1).join(' ')||m.quoted?.body;
        if(!title||!content) return m.reply('❌ Usage: .note add <title> <content>\n.note private add <title> <content>');
        await db.collection('notes').updateOne({scope,title},{$set:{scope,title,content,updatedAt:new Date()}},{upsert:true});
        const dest=sub==='private'?m.sender?.split('@')[0]+'@s.whatsapp.net':m.from;
        if(sub==='private'&&dest!==m.from) await sock.sendMessage(dest,{text:'📝 Note *'+title+'* saved privately.'});
        return m.reply('✅ Note *'+title+'* saved'+(sub==='private'?' (private)':'')+'!');
    }
    if(subCmd==='get'||subCmd==='view'){
        const title=args[restStart]; if(!title) return m.reply('❌ Usage: .note get <title>');
        const note=await db.collection('notes').findOne({scope,title});
        if(!note) return m.reply('❌ Note "'+title+'" not found. Use .note list to see all notes.');
        return m.reply('📝 *'+note.title+'*\n\n'+note.content);
    }
    if(subCmd==='list'){
        const notes=await db.collection('notes').find({scope}).toArray();
        if(!notes.length) return m.reply('📋 No notes saved yet.\nUse .note add <title> <content> to save one.');
        return m.reply('📋 *Saved Notes:*\n\n'+notes.map((n,i)=>(i+1)+'. '+n.title).join('\n')+'\n\nUse .note get <title> to read one.');
    }
    if(subCmd==='delete'||subCmd==='remove'){
        const title=args[restStart]; if(!title) return m.reply('❌ Usage: .note delete <title>');
        const r=await db.collection('notes').deleteOne({scope,title});
        return m.reply(r.deletedCount?'✅ Note "'+title+'" deleted.':'❌ Note not found.');
    }
    if(subCmd==='clear'){
        if(!m.isAdmin&&!(global.owners||[]).some(o=>o.split('@')[0]===(m.sender||'').split('@')[0])) return m.reply('❌ Only admins can clear all notes.');
        await db.collection('notes').deleteMany({scope});
        return m.reply('✅ All notes cleared.');
    }
    m.reply('╭━━━ 📝 NOTES ━━━╮\n\n.note add <title> <text> — Save a group note\n.note get <title> — Read a note\n.note list — See all notes\n.note delete <title> — Delete a note\n.note clear — Delete all (admin)\n\n.note private add <title> <text> — Private note (DM only)\n.note private list — Your private notes');
}};