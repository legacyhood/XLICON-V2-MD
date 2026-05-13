const coins = ['🪙 *HEADS!*', '🪙 *TAILS!*'];
const diceEmojis = ['⚀','⚁','⚂','⚃','⚄','⚅'];

module.exports = {
    name: 'flip',
    aliases: ['coin', 'toss', 'dice', 'roll', 'rps', 'choose', 'pick'],
    description: 'Flip a coin, roll dice, play rock-paper-scissors, or pick a random option',
    async execute(sock, m, args) {
        const cmd = m.body.slice(1).trim().split(/\s+/)[0].toLowerCase();

        if (['flip','coin','toss'].includes(cmd)) {
            const r = coins[Math.floor(Math.random()*2)];
            return m.reply(`🎲 *COIN FLIP*\n\n${r}\n\n_${Math.random()<0.5?'Lucky!':'Better luck next time!'}_`);
        }
        if (['dice','roll'].includes(cmd)) {
            const n = Math.min(parseInt(args[0])||1, 6);
            const rolls = Array.from({length:n},()=>Math.floor(Math.random()*6));
            const display = rolls.map(r=>diceEmojis[r]).join(' ');
            const total = rolls.reduce((a,b)=>a+(b+1),0);
            return m.reply(`🎲 *DICE ROLL* (${n} ${n===1?'die':'dice'})\n\n${display}\n\n🔢 Total: *${total}*`);
        }
        if (cmd === 'rps') {
            const options = ['🪨 Rock','📄 Paper','✂️ Scissors'];
            const bot = options[Math.floor(Math.random()*3)];
            const user = args[0]?.toLowerCase();
            const map = {rock:0,paper:1,scissors:2,r:0,p:1,s:2};
            if (user === undefined || map[user] === undefined) {
                return m.reply(`🪨📄✂️ *ROCK PAPER SCISSORS*\n\nI chose: ${bot}\n\n_.rps rock_ / _.rps paper_ / _.rps scissors_`);
            }
            const u = map[user]; const b = options.indexOf(bot);
            const result = u===b ? '🤝 It\'s a *TIE*!' : (u-b+3)%3===1 ? '🎉 *YOU WIN!*' : '😅 *BOT WINS!*';
            return m.reply(`🪨📄✂️ *ROCK PAPER SCISSORS*\n\n👤 You: ${options[u]}\n🤖 Bot: ${bot}\n\n${result}`);
        }
        if (['choose','pick'].includes(cmd)) {
            const opts = args.join(' ').split(/[,|\/]/).map(o=>o.trim()).filter(Boolean);
            if (opts.length < 2) return m.reply('❌ Give me options!\n_.choose Pizza, Burger, Sushi_');
            const pick = opts[Math.floor(Math.random()*opts.length)];
            return m.reply(`🎯 *MY CHOICE*\n\n*${pick}*\n\n_From: ${opts.join(' | ')}_`);
        }
    }
};
