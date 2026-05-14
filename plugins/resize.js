module.exports={name:'resize',aliases:['scale','imgsize','dimensions'],description:'Resize an image to specific dimensions — reply to image with .resize WIDTHxHEIGHT',
async execute(sock,m,args){
    const dim=args[0]||'';
    const hasImg=m.type==='imageMessage'||(m.quoted&&m.quoted.type==='imageMessage');
    if(!hasImg||!dim.includes('x')) return m.reply('❌ Usage: .resize WIDTHxHEIGHT (reply to image)\n\nExamples:\n.resize 800x600\n.resize 1080x1080\n.resize 512x512\n.resize 1280x720');
    const[wStr,hStr]=dim.split('x');
    const tw=parseInt(wStr); const th=parseInt(hStr);
    if(isNaN(tw)||isNaN(th)||tw<10||th<10||tw>4000||th>4000) return m.reply('❌ Invalid dimensions. Width and height must be between 10 and 4000 pixels.');
    try{
        await m.react('⏳');
        const target=m.type==='imageMessage'?m:m.quoted;
        const buf=await target.download();
        let jimp;
        try{jimp=require('jimp');}catch(e){return m.reply('❌ Image processing library not installed. Redeploy Railway after the latest update.');}
        const img=await jimp.read(buf);
        img.resize(tw,th);
        const out=await img.getBufferAsync(jimp.MIME_JPEG);
        await sock.sendMessage(m.from,{image:out,caption:'📐 Resized to *'+tw+'x'+th+'*'},{quoted:m});
        await m.react('✅');
    }catch(e){await m.react('❌');await m.reply('❌ Resize failed: '+e.message);}
}};