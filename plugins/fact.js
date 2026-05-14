const fetch = require('node-fetch');
const APIS=[
    {url:'https://uselessfacts.jsph.pl/api/v2/facts/random?language=en',parse:d=>d.text},
    {url:'https://catfact.ninja/fact',parse:d=>'Cat fact: '+d.fact},
    {url:'https://api.chucknorris.io/jokes/random',parse:d=>'Chuck Norris: '+d.value},
    {url:'https://official-joke-api.appspot.com/random_joke',parse:d=>d.setup+'\n\n'+d.punchline}
];
const CATEGORIES=['science','history','space','animals','food','tech','nature'];
module.exports={name:'fact',aliases:['facts','trivia','funfact','random'],description:'Get a random interesting fact — free, no setup needed',
async execute(sock,m,args){
    const cat=args[0]?.toLowerCase();
    await m.react('⏳');
    try{
        if(cat&&process.env.GROQ_API_KEY){
            const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Authorization':'Bearer '+process.env.GROQ_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:'llama-3.1-8b-instant',messages:[{role:'user',content:'Give me one genuinely surprising and interesting fact about '+cat+'. Keep it to 2-3 sentences. Plain text only.'}],max_tokens:200,temperature:0.9})});
            const d=await r.json(); const text=d.choices?.[0]?.message?.content;
            if(text){await m.reply('💡 *'+cat.charAt(0).toUpperCase()+cat.slice(1)+' Fact:*\n\n'+text);return await m.react('✅');}
        }
        const api=APIS[Math.floor(Math.random()*APIS.length)];
        const r=await fetch(api.url); const d=await r.json();
        const text=api.parse(d);
        await m.reply('💡 *Random Fact:*\n\n'+text+'\n\nCategories: '+CATEGORIES.join(', '));
        await m.react('✅');
    }catch(e){await m.react('❌');await m.reply('❌ Could not fetch a fact right now. Try again!');}
}};