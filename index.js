const TelegramBot = require("node-telegram-bot-api");

// ==== CONFIG ====
const TOKEN = process.env.BOT_TOKEN;          // Railway / Render environment
const ADMIN_ID = process.env.ADMIN_ID;        // Your Telegram ID
const bot = new TelegramBot(TOKEN, { polling: true });

// ==== LOGIN-PAROL LIST (your credentials) ====
let credentials = [
    { login: "dE63tUw", pass: "Sg82Kb3" },
    { login: "Fh18pQz", pass: "yL29Rx7" },
    { login: "gJ54mNa", pass: "Tq30Hv8" },
    { login: "Kk02vRb", pass: "pZ71sM4" },
    { login: "lM89qFd", pass: "Xc56Gy2" },
    { login: "Nn37zHs", pass: "uV15Wr6" },
    { login: "oP46bTj", pass: "Bf90Ly3" },
    { login: "Qr25cUz", pass: "Je68Kn1" },
    { login: "sS10dWx", pass: "Zm47Pa9" },
    { login: "Tt83eYa", pass: "kR21Qc5" },
    { login: "uV48fZb", pass: "Hg60Mn2" },
    { login: "Ww29gAc", pass: "Ly37Sv8" },
    { login: "xX65hBd", pass: "Po14Tr6" },
    { login: "Yy04iCe", pass: "Rq72Vk3" },
    { login: "zZ91jDf", pass: "Ns58La7" },
    { login: "Aa36kEg", pass: "Ub23Yp9" },
    { login: "Bb57lFh", pass: "Xv80Mr2" },
    { login: "Cc18mGi", pass: "Kt49Qz6" },
    { login: "Dd64nHj", pass: "Pw31Sa8" },
    { login: "Ee02oIk", pass: "Ym75Rb4" },
    // qolganlari shu formatda davom etadi (hammasini qo‘shib beraman desang)
];

// ==== Already given logins ====
let used = {}; // { chatId: {login, pass} }

// ==== START MENU ====
bot.onText(/\/start/, msg => {
    const chatId = msg.chat.id;

    const opts = {
        reply_markup: {
            keyboard: [
                ["📝 Send Feedback", "⚠️ Report a Problem"],
                ["🔐 Get Login", "👤 Contact Support"]
            ],
            resize_keyboard: true
        }
    };

    bot.sendMessage(
        chatId,
        "Assalomu alaykum! 👋\n\nBu — Vegas IELTS Support bot.\nQuyidagilardan birini tanlang:",
        opts
    );
});

// ==== FEEDBACK ====
bot.onText(/Send Feedback/, msg => {
    bot.sendMessage(msg.chat.id, "📝 Fikringizni yozib yuboring:");
    used[msg.chat.id + "_mode"] = "feedback";
});

// ==== PROBLEM REPORT ====
bot.onText(/Report a Problem/, msg => {
    bot.sendMessage(msg.chat.id, "⚠️ Qanday nosozlik bo‘ldi? Yozib yuboring:");
    used[msg.chat.id + "_mode"] = "problem";
});

// ==== SUPPORT ====
bot.onText(/Contact Support/, msg => {
    bot.sendMessage(msg.chat.id, "👤 Savolingizni yozing. Sizga javob beramiz.");
    used[msg.chat.id + "_mode"] = "support";
});

// ==== LOGIN DISTRIBUTION ====
bot.onText(/Get Login/, msg => {
    const chatId = msg.chat.id;

    // oldin olgan bo‘lsa
    if (used[chatId] && used[chatId].login) {
        const c = used[chatId];
        bot.sendMessage(
            chatId,
            `🔐 Sizga berilgan login:\nLogin: ${c.login}\nParol: ${c.pass}`
        );
        return;
    }

    // login tugagan bo‘lsa
    if (credentials.length === 0) {
        bot.sendMessage(chatId, "⚠️ Loginlar tugadi.");
        bot.sendMessage(ADMIN_ID, "🚨 LOGIN TUGADI!");
        return;
    }

    // Yangi login berish
    const next = credentials.shift();
    used[chatId] = next;

    bot.sendMessage(
        chatId,
        `🔐 Sizning login-parolingiz:\nLogin: ${next.login}\nParol: ${next.pass}`
    );

    bot.sendMessage(
        ADMIN_ID,
        `📥 Yangi login berildi:\nUser: ${chatId}\nLogin: ${next.login}`
    );
});

// ==== ADMIN REPLY (admin userga javob beradi) ====
bot.onText(/\/reply (\d+) (.+)/, (msg, match) => {
    const adminId = msg.chat.id;

    if (adminId.toString() !== ADMIN_ID.toString()) {
        return bot.sendMessage(adminId, "⛔ Bu komanda faqat admin uchun!");
    }

    const userId = match[1];
    const text = match[2];

    bot.sendMessage(userId, `📩 Admin javobi:\n\n${text}`);
    bot.sendMessage(adminId, "✅ Javob yuborildi.");
});

// ==== HANDLE FEEDBACK / SUPPORT / PROBLEM ====
bot.on("message", msg => {
    const chatId = msg.chat.id;
    const mode = used[chatId + "_mode"];
    const text = msg.text;

    if (!mode) return;

    if (mode === "feedback") {
        bot.sendMessage(ADMIN_ID, `📝 FEEDBACK:\nUser: ${chatId}\n\n${text}`);
        bot.sendMessage(chatId, "Rahmat! Fikringiz yuborildi. 😊");
    }

    if (mode === "problem") {
        bot.sendMessage(ADMIN_ID, `⚠️ PROBLEM REPORT:\nUser: ${chatId}\n\n${text}`);
        bot.sendMessage(chatId, "Xabaringiz qabul qilindi. Tez orada tuzatiladi. 🙏");
    }

    if (mode === "support") {
        bot.sendMessage(ADMIN_ID, `👤 SUPPORT XABAR:\nUser: ${chatId}\n\n${text}`);
        bot.sendMessage(chatId, "Rahmat! Savolingiz yuborildi. 😊");
    }

    used[chatId + "_mode"] = null;
});
