/**
 * AI Chat Plugin — XLICON-V2-MD
 *
 * AI Provider (one required):
 *   GROQ_API_KEY      — Free at https://console.groq.com  (Llama 3.3 70B)
 *   ANTHROPIC_API_KEY — Paid, Claude 3.5 Haiku
 *
 * Live Search (optional but strongly recommended):
 *   BRAVE_API_KEY  — Free 2 000 searches/mo: https://api.search.brave.com
 *   SERPER_API_KEY — Free 2 500 queries/mo:  https://serper.dev
 *
 * Without a search key the bot falls back to the Wikipedia summary API
 * for factual queries and BBC RSS for news queries (both free, no key).
 */

const fetch = require('node-fetch');
const https = require('https');

// ── constants ────────────────────────────────────────────────────────────────
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL    = 'llama-3.3-70b-versatile';   // best free Groq model
const MAX_HISTORY   = 20;
const HISTORY_TTL   = 30 * 60 * 1000;              // 30 min idle → clear

// ── state ────────────────────────────────────────────────────────────────────
const conversations = new Map();  // chatJid → { messages, lastActive }
const aiChatCache   = new Map();  // chatJid → boolean
const getDb = () => global.getMongoDb();

// ── MongoDB helpers ──────────────────────────────────────────────────────────
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

// ── conversation memory ──────────────────────────────────────────────────────
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

// ── live search helpers ──────────────────────────────────────────────────────
function httpsGet(url, hdrs = {}) {
    return new Promise((res, rej) => {
        https.get(url, { headers: { 'User-Agent': 'XLICONBot/1.0', ...hdrs } }, r => {
            if (r.statusCode === 301 || r.statusCode === 302) return httpsGet(r.headers.location, hdrs).then(res).catch(rej);
            let d = ''; r.on('data', c => d += c); r.on('end', () => res(d));
        }).on('error', rej);
    });
}

/** Brave Search — returns [{title,url,description,thumbnail?}] */
async function braveSearch(query) {
    const key = process.env.BRAVE_API_KEY;
    if (!key) return null;
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5&freshness=pw`;
    const raw = await httpsGet(url, { 'Accept': 'application/json', 'X-Subscription-Token': key });
    const data = JSON.parse(raw);
    return (data.web?.results || []).map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.description,
        thumb: r.thumbnail?.src || null,
    }));
}

/** Serper (Google proxy) — returns [{title,link,snippet,imageUrl?}] */
async function serperSearch(query) {
    const key = process.env.SERPER_API_KEY;
    if (!key) return null;
    const body = JSON.stringify({ q: query, num: 5, tbs: 'qdr:w' });
    const raw = await new Promise((res, rej) => {
        const req = https.request({
            hostname: 'google.serper.dev', path: '/search', method: 'POST',
            headers: { 'X-API-KEY': key, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(d)); });
        req.on('error', rej); req.write(body); req.end();
    });
    const data = JSON.parse(raw);
    return (data.organic || []).map(r => ({
        title: r.title,
        url: r.link,
        snippet: r.snippet,
        thumb: null,
    }));
}

/** Wikipedia summary API — free, no key */
async function wikiSummary(query) {
    const term = encodeURIComponent(query.replace(/\s+/g, '_'));
    try {
        const raw = await httpsGet(`https://en.wikipedia.org/api/rest_v1/page/summary/${term}`);
        const d = JSON.parse(raw);
        if (d.type === 'disambiguation' || !d.extract) return null;
        return {
            title: d.title,
            url: d.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${term}`,
            snippet: d.extract.slice(0, 400),
            thumb: d.thumbnail?.source || null,
        };
    } catch { return null; }
}

/** BBC RSS headlines — free, no key */
async function bbcHeadlines(cat = 'world') {
    const feeds = {
        world: 'https://feeds.bbci.co.uk/news/world/rss.xml',
        tech:  'https://feeds.bbci.co.uk/news/technology/rss.xml',
        sport: 'https://feeds.bbci.co.uk/sport/rss.xml',
    };
    const url = feeds[cat] || feeds.world;
    const xml = await httpsGet(url);
    const items = [];
    const re = /<item>([\s\S]*?)<\/item>/g;
    let m2;
    while ((m2 = re.exec(xml)) !== null && items.length < 5) {
        const get = (tag) => { const r2 = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`); const x = r2.exec(m2[1]); return x ? x[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : ''; };
        let link = get('link'); if (link.includes('?')) link = link.split('?')[0];
        const thumbM = /media:thumbnail[^>]+url="([^"]+)"/.exec(m2[1]);
        items.push({ title: get('title'), url: link, snippet: get('description'), thumb: thumbM ? thumbM[1] : null });
    }
    return items;
}

