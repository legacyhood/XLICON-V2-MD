require('dotenv').config();
global.sessionid = process.env.SESSION_ID || '';
global.prefix = '.';

const ownerRaw = process.env.OWNER || '2348038280548';
const ownerJid = ownerRaw.includes('@') ? ownerRaw : `${ownerRaw}@s.whatsapp.net`;
global.owners = [ownerJid];
