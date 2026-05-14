const fetch = require('node-fetch');
module.exports={name:'lyrics',aliases:['song','lyric'],description:'Get song lyrics — free, no setup needed',
async execute(sock,m,args){
    if(!args.length) return m.reply('❌ Usage: .lyrics <artist> - <song title>\nExample: .lyrics Wizkid - Essence\n.lyrics Burna Boy - Last Last');
    const full=args.join(' ');
    const [artist,title]=full.includes('-')?full.split('-').map(s=>s.trim()):[null,full];
    if(!artist||!title) return m.reply('❌ Format: .lyrics <artist> - <song title>\nExample: .lyrics Davido - Fall');
    await m.react('⏳');
    try{
        const r=await fetch('https://api.lyrics.ovh/v1/'+encodeURIComponent(artist)+'/'+encodeURIComponent(title));
        const d=await r.json();
        if(d.error||!d.lyrics) return m.reply('❌ Lyrics not found for: '+artist+' - '+title);
        const text=d.lyrics.trim().slice(0,3500);
        await m.reply('🎵 *'+artist+' - '+title+'*\n\n'+text+(d.lyrics.length>3500?'\n\n...(truncated)':''));
        await m.react('✅');
    }catch(e){await m.react('❌');await m.reply('❌ Could not fetch lyrics. Try checking the artist and song name.');}
}};