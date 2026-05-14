const RIDDLES=[
    {q:"I have cities, but no houses live there. I have mountains, but no trees grow there. I have water, but no fish swim there. What am I?",a:"A map"},
    {q:"The more you take, the more you leave behind. What am I?",a:"Footsteps"},
    {q:"I speak without a mouth and hear without ears. I have no body, but I come alive with the wind. What am I?",a:"An echo"},
    {q:"What has hands but can't clap?",a:"A clock"},
    {q:"I'm light as a feather, yet the strongest man can't hold me for five minutes. What am I?",a:"Breath"},
    {q:"What gets wetter as it dries?",a:"A towel"},
    {q:"I have a head and a tail but no body. What am I?",a:"A coin"},
    {q:"What comes once in a minute, twice in a moment, but never in a thousand years?",a:"The letter M"},
    {q:"The more you have of it, the less you see. What is it?",a:"Darkness"},
    {q:"What can you catch but not throw?",a:"A cold"},
    {q:"I go up but never come down. What am I?",a:"Your age"},
    {q:"What has teeth but cannot bite?",a:"A comb"},
    {q:"What begins with T, ends with T, and has T in it?",a:"A teapot"},
    {q:"I have no legs but I travel far. I have no mouth but I spread news. What am I?",a:"A letter"},
    {q:"What has a bottom at the top?",a:"Your legs"},
    {q:"The person who makes it, sells it. The person who buys it, doesn't use it. The person who uses it, doesn't know they're using it. What is it?",a:"A coffin"},
    {q:"What invention lets you look right through a wall?",a:"A window"},
    {q:"What goes up when rain comes down?",a:"An umbrella"},
    {q:"I have many keys but open no locks. What am I?",a:"A piano"},
    {q:"What is always in front of you but can't be seen?",a:"The future"}
];
const pendingRiddles=new Map();
module.exports={name:'riddle',aliases:['puzzle','brainteaser'],description:'Get a riddle to solve — reply with .answer to reveal the solution',
async execute(sock,m,args){
    if((args[0]||'').toLowerCase()==='answer'||args[0]==='reveal'){
        const r=pendingRiddles.get(m.from);
        if(!r) return m.reply('❌ No active riddle. Use .riddle to get one first!');
        pendingRiddles.delete(m.from);
        return m.reply('💡 *Answer:* '+r.a+'\n\nWell done! Use .riddle for another one 😄');
    }
    const r=RIDDLES[Math.floor(Math.random()*RIDDLES.length)];
    pendingRiddles.set(m.from,r);
    await m.reply('🧩 *Riddle Time!*\n\n'+r.q+'\n\nReply *.answer* to reveal the solution, or think about it! 🤔');
}};