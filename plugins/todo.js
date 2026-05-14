let _db=null;
async function getDb(){if(_db)return _db;if(!process.env.MONGO_URI)return null;try{const{MongoClient}=require('mongodb');const c=new MongoClient(process.env.MONGO_URI,{serverSelectionTimeoutMS:5000});await c.connect();_db=c.db('xlicon_bot');return _db;}catch(e){return null;}}
module.exports={name:'todo',aliases:['task','tasks','checklist'],description:'Personal to-do list — add tasks, check them off, and track what is done',
async execute(sock,m,args){
    const db=await getDb(); if(!db) return m.reply('❌ MongoDB not connected.');
    const userJid=(m.sender||'').replace(/:\d+@/,'@');
    const sub=(args[0]||'').toLowerCase();
    if(sub==='add'||(!sub&&args.length)){
        const text=(sub==='add'?args.slice(1):args).join(' ').trim();
        if(!text) return m.reply('❌ Usage: .todo add <task>\nExample: .todo add Buy groceries');
        await db.collection('todos').insertOne({userJid,text,done:false,createdAt:new Date()});
        return m.reply('✅ Task added: '+text);
    }
    if(sub==='list'||sub==='show'||!args.length){
        const todos=await db.collection('todos').find({userJid}).sort({createdAt:1}).toArray();
        if(!todos.length) return m.reply('📋 Your to-do list is empty!\nAdd a task: .todo add Buy groceries');
        const pending=todos.filter(t=>!t.done); const done=todos.filter(t=>t.done);
        let txt='╭━━━ ✅ YOUR TO-DO LIST ━━━╮\n\n';
        if(pending.length) txt+='*Pending:*\n'+pending.map((t,i)=>(i+1)+'. ☐ '+t.text).join('\n')+'\n\n';
        if(done.length) txt+='*Done:*\n'+done.map(t=>'✅ ~~'+t.text+'~~').join('\n')+'\n\n';
        txt+='Use .todo done <n> to mark done | .todo remove <n> to delete';
        return m.reply(txt);
    }
    if(sub==='done'||sub==='check'){
        const n=parseInt(args[1])-1;
        const pending=await db.collection('todos').find({userJid,done:false}).sort({createdAt:1}).toArray();
        if(isNaN(n)||n<0||n>=pending.length) return m.reply('❌ Invalid task number. Use .todo list first.');
        await db.collection('todos').updateOne({_id:pending[n]._id},{$set:{done:true,doneAt:new Date()}});
        return m.reply('✅ Marked as done: '+pending[n].text+'\n\nGreat job! 🎉');
    }
    if(sub==='remove'||sub==='delete'){
        const n=parseInt(args[1])-1;
        const todos=await db.collection('todos').find({userJid}).sort({createdAt:1}).toArray();
        if(isNaN(n)||n<0||n>=todos.length) return m.reply('❌ Invalid task number. Use .todo list first.');
        await db.collection('todos').deleteOne({_id:todos[n]._id});
        return m.reply('🗑️ Removed: '+todos[n].text);
    }
    if(sub==='clear'){
        await db.collection('todos').deleteMany({userJid});
        return m.reply('✅ All tasks cleared!');
    }
    m.reply('╭━━━ ✅ TO-DO LIST ━━━╮\n\n.todo add <task> — Add a task\n.todo list — View all tasks\n.todo done <n> — Mark as done\n.todo remove <n> — Delete a task\n.todo clear — Clear all tasks\n\nExample: .todo add Call mum tonight');
}};