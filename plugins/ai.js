/**
 * AI Chat Plugin
 * Primary:  Groq (FREE — uses Llama 3.1 via https://console.groq.com)
 * Fallback: Claude (Anthropic — paid, set ANTHROPIC_API_KEY)
 * No dummy keys exist — Groq is genuinely free with no credit card needed.
 */

const fetch = require('node-fetch');

const GROQ_ENDPOINT  = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL     = 'llama-3.1-8b-instant'; // fast, free, capable

const SYSTEM_PROMPT = `You are XLICON, a helpful and friendly WhatsApp AI assistant.
Keep answers concise and clear — this is a chat interface, not a document.
Use plain text only. Do not use markdown like **, ##, or bullet dashes with * since WhatsApp shows them as raw symbols.
Use simple dashes (-) or numbers for lists instead.
If asked who you are, say: I am XLICON AI, your smart WhatsApp assistant.`;

const MAX_HISTORY  = 20;
const HISTORY_TTL  = 30 * 60 * 1000; // 30 min idle = clear

const conversations = new Map();   // chatJid → { messages, lastActive }
const aiChatCache   = new Map();   // chatJid → boolean

const getDb = () => global.getMongoDb();

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
    if (db) await db.collection('aichat_settings').updateOne(
        { _id: chatJid },
        { $set: { enabled: val, updatedAt: new Date() } },
        { upsert: true }
    );
}

function getHistory(chatJid) {
    const e = conversations.get(chatJid);
    if (!e) return [];
    if (Date.now() - e.lastActive > HISTORY_TTL) { conversations.delete(chatJid); return []; }
    return e.messages;
}

function addToHistory(chatJid, role, content) {
    const msgs = getHistory(chatJid);
    msgs.push({ role, content });
    if (msgs.length > MAX_HISTORY) msgs.splice(0, msgs.length - MAX_HISTORY);
    conversations.set(chatJid, { messages: msgs, lastActive: Date.now() });
}

// ── Core AI call — Groq first, Claude fallback ────────────────────────────
async function askAI(chatJid, userText) {
    addToHistory(chatJid, 'user', userText);
    const history = getHistory(chatJid);

    // ── Try Groq (FREE) ──────────────────────────────────────────────────
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
        const res = await fetch(GROQ_ENDPOINT, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
                max_tokens: 1024,
                temperature: 0.7
            })
        });
        if (res.ok) {
            const data = await res.json();
            const reply = data.choices?.[0]?.message?.content || '(No response)';
            addToHistory(chatJid, 'assistant', reply);
            return reply;
        }
        const err = await res.json().catch(() => ({}));
        throw new Error('Groq error: ' + (err.error?.message || res.status));
    }

    // ── Fallback: Claude (Anthropic) ─────────────────────────────────────
    const claudeKey = process.env.ANTHROPIC_API_KEY;
    if (claudeKey) {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': claudeKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'claude-3-5-haiku-20241022',
                max_tokens: 1024,
                system: SYSTEM_PROMPT,
                messages: history
            })
        });
        if (res.ok) {
            const data = await res.json();
            const reply = data.content?.[0]?.text || '(No response)';
            addToHistory(chatJid, 'assistant', reply);
            return reply;
        }
        const err = await res.json().catch(() => ({}));
        throw new Error('Claude error: ' + (err.error?.message || res.status));
    }

    throw new Error('NO_KEY');
}

function isOwnerOrAdmin(m) {
    const owners = global.owners || [];
    const num = (m.sender || '').split('@')[0].replace(/:\d+$/, '');
    return owners.some(o => o.split('@')[0].replace(/:\d+$/, '') === num) || (m.isGroup && m.isAdmin);
}

const NO_KEY_MSG = `❌ AI is not configured yet.

To enable it (completely FREE):

1. Go to https://console.groq.com
2. Sign up (no credit card needed)
3. Click "API Keys" and create a key
4. In Railway: go to your service
   Variables → add:
   GROQ_API_KEY = your_key_here
5. Redeploy — AI will work instantly!

Groq gives you Llama 3.1 AI for free with generous limits.`;

module.exports = {
    name: 'ai',
    aliases: ['ask', 'claude', 'llm', 'bot'],
    description: 'Chat with XLICON AI (powered by Groq/Llama 3 — free)',

    async execute(sock, m, args) {
        const sub = args[0]?.toLowerCase();

        if (sub === 'on' || sub === 'off') {
            if (m.isGroup && !isOwnerOrAdmin(m))
                return m.reply('❌ Only group admins or the owner can toggle AI chat.');
            const enable = sub === 'on';
            await setAiChat(m.from, enable);
            return m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃    🤖 *AI CHAT MODE*  ┃
╰━━━━━━━━━━━━━━━━━━━╯

Status: ${enable ? '✅ ON' : '❌ OFF'}
💾 Saved — survives restarts

${enable
    ? '- XLICON AI replies to every message here\n- Use .ai off to disable\n- Use .aiclear to reset memory'
    : '- Auto-reply disabled\n- Still use .ai <question> anytime'}`
            );
        }

        if (sub === 'clear' || (args[0] || '').toLowerCase() === 'aiclear') {
            conversations.delete(m.from);
            return m.reply('🗑️ Conversation history cleared!');
        }

        const question = args.join(' ').trim();
        if (!question) {
            const isOn = await isAiChatOn(m.from);
            const provider = process.env.GROQ_API_KEY ? 'Groq (Llama 3.1 - Free)' :
                             process.env.ANTHROPIC_API_KEY ? 'Claude (Anthropic)' : 'Not configured';
            return m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃    🤖 *XLICON AI*     ┃
╰━━━━━━━━━━━━━━━━━━━╯

Provider: ${provider}
AI Chat: ${isOn ? '🟢 ON' : '🔴 OFF'} in this chat
Memory: ${getHistory(m.from).length}/${MAX_HISTORY} messages

Commands:
- .ai <question> — Ask anything
- .ai on / .ai off — Toggle auto-reply
- .aiclear — Reset conversation`
            );
        }

        await m.react('⏳');
        try {
            const reply = await askAI(m.from, question);
            await m.reply(reply);
            await m.react('🤖');
        } catch (e) {
            await m.react('❌');
            if (e.message === 'NO_KEY') return m.reply(NO_KEY_MSG);
            return m.reply('❌ AI error: ' + e.message);
        }
    },

    async onMessage(sock, m) {
        if (!m.body || !m.from) return;
        if (m.body.startsWith(global.BOT_PREFIX || '.')) return;
        if (m.key?.fromMe) return;
        const isOn = await isAiChatOn(m.from);
        if (!isOn) return;
        try {
            const reply = await askAI(m.from, m.body);
            await sock.sendMessage(m.from, { text: reply }, { quoted: m });
        } catch (_) {}
    }
};
