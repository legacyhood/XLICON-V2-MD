const fetch = require('node-fetch');
module.exports={name:'summarize',aliases:['tldr','summary','sum'],description:'Summarize a long message into key bullet points using AI',
async execute(sock,m,args){
    const text=m.quoted?.body||args.join(' ').trim();
    if(!text) return m.reply('❌ Reply to a long message or type text after the command.\nExample: .summarize (reply to a long message)');
    if(text.length<100) return m.reply('❌ Text is too short to summarize. Needs at least 100 characters.');
    const key=process.env.GROQ_API_KEY;
    if(!key) return m.reply('❌ AI not configured. Add GROQ_API_KEY to Railway env vars (free at console.groq.com)');
    await m.react('⏳');
    try{
        const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:'llama-3.1-8b-instant',messages:[{role:'user',content:'Summarize the following text into 3-6 clear bullet points. Use plain text dashes (-), no markdown symbols:\n\n'+text}],max_tokens:400,temperature:0.3})});
        const d=await r.json(); const reply=d.choices?.[0]?.message?.content;
        if(!reply) throw new Error('No response');
        await m.reply('📝 *Summary:*\n\n'+reply);
        await m.react('✅');
    }catch(e){await m.react('❌');await m.reply('❌ Error: '+e.message);}
}};