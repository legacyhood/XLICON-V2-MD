const quotes = [
    {q:"The only way to do great work is to love what you do.",a:"Steve Jobs"},
    {q:"In the middle of every difficulty lies opportunity.",a:"Albert Einstein"},
    {q:"It does not matter how slowly you go as long as you do not stop.",a:"Confucius"},
    {q:"Life is what happens when you're busy making other plans.",a:"John Lennon"},
    {q:"The future belongs to those who believe in the beauty of their dreams.",a:"Eleanor Roosevelt"},
    {q:"You miss 100% of the shots you don't take.",a:"Wayne Gretzky"},
    {q:"Whether you think you can or you think you can't, you're right.",a:"Henry Ford"},
    {q:"I have not failed. I've just found 10,000 ways that won't work.",a:"Thomas Edison"},
    {q:"The best time to plant a tree was 20 years ago. The second best time is now.",a:"Chinese Proverb"},
    {q:"It always seems impossible until it's done.",a:"Nelson Mandela"},
    {q:"Success is not final, failure is not fatal: it is the courage to continue that counts.",a:"Winston Churchill"},
    {q:"Believe you can and you're halfway there.",a:"Theodore Roosevelt"},
    {q:"Your time is limited, don't waste it living someone else's life.",a:"Steve Jobs"},
    {q:"Hard work beats talent when talent doesn't work hard.",a:"Tim Notke"},
    {q:"The secret of getting ahead is getting started.",a:"Mark Twain"},
    {q:"Act as if what you do makes a difference. It does.",a:"William James"},
    {q:"What you get by achieving your goals is not as important as what you become.",a:"Zig Ziglar"},
    {q:"Keep your face always toward the sunshine, and shadows will fall behind you.",a:"Walt Whitman"},
    {q:"You are never too old to set another goal or to dream a new dream.",a:"C.S. Lewis"},
    {q:"Don't watch the clock; do what it does. Keep going.",a:"Sam Levenson"},
];
module.exports = {
    name: 'quote',
    aliases: ['quotes', 'inspire', 'motivation', 'qod'],
    description: 'Get a random inspirational quote',
    async execute(sock, m) {
        const q = quotes[Math.floor(Math.random()*quotes.length)];
        await m.reply(`╭━━━━━━━━━━━━━━━━━━━╮\n┃  💡 *DAILY QUOTE*   ┃\n╰━━━━━━━━━━━━━━━━━━━╯\n\n_"${q.q}"_\n\n— *${q.a}*`);
    }
};
