const fetch=require('node-fetch');
const activeQuizzes=new Map();
function decode(str){return str.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/&ldquo;/g,'"').replace(/&rdquo;/g,'"');}
const CATEGORIES={general:9,books:10,film:11,music:12,science:17,computers:18,math:19,sports:21,geography:22,history:23,animals:27,vehicles:28,celebrities:26};
module.exports={name:'quiz',aliases:['trivia','qa'],description:'Random trivia quiz with multiple choice — free, no setup needed',
async execute(sock,m,args){
    const cat=args[0]?.toLowerCase();
    const catId=CATEGORIES[cat]||'';
    await m.react('⏳');
    try{
        const r=await fetch('https://opentdb.com/api.php?amount=1&type=multiple'+(catId?'&category='+catId:''));
        const d=await r.json();
        if(!d.results?.length) throw new Error('No questions');
        const q=d.results[0];
        const correct=decode(q.correct_answer);
        const opts=[correct,...q.incorrect_answers.map(a=>decode(a))].sort(()=>Math.random()-0.5);
        const labels=['A','B','C','D'];
        const correctLabel=labels[opts.indexOf(correct)];
        activeQuizzes.set(m.from,{correct,correctLabel,expires:Date.now()+30000});
        const optText=opts.map((o,i)=>labels[i]+'. '+o).join('\n');
        await m.reply('🧠 *TRIVIA QUIZ*\n📚 Category: '+decode(q.category)+'\n⚡ Difficulty: '+q.difficulty+'\n\n'+decode(q.question)+'\n\n'+optText+'\n\nReply *.A*, *.B*, *.C*, or *.D*  |  30 seconds!');
        await m.react('🧠');
        setTimeout(()=>{
            const qz=activeQuizzes.get(m.from);
            if(qz&&qz.correct===correct){activeQuizzes.delete(m.from);sock.sendMessage(m.from,{text:'⏰ Time up! The answer was *'+correctLabel+'. '+correct+'*'});}
        },30000);
    }catch(e){await m.react('❌');await m.reply('❌ Could not load quiz. Try again!\nCategories: '+Object.keys(CATEGORIES).join(', '));}
},
async onMessage(sock,m){
    const q=activeQuizzes.get(m.from); if(!q||!m.body) return;
    if(Date.now()>q.expires){activeQuizzes.delete(m.from);return;}
    const p=global.BOT_PREFIX||'.';
    const ans=m.body.trim().toUpperCase();
    const val=ans.replace(p,'').trim();
    if(!['A','B','C','D'].includes(val)) return;
    activeQuizzes.delete(m.from);
    if(val===q.correctLabel) await sock.sendMessage(m.from,{text:'✅ *Correct! Well done '+m.pushName+'!*\n\nAnswer: *'+q.correctLabel+'. '+q.correct+'*'},{quoted:m});
    else await sock.sendMessage(m.from,{text:'❌ Wrong! The correct answer was *'+q.correctLabel+'. '+q.correct+'*\n\nBetter luck next time! Try .quiz again'},{quoted:m});
}};