// Keywords that signal a real-time / current-events query
const NEWS_WORDS = /\b(today|latest|current|recent|now|news|2025|2026|this week|this year|just|breaking|update|happening)\b/i;
const SEARCH_WORDS = /\b(who is|what is|when did|where is|how much|price of|weather|score|result|win|won|died|elected|launched|released|announced)\b/i;

/** Main search dispatcher */
async function webSearch(query) {
    // 1. Try paid search APIs first (best results)
    let results = await braveSearch(query).catch(() => null)
               || await serperSearch(query).catch(() => null);
    if (results && results.length) return { source: 'web', results };

    // 2. If query looks like news, use BBC RSS
    if (NEWS_WORDS.test(query)) {
        const cat = /tech|technolog/i.test(query) ? 'tech'
                  : /sport|football|soccer|cricket/i.test(query) ? 'sport'
                  : 'world';
        const headlines = await bbcHeadlines(cat).catch(() => []);
        if (headlines.length) return { source: 'bbc', results: headlines };
    }

    // 3. Wikipedia summary as last resort
    const wiki = await wikiSummary(query).catch(() => null);
    if (wiki) return { source: 'wiki', results: [wiki] };

    return null;
}

/** Build context block injected into AI system prompt */
function buildSearchContext(searchData, today) {
    if (!searchData) return `Today's date: ${today}. You don't have access to live search for this query.`;
    const src = searchData.source === 'bbc' ? 'BBC News (live RSS)' :
                searchData.source === 'wiki' ? 'Wikipedia' : 'Live web search';
    let ctx = `Today is ${today}. The following LIVE search results were fetched just now from ${src}:\n\n`;
    searchData.results.forEach((r, i) => {
        ctx += `[${i + 1}] ${r.title}\n`;
        if (r.snippet) ctx += `    ${r.snippet.slice(0, 250)}\n`;
        ctx += `    Source: ${r.url}\n\n`;
    });
    ctx += `Use these results to answer. Always cite the source URL after each fact you use, formatted as (Source: URL).`;
    return ctx;
}

const BASE_SYSTEM = `You are XLICON, a smart WhatsApp AI assistant.
Rules:
- Keep answers concise — this is a chat interface.
- Use plain text only. No markdown (no **, ##, or * bullets) since WhatsApp renders them as raw symbols.
- Use simple dashes (-) or numbers for lists.
- When you use a fact from the search results, include the source URL in parentheses like: (Source: https://...)
- If asked who you are: "I am XLICON AI, your smart WhatsApp assistant powered by Llama 3."`;

