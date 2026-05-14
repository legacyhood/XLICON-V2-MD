const fetch=require('node-fetch');
const roasts=["You're the reason they put instructions on shampoo bottles. 🧴","I'd agree with you but then we'd both be wrong. 😅","You're like a cloud. When you disappear, it's a beautiful day. ☀️","I'd explain it to you, but I left my crayons at home. 🖍️","You're proof that even evolution makes mistakes. 🦕","Your secrets are always safe with me — I never even listen when you tell me them. 🙉","I'd insult you, but my parents told me not to trash things that are already garbage. 🗑️","You're like a participation trophy — technically an achievement, but nobody's proud. 🏅","You're not stupid; you just have bad luck thinking. 🧠","If brains were petrol, you wouldn't have enough to power an ant's motorbike. 🐜","You're the human equivalent of a participation ribbon. 🎗️","I'd call you a tool but you'd have to be useful first. 🔨","You're so far behind, you think you're first. 🐢","Somewhere out there, a tree is producing oxygen for you. You owe it an apology. 🌳","I've seen better heads on a glass of beer. 🍺","You're not the dumbest person on earth, but you'd better hope they don't die. 💀","Light travels faster than sound. That's why you seemed bright until you spoke. 💡","You have the face of a saint — a Saint Bernard. 🐕","I'd roast you more, but I only have so much time and the Lord says to love my enemies. ✝️","Even your Wi-Fi signal has more connection than you. 📶"];
module.exports={name:'roast',aliases:['dis','clown','burn'],description:'Send a fun roast to someone. .roast @user for a quick one, .airoast @user for an AI-powered custom roast',
async execute(sock,m,args){
    const target=m.mentionedJid?.[0]||m.quoted?.sender;
    const name=args.filter(a=>!a.startsWith('@')).join(' ')||(target?('@'+target.split('@')[0]):'them');
    if((m.command||m.body?.split(' ')[0]?.replace(global.BOT_PREFIX||'.',''))?.toLowerCase()==='airoast'){
        const key=process.env.GROQ_API_KEY;
        if(!key) return m.reply('❌ AI roast needs GROQ_API_KEY set in Railway.');
        await m.react('🔥');
        try{
            const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:'llama-3.1-8b-instant',messages:[{role:'user',content:'Write a VERY funny and creative roast for someone named '+name+'. Make it clever, original, and savage but still playful — not genuinely hurtful. 2-3 sentences max. Plain text, no quotes.'}],max_tokens:150,temperature:1.0})});
            const d=await r.json(); const text=d.choices?.[0]?.message?.content;
            if(!text) throw new Error('No response');
            return m.reply('🔥 *AI Roast for '+name+':*\n\n'+text);
        }catch(e){return m.reply('❌ AI roast failed, using classic: '+roasts[Math.floor(Math.random()*roasts.length)]);}
    }
    const pick=roasts[Math.floor(Math.random()*roasts.length)];
    await m.reply('🔥 *'+name+':*\n\n'+pick);
}};