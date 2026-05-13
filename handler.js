/**
 * Serialize Message
 * Created By ABZTECH
 * Follow https://github.com/abrahamdw882
 */

const { downloadMediaMessage } = require('@whiskeysockets/baileys'); 

async function serializeMessage(sock, msg) {
    const from = msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const sender = msg.key.fromMe ? sock.user.id : (isGroup ? msg.key.participant : from);
    const pushName = msg.pushName || (sender ? sender.split('@')[0] : 'Unknown');
    let body = '';
    const type = Object.keys(msg.message || {})[0] || '';
    
    if (msg.message?.interactiveResponseMessage) {
        body = msg.message.interactiveResponseMessage.buttonId || 
               msg.message.interactiveResponseMessage?.body?.text || '';
    } else if (msg.message?.conversation) {
        body = msg.message.conversation;
    } else if (msg.message?.extendedTextMessage?.text) {
        body = msg.message.extendedTextMessage.text;
    } else if (msg.message?.imageMessage?.caption) {
        body = msg.message.imageMessage.caption;
    } else if (msg.message?.videoMessage?.caption) {
        body = msg.message.videoMessage.caption;
    } else if (msg.message?.documentMessage?.caption) {
        body = msg.message.documentMessage.caption;
    } else if (msg.message?.buttonsResponseMessage?.selectedButtonId) {
        body = msg.message.buttonsResponseMessage.selectedButtonId;
    } else if (msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
        body = msg.message.listResponseMessage.singleSelectReply.selectedRowId;
    } else if (msg.message?.templateButtonReplyMessage?.selectedId) {
        body = msg.message.templateButtonReplyMessage.selectedId;
    }

    // Extract mentioned JIDs from context info
    const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    const isMedia = ['imageMessage', 'videoMessage', 'documentMessage', 'audioMessage', 'stickerMessage'].includes(type);
    const mediaType = type.replace('Message', '').toLowerCase();
    const mimetype = msg.message?.[type]?.mimetype || null;

    const groupMetadata = isGroup ? await sock.groupMetadata(from).catch(() => null) : null;

    // Normalize a JID — strips device suffix (:14) but keeps domain (@s.whatsapp.net or @lid)
    const norm = (jid) => (jid || '').replace(/:\d+@/, '@');

    const senderNormalized = norm(sender);

    // Bot identity: sock.user.id is the phone JID; Baileys also exposes a LID via creds.
    // WhatsApp now reports group participants with LID (@lid) JIDs instead of phone JIDs,
    // so we must check BOTH formats when looking the bot up in the admin list.
    const botPhoneNorm = norm(sock.user?.id);
    const botLidNorm   = norm(
        sock.authState?.creds?.me?.lid ||   // preferred — set by newer Baileys builds
        sock.user?.lid ||                    // fallback field some forks expose
        ''
    );

    const adminParticipants = groupMetadata
        ? groupMetadata.participants.filter(p => p.admin)
        : [];
    const adminNorms = adminParticipants.map(p => norm(p.id));

    const isAdmin    = isGroup && adminNorms.includes(senderNormalized);
    const isBotAdmin = isGroup && (
        adminNorms.includes(botPhoneNorm) ||
        (botLidNorm && adminNorms.includes(botLidNorm))
    );

    let quoted;
    const ctxInfo = msg.message?.extendedTextMessage?.contextInfo;
    if (ctxInfo?.quotedMessage) {
        const qMsg = ctxInfo.quotedMessage;
        const qType = Object.keys(qMsg)[0] || '';
        const quotedSender = ctxInfo.participant || from;
        quoted = {
            key: { remoteJid: from, id: ctxInfo.stanzaId, participant: ctxInfo.participant || from },
            message: qMsg,
            type: qType,
            sender: quotedSender,
            body: qMsg?.conversation || qMsg?.extendedTextMessage?.text || qMsg?.[qType]?.caption || '',
            isMedia: ['imageMessage','videoMessage','documentMessage','audioMessage','stickerMessage'].includes(qType),
            mediaType: qType.replace('Message','').toLowerCase(),
            mimetype: qMsg?.[qType]?.mimetype || null,
            download: async () => await downloadMediaMessage({ message: qMsg, key: { ...msg.key } }, 'buffer', {}, sock)
        };
    }

    return {
        id: msg.key.id,
        key: msg.key,
        from,
        sender,
        pushName,
        isGroup,
        groupMetadata,
        isAdmin,
        isBotAdmin,
        body,
        text: body,
        type,
        mtype: type,
        isMedia,
        mediaType,
        mimetype,
        mentionedJid,
        quoted,
        message: msg.message,
        isButtonResponse: !!msg.message?.interactiveResponseMessage,
        buttonId: msg.message?.interactiveResponseMessage?.buttonId || null,
        reply: async (text, options={}) => await sock.sendMessage(from, { text, ...options }, { quoted: msg }),
        send: async (content, options={}) => await sock.sendMessage(from, typeof content === 'string' ? { text: content, ...options } : content, { quoted: msg }),
        react: async emoji => await sock.sendMessage(from, { react: { text: emoji, key: msg.key } }),
        forward: async (jid, force=false) => await sock.sendMessage(jid, { forward: msg, force }),
        download: async () => isMedia ? await downloadMediaMessage(msg, 'buffer', {}, sock) : (quoted?.isMedia ? await quoted.download() : null)
    };
}

module.exports = serializeMessage;
