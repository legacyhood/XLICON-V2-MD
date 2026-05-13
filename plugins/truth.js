const truths = [
    "What is your biggest fear?","What's the most embarrassing thing you've done?","Have you ever lied to a close friend?",
    "What's your biggest regret?","Have you ever cheated in a game or exam?","What is something you've never told anyone?",
    "What's the most childish thing you still do?","Do you have a crush on anyone right now?",
    "What's the worst lie you've ever told?","Have you ever blamed someone else for something you did?",
    "What's something you'd be embarrassed if your parents knew?","Have you ever sent a message to the wrong person?",
    "What's your most used app you'd be embarrassed to admit?","Do you have any hidden talents?",
    "What's your most irrational fear?","If you could change one thing about yourself, what would it be?",
];
const dares = [
    "Send a voice note singing your favourite song.","Change your WhatsApp bio to 'I lost a dare' for 1 hour.",
    "Call someone in this chat and say 'I love you' then hang up.","Send your most recent selfie.",
    "Type a message with your nose and send it.","Send an embarrassing photo from your gallery.",
    "Post a weird status for 30 minutes.","Write a poem about the person above you and send it.",
    "Send a voice note telling a joke.","Send your search history screenshot.",
    "Do 20 push-ups right now and send a video.","Send a message to your ex saying 'I miss you'.","Make a funny voice and send a voice note.",
    "Change your display name to 'Bot Slave' for 1 hour.","Send the 10th photo in your gallery.",
];

module.exports = {
    name: 'truth',
    aliases: ['dare', 'tod', 'truthordare'],
    description: 'Truth or Dare game',
    async execute(sock, m, args) {
        const cmd = m.body.slice(1).trim().split(/\s+/)[0].toLowerCase();
        if (cmd === 'dare') {
            const d = dares[Math.floor(Math.random()*dares.length)];
            return m.reply(`╭━━━━━━━━━━━━━━━━━━━╮\n┃   😈 *DARE!*         ┃\n╰━━━━━━━━━━━━━━━━━━━╯\n\n🎯 *${d}*\n\n_Do it or get a double dare!_ 😂`);
        }
        const t = truths[Math.floor(Math.random()*truths.length)];
        return m.reply(`╭━━━━━━━━━━━━━━━━━━━╮\n┃   🤔 *TRUTH!*        ┃\n╰━━━━━━━━━━━━━━━━━━━╯\n\n❓ *${t}*\n\n_You must answer honestly!_ 👀`);
    }
};
