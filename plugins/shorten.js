const fetch=require('node-fetch');
module.exports={name:'shorten',aliases:['short','tinyurl','bitly','shortenurl'],description:'Shorten any URL — free, no setup needed',
async execute(sock,m,args){
    const url=(args[0]||m.quoted?.body||'').trim();
    if(!url||!url.startsWith('http')) return m.reply('❌ Usage: .shorten <url>\nExample: .shorten https://www.google.com/some/very/long/url');
    await m.react('⏳');
    try{
        const r=await fetch('https://is.gd/create.php?format=json&url='+encodeURIComponent(url));
        const d=await r.json();
        if(d.errorcode) throw new Error(d.errormessage);
        await m.reply('🔗 *URL Shortened!*\n\nOriginal: '+url.slice(0,60)+(url.length>60?'...':'')+'\nShort: *'+d.shorturl+'*');
        await m.react('✅');
    }catch(e){await m.react('❌');await m.reply('❌ Could not shorten URL: '+e.message);}
}};