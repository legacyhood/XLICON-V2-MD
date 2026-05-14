const fetch = require('node-fetch');
const LANG_MAP = {english:'en',french:'fr',spanish:'es',portuguese:'pt',arabic:'ar',yoruba:'yo',igbo:'ig',hausa:'ha',chinese:'zh',japanese:'ja',korean:'ko',russian:'ru',german:'de',italian:'it',turkish:'tr',hindi:'hi',swahili:'sw',zulu:'zu',dutch:'nl',polish:'pl',afrikaans:'af',amharic:'am',greek:'el',hebrew:'he',persian:'fa',thai:'th',vietnamese:'vi',indonesian:'id',malay:'ms'};
async function groqTranslate(text,lang,key){
    const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:'llama-3.1-8b-instant',messages:[{role:'user',content:'Translate the following to '+lang+'. Reply with ONLY the translated text, no explanation:\n\n'+text}],max_tokens:500,temperature:0.2})});
    const d=await r.json(); return d.choices?.[0]?.message?.content?.trim()||null;
}
async function freeTranslate(text,lang){
    const code=LANG_MAP[lang.toLowerCase()]||lang;
    const r=await fetch('https://api.mymemory.translated.net/get?q='+encodeURIComponent(text)+'&langpair=en|'+code);
    const d=await r.json();
    if(d.responseStatus!==200) throw new Error(d.responseDetails||'Failed');
    return d.responseData.translatedText;
}
module.exports={name:'translate',aliases:['tr','trans','lang'],description:'Translate text to any language — free, no setup needed',
async execute(sock,m,args){
    if(!args.length) return m.reply('╭━━━ 🌍 TRANSLATE ━━━╮\n\nUsage:\n.translate <language> <text>\n.translate <language>  (reply to a message)\n\nExamples:\n.translate arabic Hello how are you?\n.translate yoruba Good morning everyone\n.translate french I love Nigeria\n.translate spanish What is your name?\n\nLanguages: english french arabic yoruba igbo hausa spanish portuguese chinese japanese korean russian german italian turkish hindi swahili dutch zulu polish greek hebrew persian');
    const lang=args[0]; const text=args.slice(1).join(' ').trim()||m.quoted?.body;
    if(!text) return m.reply('❌ Provide text or reply to a message.');
    await m.react('⏳');
    try{
        const result=process.env.GROQ_API_KEY?await groqTranslate(text,lang,process.env.GROQ_API_KEY):await freeTranslate(text,lang);
        await m.reply('🌍 *Translated → '+lang+':*\n\n'+result);
        await m.react('✅');
    }catch(e){await m.react('❌');await m.reply('❌ Translation failed: '+e.message);}
}};