const WORDS=['NIGERIA','PYTHON','WHATSAPP','ELEPHANT','KEYBOARD','DEMOCRACY','UNIVERSE','SUNFLOWER','CHOCOLATE','MOUNTAIN','FOOTBALL','PARLIAMENT','LABORATORY','BUTTERFLY','DINOSAUR','ASTRONAUT','ALGORITHM','REVOLUTION','PHILOSOPHY','GEOGRAPHY','ELECTRICITY','CELEBRATION','ARCHITECTURE','INDEPENDENCE','COMMUNICATION'];
const STAGES=['😊','😟','😰','😱','💀'];
const activeGames=new Map();
module.exports={name:'hangman',aliases:['hm','wordgame'],description:'Play Hangman — guess the word letter by letter before it is too late!',
async execute(sock,m,args){
    const p=global.BOT_PREFIX||'.';
    const existing=activeGames.get(m.from);
    if((args[0]||'').toLowerCase()==='quit'||(args[0]||'').toLowerCase()==='stop'){
        if(!existing) return m.reply('❌ No active game.');
        activeGames.delete(m.from);
        return m.reply('🏳️ Game over! The word was: *'+existing.word+'*');
    }
    const guess=(args[0]||'').toUpperCase();
    if(existing&&guess.length===1&&/[A-Z]/.test(guess)){
        if(existing.guessed.includes(guess)) return m.reply('❌ You already guessed *'+guess+'*! Try another letter.');
        existing.guessed.push(guess);
        if(!existing.word.includes(guess)) existing.wrong++;
        const display=existing.word.split('').map(l=>existing.guessed.includes(l)?l:'_').join(' ');
        const wrong=existing.guessed.filter(l=>!existing.word.includes(l));
        const stage=Math.min(existing.wrong,STAGES.length-1);
        if(!display.includes('_')){
            activeGames.delete(m.from);
            return m.reply('🎉 *YOU WIN!* The word was: *'+existing.word+'*\n\nYou got it with '+wrong.length+' wrong guesses!');
        }
        if(existing.wrong>=6){
            activeGames.delete(m.from);
            return m.reply(STAGES[stage]+' *GAME OVER!*\n\nThe word was: *'+existing.word+'*\n\nBetter luck next time! .hangman to play again');
        }
        await m.reply(STAGES[stage]+' *HANGMAN* — '+display+'\n\nWrong ('+existing.wrong+'/6): '+(wrong.length?wrong.join(', '):'none')+'\n\nGuess a letter: .hangman <letter>\nQuit: .hangman quit');
        return;
    }
    if(existing) return m.reply('Guess a single letter!\nExample: .hangman A\n\n'+existing.word.split('').map(l=>existing.guessed.includes(l)?l:'_').join(' ')+'\n\nWrong: '+existing.guessed.filter(l=>!existing.word.includes(l)).join(', ')||'none');
    const word=WORDS[Math.floor(Math.random()*WORDS.length)];
    activeGames.set(m.from,{word,guessed:[],wrong:0});
    const display=word.split('').map(()=>'_').join(' ');
    await m.reply('😊 *HANGMAN — New Game!*\n\n'+display+'\n\nWord: '+word.length+' letters\n\nGuess a letter: .hangman A\nQuit: .hangman quit\n\nYou have 6 wrong guesses before game over!');
}};