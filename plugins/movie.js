const fetch=require('node-fetch');
module.exports={name:'movie',aliases:['film','imdb','series','show'],description:'Search for any movie or TV show info. Set OMDB_API_KEY in Railway (free at omdbapi.com)',
async execute(sock,m,args){
    if(!args.length) return m.reply('❌ Usage: .movie <title>\nExample: .movie Black Panther\n.movie Money Heist\n.movie The Lion King\n\nGet free OMDB key: omdbapi.com');
    const key=process.env.OMDB_API_KEY;
    if(!key) return m.reply('❌ Movie search needs a free API key.\n\n1. Go to omdbapi.com\n2. Sign up (free)\n3. Add OMDB_API_KEY to Railway env vars\n4. Redeploy');
    const title=args.join(' ');
    await m.react('⏳');
    try{
        const r=await fetch('https://www.omdbapi.com/?apikey='+key+'&t='+encodeURIComponent(title)+'&plot=short');
        const d=await r.json();
        if(d.Response==='False') return m.reply('❌ Not found: '+title+'\n\nTry a different spelling or the full title.');
        const rating=d.Ratings?.[0]?.Value||'N/A';
        await m.reply('╭━━━ 🎬 '+d.Title+' ━━━╮\n\n🗓️ Year: '+d.Year+'\n🎭 Type: '+d.Type+'\n⭐ IMDb: '+d.imdbRating+'/10\n🏆 Rating: '+rating+'\n⏱️ Runtime: '+d.Runtime+'\n🎬 Genre: '+d.Genre+'\n🎭 Director: '+d.Director+'\n👥 Cast: '+d.Actors+'\n🌍 Country: '+d.Country+'\n🗣️ Language: '+d.Language+'\n\n📝 Plot:\n'+d.Plot+'\n\n📦 Box Office: '+(d.BoxOffice||'N/A'));
        await m.react('✅');
    }catch(e){await m.react('❌');await m.reply('❌ Could not fetch movie info. Try again.');}
}};