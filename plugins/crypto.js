const fetch = require('node-fetch');
const COINS={'btc':'bitcoin','eth':'ethereum','bnb':'binancecoin','sol':'solana','ada':'cardano','xrp':'ripple','doge':'dogecoin','usdt':'tether','usdc':'usd-coin','matic':'matic-network','dot':'polkadot','avax':'avalanche-2','link':'chainlink','ltc':'litecoin','shib':'shiba-inu','ton':'the-open-network','trx':'tron','uni':'uniswap','xlm':'stellar','atom':'cosmos'};
module.exports={name:'crypto',aliases:['coin','price','btc','eth'],description:'Get live cryptocurrency price and 24h stats — free, no setup needed',
async execute(sock,m,args){
    const input=(args[0]||'bitcoin').toLowerCase();
    const id=COINS[input]||input;
    await m.react('⏳');
    try{
        const r=await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids='+id+'&price_change_percentage=24h');
        const d=await r.json();
        if(!d.length) return m.reply('❌ Coin not found. Try: BTC, ETH, BNB, SOL, ADA, XRP, DOGE, MATIC, SHIB, TON, TRX, LINK, DOT');
        const c=d[0];
        const change=c.price_change_percentage_24h||0;
        const arrow=change>=0?'📈':'📉';
        const sign=change>=0?'+':'';
        await m.reply('╭━━━ 💰 '+c.symbol.toUpperCase()+' PRICE ━━━╮\n\n🏷️ Name: '+c.name+'\n💵 Price: $'+c.current_price.toLocaleString()+'\n'+arrow+' 24h Change: '+sign+change.toFixed(2)+'%\n📊 Market Cap: $'+c.market_cap.toLocaleString()+'\n📦 Volume 24h: $'+c.total_volume.toLocaleString()+'\n⬆️ 24h High: $'+c.high_24h.toLocaleString()+'\n⬇️ 24h Low: $'+c.low_24h.toLocaleString()+'\n\n> Data from CoinGecko');
        await m.react('✅');
    }catch(e){await m.react('❌');await m.reply('❌ Could not fetch price. Try again in a moment.');}
}};