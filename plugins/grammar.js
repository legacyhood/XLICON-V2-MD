const fetch = require('node-fetch');
module.exports={name:'grammar',aliases:['fix','spell','correct','proofread'],description:'Fix grammar and spelling of any text using AI',
async execute(sock,m,args){
    const text=m.quoted?.body||args.join(' ').trim();
    if(!text) return m.reply('❌ Reply to a message or type text.\nExample: .grammar I goes to market yesterday');
    const key=process.env.GROQ_API_KEY;
    if(!key) return m.reply('❌ AI not configured. Add GROQ_API_KEY to Railway (free at console.groq.com)');
    await m.react('⏳');
    try{
        const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:'llama-3.1-8b-instant',messages:[{role:'user',content:'Fix the grammar and spelling of the following text. Reply in this exact format:\nCorrected: <fixed text>\nChanges: <brief list of what was fixed>\n\nOriginal: '+text}],max_tokens:400,temperature:0.1})});
        const d=await r.json(); const reply=d.choices?.[0]?.message?.content;
        if(!reply) throw new Error('No response');
        await m.reply('✏️ *Grammar Check:*\n\n'+reply);
        await m.react('✅');
    }catch(e){await m.react('❌');await m.reply('❌ Error: '+e.message);}
}};