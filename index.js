const TelegramBot = require("node-telegram-bot-api");

// ==== CONFIG ====
const TOKEN = process.env.BOT_TOKEN;     // Render/Railway Environment Variables
const ADMIN_ID = process.env.ADMIN_ID;   // Your Telegram ID
const bot = new TelegramBot(TOKEN, { polling: true });

// ==== LOGIN-PAROL LIST ====
let credentials = [
  { login: "user001", pass: "pass001" },
  { login: "user002", pass: "pass002" },
  { login: "user003", pass: "pass003" }
  // Keyin o'zing qo'shib borasan
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
    "Assalomu alaykum! 👋\n\nBu — Vegas IELTS Support & Feedback bot.\nQuyidagilardan birini tanlang:",
    opts
  );
});

// ==== FEEDBACK ====
bot.onText(/Send Feedback/, msg => {
  bot.sendMessage(msg.chat.id, "📝 Fikringizni yozib yuboring:");
  used[msg.chat.id + "_mode"] = "feedback";
});

// ==== PROBLEM ====
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

  if (used[chatId]) {
    const c = used[chatId];
    bot.sendMessage(chatId, `🔐 Sizga berilgan login:\nLogin: ${c.login}\nParol: ${c.pass}`);
    return;
  }

  if (credentials.length === 0) {
    bot.sendMessage(chatId, "⚠️ Loginlar tugadi.");
    return;
  }

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

// ==== HANDLE FEEDBACK/SUPPORT/PROBLEM ====
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
    bot.sendMessage(chatId, "Xabaringiz qabul qilindi. Tuzatamiz. 🙏");
  }

  if (mode === "support") {
    bot.sendMessage(ADMIN_ID, `👤 SUPPORT:\nUser: ${chatId}\n\n${text}`);
    bot.sendMessage(chatId, "Savolingiz yuborildi. Javob beramiz. 😊");
  }

  used[chatId + "_mode"] = null;
});
