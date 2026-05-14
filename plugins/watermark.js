const fetch=require('node-fetch');
module.exports={name:'watermark',aliases:['wm','addtext','stamp'],description:'Add a text watermark to an image — reply to or send an image with .watermark <text>',
async execute(sock,m,args){
    const text=args.join(' ').trim()||'XLICON';
    const hasImg=m.type==='imageMessage'||(m.quoted&&m.quoted.type==='imageMessage');
    if(!hasImg) return m.reply('❌ Reply to an image or send one with this command.\nExample: .watermark My Name (reply to image)');
    try{
        await m.react('⏳');
        const target=m.type==='imageMessage'?m:m.quoted;
        let buf;
        try{buf=await target.download();}catch(e){
            return m.reply('❌ Could not download the image. Try sending the image directly instead of forwarding it.');
        }
        let jimp;
        try{jimp=require('jimp');}catch(e){
            return m.reply('❌ Image processing library not installed yet. Please redeploy Railway after the latest update.');
        }
        const img=await jimp.read(buf);
        const w=img.getWidth(); const h=img.getHeight();
        const fontSize=Math.max(32,Math.floor(w/15));
        let font;
        try{
            if(fontSize>=64) font=await jimp.loadFont(jimp.FONT_SANS_64_WHITE);
            else if(fontSize>=32) font=await jimp.loadFont(jimp.FONT_SANS_32_WHITE);
            else font=await jimp.loadFont(jimp.FONT_SANS_16_WHITE);
        }catch(e){font=await jimp.loadFont(jimp.FONT_SANS_32_WHITE);}
        const tw=jimp.measureText(font,text); const th=jimp.measureTextHeight(font,text,w);
        img.print(font,w-tw-20,h-th-20,text);
        const out=await img.getBufferAsync(jimp.MIME_JPEG);
        await sock.sendMessage(m.from,{image:out,caption:'🖼️ Watermark added: *'+text+'*'},{quoted:m});
        await m.react('✅');
    }catch(e){await m.react('❌');await m.reply('❌ Watermark failed: '+e.message);}
}};