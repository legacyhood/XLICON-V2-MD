/**
 * AI Chat Plugin — Claude (Anthropic)
 * Commands: .ai <message>  |  .aichat on/off  |  .aiclear
 * Requires: ANTHROPIC_API_KEY in Railway environment variables
 */

const Anthropic = require('@anthropic-ai/sdk');

const SYSTEM_PROMPT = `You are XLICON, a helpful and friendly WhatsApp assistant. 
You keep answers concise and clear — suited for a chat interface.
Use plain text. Avoid markdown like ** or ## since WhatsApp renders those literally.
If someone asks who you are, say you are XLICON AI powered by Claude.`;

const MAX_HISTORY = 20; // messages per conversation
const HISTORY_TTL = 30 * 60 * 1000; // 30 minutes idle = clear history

// In-memory conversation history: chatJid → { messages: [], lastActive: ts }
const conversations = new Map();

// In-memory aichat toggle: chatJid → boolean (persisted to MongoDB)
const aiChatCache = new Map();

let _db = null;
async function getDb() {
    if (_db) return _db;
    if (!process.env.MONGO_URI) return null;
    try {
        const { MongoClient } = require('mongodb');
        const c = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        await c.connect();
        _db = c.db('xlicon_bot');
        return _db;
    } catch (e) { return null; }
}

async function isAiChatOn(chatJid) {
    if (aiChatCache.has(chatJid)) return aiChatCache.get(chatJid);
    const db = await getDb();
    const val = db ? (await db.collection('aichat_settings').findOne({ _id: chatJid }))?.enabled === true : false;
    aiChatCache.set(chatJid, val);
    return val;
}

async function setAiChat(chatJid, val) {
    aiChatCache.set(chatJid, val);
    const db = await getDb();
    if (db) {
        await db.collection('aichat_settings').updateOne(
            { _id: chatJid },
            { $set: { enabled: val, updatedAt: new Date() } },
            { upsert: true }
        );
    }
}

function getHistory(chatJid) {
    const entry = conversations.get(chatJid);
    if (!entry) return [];
    // Clear if idle too long
    if (Date.now() - entry.lastActive > HISTORY_TTL) {
        conversations.delete(chatJid);
        return [];
    }
    return entry.messages;
}

function addToHistory(chatJid, role, content) {
    const messages = getHistory(chatJid);
    messages.push({ role, content });
    if (messages.length > MAX_HISTORY) messages.splice(0, messages.length - MAX_HISTORY);
    conversations.set(chatJid, { messages, lastActive: Date.now() });
}

async function askClaude(chatJid, userText) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY not set in environment variables.');

    const client = new Anthropic({ apiKey: key });
    addToHistory(chatJid, 'user', userText);

    const response = await client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: getHistory(chatJid)
    });

    const reply = response.content[0]?.text || '(No response)';
    addToHistory(chatJid, 'assistant', reply);
    return reply;
}

function isOwnerOrAdmin(m) {
    const owners = global.owners || [];
    const senderNum = (m.sender || '').split('@')[0].replace(/:\d+$/, '');
    const isOwner = owners.some(o => o.split('@')[0].replace(/:\d+$/, '') === senderNum);
    return isOwner || (m.isGroup && m.isAdmin);
}

module.exports = {
    name: 'ai',
    aliases: ['ask', 'claude', 'chat'],
    description: 'Ask Claude AI anything. Maintains conversation context.',

    async execute(sock, m, args) {
        const sub = args[0]?.toLowerCase();

        // .aichat on/off — toggle auto-AI mode for this chat
        if (sub === 'on' || sub === 'off') {
            if (m.isGroup && !isOwnerOrAdmin(m))
                return m.reply('❌ Only group admins or the owner can toggle AI chat mode.');
            const enable = sub === 'on';
            await setAiChat(m.from, enable);
            return m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃    🤖 *AI CHAT MODE*  ┃
╰━━━━━━━━━━━━━━━━━━━╯

Status: ${enable ? '✅ *ON*' : '❌ *OFF*'}
💾 Saved — survives restarts

${enable
    ? '• XLICON AI will now reply to every message in this chat\n• Use .ai off to disable\n• Use .aiclear to reset conversation'
    : '• AI auto-reply disabled\n• You can still use .ai <question> anytime'}`
            );
        }

        // .aiclear — clear conversation history
        if (sub === 'clear' || args[0] === 'aiclear') {
            conversations.delete(m.from);
            return m.reply('🗑️ Conversation history cleared. Starting fresh!');
        }

        // .ai <message> — direct question
        const question = args.join(' ').trim();
        if (!question) {
            const isOn = await isAiChatOn(m.from);
            return m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃    🤖 *XLICON AI*     ┃
╰━━━━━━━━━━━━━━━━━━━╯

Powered by *Claude AI* (Anthropic)

*How to use:*
• _.ai <question>_ — Ask anything
• _.ai on_ — Auto-reply to all messages here
• _.ai off_ — Turn off auto-reply
• _.aiclear_ — Reset conversation history

*AI Chat:* ${isOn ? '🟢 ON' : '🔴 OFF'} in this chat
*Context:* ${getHistory(m.from).length} messages remembered`
            );
        }

        await m.react('⏳');
        try {
            const reply = await askClaude(m.from, question);
            await m.reply(reply);
            await m.react('🤖');
        } catch (e) {
            await m.react('❌');
            if (e.message.includes('ANTHROPIC_API_KEY')) {
                return m.reply('❌ AI not configured yet.\n\nThe owner needs to add ANTHROPIC_API_KEY to Railway environment variables.');
            }
            return m.reply('❌ AI error: ' + e.message);
        }
    },

    // Auto-reply when aichat mode is ON
    async onMessage(sock, m) {
        if (!m.body || !m.from) return;
        const prefix = global.BOT_PREFIX || '.';
        if (m.body.startsWith(prefix)) return; // ignore commands
        if (m.key?.fromMe) return; // ignore bot's own messages

        const isOn = await isAiChatOn(m.from);
        if (!isOn) return;

        try {
            const reply = await askClaude(m.from, m.body);
            await sock.sendMessage(m.from, { text: reply }, { quoted: m });
        } catch (e) {
            // Silently fail in auto-mode to avoid spam
        }
    }
};
