const games=new Map(); // chatJid → {board,players,turn,marks}
function renderBoard(b){
    return [0,3,6].map(i=>[b[i]||i+1,b[i+1]||i+2,b[i+2]||i+3].map(v=>v==='X'?'❌':v==='O'?'⭕':v).join(' | ')).join('\n─────────\n');
}
function checkWin(b,mark){const w=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];return w.some(([a,b2,c])=>b[a]===mark&&b[b2]===mark&&b[c]===mark);}
function isFull(b){return b.every(c=>c==='X'||c==='O');}
module.exports={name:'tictactoe',aliases:['ttt','tt','xo'],description:'Play Tic-Tac-Toe against another group member — turn-based game',
async execute(sock,m,args){
    const p=global.BOT_PREFIX||'.';
    const existing=games.get(m.from);
    if((args[0]||'').toLowerCase()==='quit'||(args[0]||'').toLowerCase()==='stop'){
        if(!existing) return m.reply('❌ No active game to quit.');
        games.delete(m.from); return m.reply('🏳️ Game ended.');
    }
    const move=parseInt(args[0]);
    if(!isNaN(move)&&move>=1&&move<=9){
        if(!existing) return m.reply('❌ No active game. Challenge someone: .tictactoe @user');
        const normalSender=(m.sender||'').replace(/:\d+@/,'@');
        const currentPlayer=existing.players[existing.turn];
        if(normalSender!==currentPlayer&&m.sender!==currentPlayer) return m.reply('❌ It is not your turn!');
        const idx=move-1;
        if(existing.board[idx]==='X'||existing.board[idx]==='O') return m.reply('❌ That cell is already taken. Pick another (1-9)');
        const mark=existing.marks[existing.turn];
        existing.board[idx]=mark;
        if(checkWin(existing.board,mark)){
            const winner=m.pushName||currentPlayer.split('@')[0];
            games.delete(m.from);
            return m.reply(renderBoard(existing.board)+'\n\n🏆 *'+winner+' wins!* Well played!');
        }
        if(isFull(existing.board)){games.delete(m.from);return m.reply(renderBoard(existing.board)+'\n\n🤝 *It is a draw!*');}
        existing.turn=existing.turn===0?1:0;
        const nextPlayer=existing.players[existing.turn];
        const nextMention=m.isGroup?'@'+nextPlayer.split('@')[0]:'Your turn';
        await m.reply(renderBoard(existing.board)+'\n\n'+existing.marks[existing.turn]+' '+nextMention+' — pick a number (1-9)');
        return;
    }
    const mentioned=m.mentionedJid?.[0];
    if(!mentioned) return m.reply('❌ Challenge someone: .tictactoe @user\n\nMake a move: .tictactoe <1-9>\nQuit: .tictactoe quit\n\nBoard positions:\n1 | 2 | 3\n─────────\n4 | 5 | 6\n─────────\n7 | 8 | 9');
    const challenger=(m.sender||'').replace(/:\d+@/,'@');
    if(challenger===mentioned.replace(/:\d+@/,'@')) return m.reply('❌ You cannot play against yourself!');
    const board=Array(9).fill(null);
    games.set(m.from,{board,players:[challenger,mentioned],turn:0,marks:{0:'X',1:'O'}});
    await m.reply('🎮 *TIC-TAC-TOE*\n\n❌ @'+challenger.split('@')[0]+' vs ⭕ @'+mentioned.split('@')[0]+'\n\n'+renderBoard(board)+'\n\n❌ @'+challenger.split('@')[0]+' goes first — pick a number (1-9)!\nExample: .tt 5\nQuit: .tt quit',{mentions:[challenger,mentioned]});
}};