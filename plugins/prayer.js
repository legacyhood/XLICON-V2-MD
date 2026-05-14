const fetch = require('node-fetch');
module.exports={name:'prayer',aliases:['salah','salaah','namaz','prayertime','prayers'],description:'Get Islamic prayer times for any city — free, no setup needed',
async execute(sock,m,args){
    if(!args.length) return m.reply('❌ Usage: .prayer <City> [Country]\n\nExamples:\n.prayer Lagos Nigeria\n.prayer Cairo Egypt\n.prayer London UK\n.prayer Dubai UAE\n.prayer Mecca Saudi Arabia\n.prayer Kano Nigeria');
    const city=args[0]; const country=args[1]||'';
    await m.react('⏳');
    try{
        const url='https://api.aladhan.com/v1/timingsByCity?city='+encodeURIComponent(city)+(country?'&country='+encodeURIComponent(country):'')+'&method=2';
        const r=await fetch(url); const d=await r.json();
        if(d.code!==200) return m.reply('❌ City not found: '+city+(country?' '+country:''));
        const t=d.data.timings; const dt=d.data.date.readable;
        await m.reply('🕌 *Prayer Times — '+city+(country?' '+country:'')+' *\n📅 '+dt+'\n\n🌅 Fajr:    '+t.Fajr+'\n🌄 Sunrise: '+t.Sunrise+'\n☀️ Dhuhr:  '+t.Dhuhr+'\n🌤️ Asr:    '+t.Asr+'\n🌆 Maghrib:'+t.Maghrib+'\n🌙 Isha:   '+t.Isha+'\n\n> Hanafi method | Local time');
        await m.react('✅');
    }catch(e){await m.react('❌');await m.reply('❌ Could not fetch prayer times. Check city name and try again.');}
}};