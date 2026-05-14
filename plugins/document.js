module.exports={name:'document',aliases:['fileinfo','mediainfo','info2'],description:'Get file info (size, type, name) from any media message — reply to a file',
async execute(sock,m,args){
    const target=m.quoted||m;
    const msg=target.raw?.message||{};
    const types=['imageMessage','videoMessage','audioMessage','documentMessage','stickerMessage','voiceMessage'];
    const type=types.find(t=>msg[t]);
    if(!type) return m.reply('❌ Reply to a media message (image, video, audio, document, sticker) to get its info.');
    const media=msg[type];
    const size=media.fileLength?+(media.fileLength):0;
    const sizeStr=size>1048576?(size/1048576).toFixed(2)+' MB':size>1024?(size/1024).toFixed(1)+' KB':size+' B';
    const mime=media.mimetype||'unknown';
    const fname=media.fileName||'(no filename)';
    const caption=media.caption||'(no caption)';
    const w=media.width; const h=media.height;
    const duration=media.seconds;
    let info='╭━━━ 📁 FILE INFO ━━━╮\n\n';
    info+='📂 Type: '+type.replace('Message','')+'\n';
    info+='📄 MIME: '+mime+'\n';
    if(fname!=='(no filename)') info+='🏷️ Name: '+fname+'\n';
    info+='💾 Size: '+sizeStr+'\n';
    if(w&&h) info+='📐 Dimensions: '+w+'x'+h+' px\n';
    if(duration) info+='⏱️ Duration: '+duration+'s\n';
    if(caption&&caption!=='(no caption)') info+='💬 Caption: '+caption.slice(0,100)+'\n';
    info+='\n> Reply .download to the same message to save it';
    await m.reply(info);
}};