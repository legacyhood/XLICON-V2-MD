const https = require('https');
function httpGet(url) {
    return new Promise((res,rej)=>{
        https.get(url,{headers:{'User-Agent':'curl/7.68.0'}},(r)=>{
            let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(d));
        }).on('error',rej);
    });
}
const EMOJIS = { Sunny:'☀️', Clear:'🌙', 'Partly cloudy':'⛅', Cloudy:'☁️', Overcast:'☁️', Mist:'🌫️', 'Patchy rain possible':'🌦️', Rain:'🌧️', 'Heavy rain':'🌧️', Thunder:'⛈️', Snow:'❄️', Fog:'🌫️', Blizzard:'🌨️', Sleet:'🌨️', default:'🌤️' };
function weatherEmoji(desc) { return EMOJIS[desc] || EMOJIS.default; }

module.exports = {
    name: 'weather',
    aliases: ['w', 'temp', 'forecast'],
    description: 'Get current weather for any city',
    async execute(sock, m, args) {
        if (!args.length) return m.reply('❌ Usage: _.weather Lagos_\n_.weather New York_');
        await m.react('⏳');
        const city = args.join(' ');
        try {
            const raw = await httpGet(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
            const data = JSON.parse(raw);
            const c = data.current_condition[0];
            const area = data.nearest_area[0];
            const name = area.areaName[0].value;
            const country = area.country[0].value;
            const desc = c.weatherDesc[0].value;
            const emoji = weatherEmoji(desc);
            const tempC = c.temp_C;
            const tempF = c.temp_F;
            const feels = c.FeelsLikeC;
            const humidity = c.humidity;
            const wind = c.windspeedKmph;
            const windDir = c.winddir16Point;
            const visibility = c.visibility;
            const uv = c.uvIndex;
            const w = data.weather;

            let forecastStr = '';
            for (let i = 0; i < Math.min(3, w.length); i++) {
                const day = w[i];
                const dayDesc = day.hourly[4]?.weatherDesc[0]?.value || '';
                forecastStr += `\n  📅 ${day.date}: ${weatherEmoji(dayDesc)} ${dayDesc} | ↕️ ${day.mintempC}°-${day.maxtempC}°C`;
            }

            await m.reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃   🌍 *WEATHER*       ┃
╰━━━━━━━━━━━━━━━━━━━╯

📍 *${name}, ${country}*
${emoji} *${desc}*

🌡️ *Temp:* ${tempC}°C / ${tempF}°F
🤔 *Feels like:* ${feels}°C
💧 *Humidity:* ${humidity}%
💨 *Wind:* ${wind} km/h ${windDir}
👁️ *Visibility:* ${visibility} km
☀️ *UV Index:* ${uv}

📆 *3-Day Forecast:*${forecastStr}

_Powered by wttr.in_`
            );
            await m.react('✅');
        } catch(e) {
            await m.react('❌');
            await m.reply(`❌ Could not get weather for *${city}*. Check the city name.`);
        }
    }
};