// ── Core AI call ─────────────────────────────────────────────────────────────
async function askAI(chatJid, userText, doSearch = true) {
    const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Decide whether to search
    const needsSearch = doSearch && (NEWS_WORDS.test(userText) || SEARCH_WORDS.test(userText) || userText.length > 10);
    let searchData = null;
    if (needsSearch) {
        searchData = await webSearch(userText).catch(() => null);
    }

    const searchCtx = buildSearchContext(searchData, today);
    const systemPrompt = BASE_SYSTEM + '\n\n' + searchCtx;

    addToHistory(chatJid, 'user', userText);
    const history = getHistory(chatJid);

    // ── Groq (free) ──────────────────────────────────────────────────────
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
        const res = await fetch(GROQ_ENDPOINT, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [{ role: 'system', content: systemPrompt }, ...history],
                max_tokens: 1024,
                temperature: 0.6,
            }),
        });
        if (res.ok) {
            const data = await res.json();
            const reply = data.choices?.[0]?.message?.content || '(No response)';
            addToHistory(chatJid, 'assistant', reply);
            return { reply, searchData };
        }
        const err = await res.json().catch(() => ({}));
        throw new Error('Groq error: ' + (err.error?.message || res.status));
    }

    // ── Claude fallback (paid) ───────────────────────────────────────────
    const claudeKey = process.env.ANTHROPIC_API_KEY;
    if (claudeKey) {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'x-api-key': claudeKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'claude-3-5-haiku-20241022', max_tokens: 1024, system: systemPrompt, messages: history }),
        });
        if (res.ok) {
            const data = await res.json();
            const reply = data.content?.[0]?.text || '(No response)';
            addToHistory(chatJid, 'assistant', reply);
            return { reply, searchData };
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

To enable (FREE):
1. Go to https://console.groq.com
2. Sign up — no credit card needed
3. Click API Keys and create one
4. In Railway: Variables → add:
   GROQ_API_KEY = your_key_here
5. Redeploy — AI works instantly!

For live web search results, also add:
   BRAVE_API_KEY (free: api.search.brave.com)
or SERPER_API_KEY (free: serper.dev)`;

// ── Plugin export ────────────────────────────────────────────────────────────
module.exports = {
    name: 'ai',
    aliases: ['ask', 'claude', 'llm', 'bot'],
    description: 'Chat with XLICON AI — live search + Llama 3.3 70B (free)',

    async execute(sock, m, args) {
        const sub = args[0]?.toLowerCase();

        // .ai on / .ai off
        if (sub === 'on' || sub === 'off') {
            if (m.isGroup && !isOwnerOrAdmin(m))
                return m.reply('❌ Only group admins or the owner can toggle AI chat.');
            const enable = sub === 'on';
            await setAiChat(m.from, enable);
            return m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃   🤖 *AI CHAT MODE*  ┃
╰━━━━━━━━━━━━━━━━━━━╯

Status: ${enable ? '✅ ON' : '❌ OFF'}
💾 Saved — survives restarts

${enable
    ? '- XLICON AI replies to every message\n- Use .ai off to disable\n- Use .aiclear to reset memory'
    : '- Auto-reply disabled\n- Still use .ai <question> anytime'}`
            );
        }

        // .aiclear
        if (sub === 'clear' || sub === 'aiclear') {
            conversations.delete(m.from);
            return m.reply('🗑️ Conversation history cleared!');
        }

        // .ai (no args) — show status
        const question = args.join(' ').trim();
        if (!question) {
            const isOn = await isAiChatOn(m.from);
            const searchMode = process.env.BRAVE_API_KEY ? 'Brave Search (live web)'
                             : process.env.SERPER_API_KEY ? 'Serper/Google (live web)'
                             : 'Wikipedia + BBC RSS (free fallback)';
            const provider = process.env.GROQ_API_KEY ? 'Groq — Llama 3.3 70B (Free)'
                           : process.env.ANTHROPIC_API_KEY ? 'Claude 3.5 Haiku (Paid)'
                           : 'Not configured';
            return m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃    🤖 *XLICON AI*     ┃
╰━━━━━━━━━━━━━━━━━━━╯

Provider: ${provider}
Search: ${searchMode}
AI Chat: ${isOn ? '🟢 ON' : '🔴 OFF'} in this chat
Memory: ${getHistory(m.from).length}/${MAX_HISTORY} messages

Commands:
- .ai <question>   Ask anything (live search)
- .ai on / .ai off Toggle auto-reply
- .aiclear         Reset conversation`
            );
        }

        await m.react('🔍');
        try {
            const { reply, searchData } = await askAI(m.from, question, true);

            // If there's a thumbnail from search results, send as image + caption
            const thumb = searchData?.results?.find(r => r.thumb)?.thumb;
            if (thumb && reply.length < 900) {
                await sock.sendMessage(m.from, { image: { url: thumb }, caption: reply }, { quoted: m.raw });
            } else {
                await m.reply(reply);
            }
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
            const { reply } = await askAI(m.from, m.body, true);
            await sock.sendMessage(m.from, { text: reply }, { quoted: m });
        } catch (_) {}
    },
};
