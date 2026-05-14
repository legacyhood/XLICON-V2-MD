const fetch = require('node-fetch');
module.exports={name:'quran',aliases:['surah','ayah','quranverse'],description:'Get any Quran verse with English translation — free, no setup needed. E.g. .quran 2:255',
async execute(sock,m,args){
    if(!args.length) return m.reply('❌ Usage: .quran <Surah>:<Ayah>\n\nExamples:\n.quran 1:1  (Al-Fatiha)\n.quran 2:255  (Ayatul Kursi)\n.quran 112:1  (Al-Ikhlas)\n.quran 36:1  (Ya-Sin)');
    const ref=args[0];
    const [surah,ayah]=ref.split(':');
    if(!surah||!ayah) return m.reply('❌ Format: .quran <Surah>:<Ayah>  e.g. .quran 2:255');
    await m.react('⏳');
    try{
        const [arabic,english]=await Promise.all([
            fetch('https://api.alquran.cloud/v1/ayah/'+surah+':'+ayah+'/ar.alafasy').then(r=>r.json()),
            fetch('https://api.alquran.cloud/v1/ayah/'+surah+':'+ayah+'/en.sahih').then(r=>r.json())
        ]);
        if(arabic.status!=='OK') return m.reply('❌ Verse not found: '+ref);
        const a=arabic.data; const e=english.data;
        await m.reply('📿 *Surah '+a.surah.englishName+' ('+a.surah.name+') — '+surah+':'+ayah+'*\n\n'+a.text+'\n\n'+e.text+'\n\n— Al-Quran (Sahih International)');
        await m.react('✅');
    }catch(e){await m.react('❌');await m.reply('❌ Could not fetch verse. Try: .quran 2:255');}
}};