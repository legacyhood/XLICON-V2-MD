const fetch=require('node-fetch');
const STYLES={anime:'anime style, vibrant colors',realistic:'photorealistic, hyper-detailed, 8k',cartoon:'cartoon style, colorful, fun',painting:'oil painting style, artistic, detailed brushwork',sketch:'pencil sketch, black and white, detailed drawing',watercolor:'watercolor painting, soft colors, artistic',cinematic:'cinematic, dramatic lighting, movie scene',pixel:'pixel art, retro game style, 8-bit',fantasy:'fantasy art, magical, epic, detailed',dark:'dark aesthetic, moody, dramatic shadows'};
module.exports={name:'imagine',aliases:['img','generate','draw','image','paint'],description:'Generate an AI image from text — free, no API key needed. Supports styles: anime, realistic, cartoon, painting, sketch, watercolor, cinematic, pixel, fantasy, dark',
async execute(sock,m,args){
    if(!args.length) return m.reply('╭━━━ 🎨 AI IMAGE GEN ━━━╮\n\nGenerate any image for free!\n\nUsage: .imagine <description>\n\nStyle prefixes (optional):\n.imagine anime: cute girl with flowers\n.imagine realistic: lion in savanna\n.imagine cartoon: robot dancing\n.imagine painting: Lagos sunset\n.imagine sketch: portrait of a king\n.imagine cinematic: action hero running\n.imagine pixel: retro game character\n.imagine fantasy: magical forest\n.imagine dark: mysterious figure\n.imagine watercolor: birds in flight\n\nPowered by Pollinations AI — 100% free');
    let prompt=args.join(' ').trim();
    let styleHint='';
    const styleKey=Object.keys(STYLES).find(s=>prompt.toLowerCase().startsWith(s+':'));
    if(styleKey){styleHint=STYLES[styleKey];prompt=prompt.slice(styleKey.length+1).trim();}
    const fullPrompt=styleHint?prompt+', '+styleHint:prompt;
    await m.react('⏳');
    await m.reply(`🎨 Generating${styleKey?' ('+styleKey+' style)':''}: _"${prompt}"_\nPlease wait...`);
    try{
        const seed=Math.floor(Math.random()*999999);
        const url='https://image.pollinations.ai/prompt/'+encodeURIComponent(fullPrompt)+'?width=1024&height=1024&seed='+seed+'&nologo=true';
        const res=await fetch(url,{timeout:60000});
        if(!res.ok) throw new Error('HTTP '+res.status);
        const buf=Buffer.from(await res.arrayBuffer());
        await sock.sendMessage(m.from,{image:buf,caption:'🎨 *XLICON AI Image*\n\n📝 '+prompt+(styleKey?'\n🎭 Style: '+styleKey:'')+'\n\n_Powered by Pollinations AI_'},{quoted:m});
        await m.react('✅');
    }catch(e){await m.react('❌');await m.reply('❌ Image generation failed: '+e.message+'\n\nTry again or use a simpler description.');}
}};