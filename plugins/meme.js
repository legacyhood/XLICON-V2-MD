const fetch = require('node-fetch');
const SUBS=['memes','dankmemes','me_irl','funny','AdviceAnimals','BlackPeopleTwitter','WhitePeopleTwitter','facepalm','Unexpected'];
module.exports={name:'meme',aliases:['memes','funnyimage','dank'],description:'Get a random meme from Reddit — free, no setup needed',
async execute(sock,m,args){
    const sub=args[0]||SUBS[Math.floor(Math.random()*SUBS.length)];
    await m.react('⏳');
    try{
        const r=await fetch('https://www.reddit.com/r/'+sub+'/random.json?limit=1',{headers:{'User-Agent':'XLICON-Bot/1.0'}});
        const d=await r.json();
        const post=Array.isArray(d)?d[0]?.data?.children?.[0]?.data:d?.data?.children?.[0]?.data;
        if(!post) throw new Error('No posts found');
        const url=post.url_overridden_by_dest||post.url;
        if(!url||!/.(jpg|jpeg|png|gif|webp)/i.test(url)) throw new Error('No image in this post');
        const img=await fetch(url).then(r=>r.buffer());
        await sock.sendMessage(m.from,{image:img,caption:'😂 *'+post.title+'*\n\nr/'+sub+' | 👍 '+post.score.toLocaleString()+' upvotes'},{quoted:m});
        await m.react('😂');
    }catch(e){await m.react('❌');await m.reply('❌ Could not load meme. Try again or use: .meme funny\nSubs: '+SUBS.slice(0,5).join(', '));}
}};