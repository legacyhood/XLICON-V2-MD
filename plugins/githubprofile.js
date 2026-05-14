const fetch=require('node-fetch');
module.exports={name:'github',aliases:['ghprofile','gituser','gh'],description:'Look up any GitHub user profile and repo stats — free, no API key needed',
async execute(sock,m,args){
    const user=args[0]; if(!user) return m.reply('❌ Usage: .github <username>\nExample: .github torvalds');
    await m.react('⏳');
    try{
        const [u,r]=await Promise.all([fetch('https://api.github.com/users/'+user,{headers:{'User-Agent':'XLICON-Bot'}}).then(r=>r.json()),fetch('https://api.github.com/users/'+user+'/repos?sort=stars&per_page=5',{headers:{'User-Agent':'XLICON-Bot'}}).then(r=>r.json())]);
        if(u.message==='Not Found') return m.reply('❌ GitHub user not found: '+user);
        const top=Array.isArray(r)?r.slice(0,3).map(x=>'  - '+x.name+' (⭐'+x.stargazers_count+')').join('\n'):'N/A';
        await m.reply('╭━━━ 🐙 GITHUB: @'+u.login+' ━━━╮\n\n👤 Name: '+(u.name||'N/A')+'\n📝 Bio: '+(u.bio||'N/A')+'\n🏢 Company: '+(u.company||'N/A')+'\n📍 Location: '+(u.location||'N/A')+'\n\n📦 Public Repos: '+u.public_repos+'\n👥 Followers: '+u.followers+'\n➡️ Following: '+u.following+'\n\n⭐ Top Repos:\n'+top+'\n\n🔗 '+u.html_url);
        await m.react('✅');
    }catch(e){await m.react('❌');await m.reply('❌ Could not fetch GitHub profile. Try again.');}
}};