const jokes = [
    ["Why don't scientists trust atoms?","Because they make up everything! 😂"],
    ["Why did the scarecrow win an award?","Because he was outstanding in his field! 🌾"],
    ["I told my wife she was drawing her eyebrows too high.","She looked surprised. 😮"],
    ["Why don't eggs tell jokes?","They'd crack each other up! 🥚"],
    ["What do you call a fake noodle?","An impasta! 🍝"],
    ["Why did the bicycle fall over?","It was two-tired! 🚲"],
    ["What do you call cheese that isn't yours?","Nacho cheese! 🧀"],
    ["Why can't you hear a pterodactyl go to the bathroom?","Because the P is silent! 🦕"],
    ["I'm reading a book about anti-gravity.","It's impossible to put down! 📚"],
    ["Why did the math book look so sad?","Because it had too many problems! 📐"],
    ["What do you call a bear with no teeth?","A gummy bear! 🐻"],
    ["Why did the golfer bring extra pants?","In case he got a hole in one! ⛳"],
    ["What do you call a sleeping dinosaur?","A dino-snore! 🦖"],
    ["Why is Peter Pan always flying?","He never wants to grow up, and Neverland is amazing! 🧚"],
    ["I told my doctor I broke my arm in two places.","He told me to stop going to those places! 💪"],
];

module.exports = {
    name: 'joke',
    aliases: ['jokes', 'funny', 'lol'],
    description: 'Get a random joke',
    async execute(sock, m) {
        const [setup, punchline] = jokes[Math.floor(Math.random()*jokes.length)];
        await m.reply(`╭━━━━━━━━━━━━━━━━━━━╮\n┃   😂 *JOKE TIME!*   ┃\n╰━━━━━━━━━━━━━━━━━━━╯\n\n🎤 *${setup}*\n\n💥 ${punchline}`);
    }
};
