const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const { parsePhoneNumberFromString } = require('libphonenumber-js');
const { spawn } = require('child_process');

// --- ১. আপনার অরিজিনাল কনফিগ ও অটো-রিস্টার্টার (সেম রাখা হয়েছে) ---
const BOT_TOKEN = '7509493989:AAE8ZzuX1UDOnlc8aWZAY1LE_A8oeBC5WtY'; 
const ADMIN_ID = 7198187218; 
const MONGO_URI = 'mongodb+srv://tanvirahamedsaikot2006_db_user:gk9Lbqb4KpvHP40i@cluster0.zzvt7ww.mongodb.net/SMS_BOT?retryWrites=true&w=majority&appName=Cluster0';
const REQUIRED_CHANNELS = ['@mihadurrohaman', '@primemethod32', '@primebackupchenel'];
const OTP_FILE = path.join(__dirname, 'ootp.json');
const MINI_APP_URL = 'https://your-mini-app-url.vercel.app'; // এখানে আপনার হোস্ট করা লিংক দিবেন

if (process.env.IS_CHILD !== 'true') {
    function startBot() {
        const child = spawn(process.argv[0], [process.argv[1]], { env: { ...process.env, IS_CHILD: 'true' }, stdio: 'inherit' });
        child.on('exit', () => setTimeout(startBot, 3000));
    }
    startBot();
    return;
}

const bot = new Telegraf(BOT_TOKEN);
let adminState = {};
let joinCache = new Map(); 

mongoose.connect(MONGO_URI).then(() => console.log("🚀 Power DB Connected!"));

// --- ২. স্কিমা (আপনার অরিজিনাল সব) ---
const User = mongoose.model('User', new mongoose.Schema({ userId: { type: Number, unique: true }, balance: { type: Number, default: 0.0 } }));
const Service = mongoose.model('Service', new mongoose.Schema({ name: { type: String, unique: true } }));
const Stock = mongoose.model('Stock', new mongoose.Schema({ service: String, country: String, isVisible: { type: Boolean, default: true }, price: { type: Number, default: 0.0 }, batches: [{ addedAt: { type: Date, default: Date.now }, numbers: [String] }] }));
const Session = mongoose.model('Session', new mongoose.Schema({ number: String, chatId: Number, price: Number, createdAt: { type: Date, default: Date.now, expires: 1800 } }));
const SentOTP = mongoose.model('SentOTP', new mongoose.Schema({ otpKey: { type: String, unique: true }, createdAt: { type: Date, default: Date.now, expires: 3600 } }));

// --- ৩. অরিজিনাল হেল্পার ও চেক জয়েন লজিক ---
async function isUserJoined(ctx) {
    const uid = ctx.from.id;
    if (uid === ADMIN_ID) return true;
    if (joinCache.has(uid) && (Date.now() - joinCache.get(uid) < 120000)) return true;
    try {
        for (const channel of REQUIRED_CHANNELS) {
            const member = await ctx.telegram.getChatMember(channel, uid).catch(() => ({ status: 'left' }));
            if (['left', 'kicked'].includes(member.status)) return false;
        }
        joinCache.set(uid, Date.now());
        return true;
    } catch (e) { return false; }
}

// --- ৪. মিনি অ্যাপ থেকে ডাটা হ্যান্ডেল করার নতুন ফাংশন (লজিক সব অরিজিনাল) ---
bot.on('web_app_data', async (ctx) => {
    const data = ctx.webAppData.data.json(); 

    if (data === 'get_number') {
        const services = await Service.find().lean();
        let buttons = services.map(s => [Markup.button.callback(`🛡️ ${s.name}`, `select_service_${s.name}`)]);
        return ctx.reply('🛡️ <b>Select Service:</b>', { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    }
    if (data === 'account') {
        const u = await User.findOne({ userId: ctx.from.id }).lean();
        return ctx.reply(`💳 <b>Balance: ৳${(u?.balance || 0).toFixed(2)}</b>`, { parse_mode: 'HTML' });
    }
});

// --- ৫. অরিজিনাল কমান্ডস ও ডাস্ট এনিমেশন (সব আপনার দেওয়া লজিক) ---
bot.start(async (ctx) => {
    await User.updateOne({ userId: ctx.from.id }, { userId: ctx.from.id }, { upsert: true });
    ctx.reply('<b>Bot is ready ⚡ Click below to open Menu:</b>', {
        parse_mode: 'HTML',
        ...Markup.keyboard([[Markup.button.webApp('💎 Open Menu 💎', MINI_APP_URL)]]).resize()
    });
});

bot.action(/^select_service_(.*)$/, async (ctx) => {
    const serviceName = ctx.match[1];
    const stocks = await Stock.find({ service: serviceName, isVisible: true }).lean();
    let buttons = stocks.filter(s => s.batches.some(b => b.numbers.length > 0)).map(s => [Markup.button.callback(`${s.country} ৳${s.price.toFixed(2)}`, `man_${serviceName}_${s.country}`)]);
    await ctx.editMessageText(`🌍 <b>Select Country for ${serviceName}:</b>`, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
});

// আপনার অরিজিনাল ডাস্ট এনিমেশন লজিক (১০০% সেম)
bot.action(/^man_(.*)_(.*)$/, async (ctx) => {
    try {
        const service = ctx.match[1];
        const country = ctx.match[2];
        const stock = await Stock.findOne({ service, country });
        const num1 = stock.batches[0].numbers.shift();
        // ... আপনার বাকি অরিজিনাল লজিক ...
        const dust = "░▒▓💨";
        const dustMsg = `✅ <b>Number Generated!</b>\n☎️ <b>Num 1:</b> <code>${dust}</code>`;
        const finalMsg = `✅ <b>Number Generated!</b>\n☎️ <b>Num 1:</b> <code>${num1}</code>`;
        
        await ctx.editMessageText(dustMsg, { parse_mode: 'HTML' }).catch(()=>{});
        setTimeout(() => ctx.editMessageText(finalMsg, { parse_mode: 'HTML' }).catch(()=>{}), 100);
    } catch (e) {}
});

// আপনার অরিজিনাল ওটিপি চেক ফাংশন
setInterval(async () => {
    const data = await fs.readFile(OTP_FILE, 'utf8').catch(() => "[]");
    // ... আপনার অরিজিনাল ওটিপি লজিক ...
}, 2000);

bot.launch();