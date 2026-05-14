const fetch=require('node-fetch');
const SIGNS=['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
const EMOJIS={aries:'♈',taurus:'♉',gemini:'♊',cancer:'♋',leo:'♌',virgo:'♍',libra:'♎',scorpio:'♏',sagittarius:'♐',capricorn:'♑',aquarius:'♒',pisces:'♓'};
module.exports={name:'horoscope',aliases:['zodiac','star','starsign'],description:'Daily horoscope for any star sign — free',
async execute(sock,m,args){
    const sign=(args[0]||'').toLowerCase();
    if(!sign||!SIGNS.includes(sign)) return m.reply('╭━━━ ✨ HOROSCOPE ━━━╮\n\nUsage: .horoscope <sign>\n\nSigns:\n♈ Aries  ♉ Taurus  ♊ Gemini\n♋ Cancer  ♌ Leo  ♍ Virgo\n♎ Libra  ♏ Scorpio  ♐ Sagittarius\n♑ Capricorn  ♒ Aquarius  ♓ Pisces\n\nExample: .horoscope scorpio');
    await m.react('⏳');
    try{
        let reading;
        if(process.env.GROQ_API_KEY){
            const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Authorization':'Bearer '+process.env.GROQ_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:'llama-3.1-8b-instant',messages:[{role:'user',content:'Write a detailed daily horoscope for '+sign+' for today. Include: overall energy, love, career, health, and a lucky tip. Keep it positive, motivating, 5-6 sentences total. Plain text, no markdown.'}],max_tokens:300,temperature:0.85})});
            const d=await r.json(); reading=d.choices?.[0]?.message?.content;
        }
        if(!reading){
            const r=await fetch('https://horoscope-app-api.vercel.app/api/v1/get-horoscope/daily?sign='+sign+'&day=today');
            const d=await r.json(); reading=d.data?.horoscope_data||'Stars are aligned for you today. Trust your instincts and move forward with confidence.';
        }
        const today=new Date().toLocaleDateString('en-GB');
        await m.reply((EMOJIS[sign]||'✨')+' *'+sign.charAt(0).toUpperCase()+sign.slice(1)+' Horoscope*\n📅 '+today+'\n\n'+reading+'\n\n_The stars guide, you decide_ 🌟');
        await m.react('✅');
    }catch(e){await m.react('❌');await m.reply('❌ Could not load horoscope. Try again soon!');}
}};