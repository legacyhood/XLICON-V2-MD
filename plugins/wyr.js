const questions = [
    ["Never use social media again","Never watch movies/TV again"],["Be always cold","Be always hot"],
    ["Have super strength","Have super speed"],["Only eat sweet food forever","Only eat savoury food forever"],
    ["Know how you die","Know when you die"],["Be invisible","Be able to fly"],
    ["Speak all languages","Play all instruments"],["Have a rewind button for your life","A pause button"],
    ["Always be 10 minutes late","Always be 20 minutes early"],["Lose all your money","Lose all your memories"],
    ["Be able to see 10 minutes into the future","Be able to see 10 years into the future"],
    ["Fight 100 duck-sized horses","1 horse-sized duck"],["Never sleep again","Never eat again"],
    ["Be the funniest person in the room","Be the smartest person in the room"],
    ["Have $1 million now","$5,000 per month forever"],
    ["Always have to whisper","Always have to shout"],["Be extremely rich but ugly","Beautiful but broke"],
    ["Live in the city","Live in the countryside"],["Be famous but broke","Unknown but extremely rich"],
];
module.exports = {
    name: 'wyr',
    aliases: ['wouldyourather', 'either', 'would'],
    description: 'Would you rather game',
    async execute(sock, m) {
        const [a, b] = questions[Math.floor(Math.random()*questions.length)];
        await m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃ 🤔 *WOULD YOU RATHER* ┃
╰━━━━━━━━━━━━━━━━━━━╯

🅰️ *${a}*

  ──────── OR ────────

🅱️ *${b}*

_Reply 🅰️ or 🅱️!_`
        );
    }
};
