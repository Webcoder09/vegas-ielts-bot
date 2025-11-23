const TelegramBot = require("node-telegram-bot-api");

// ==== CONFIG (ENV) ====
const TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;
const PAY_CARD = process.env.PAY_CARD;
const PAY_NAME = process.env.PAY_NAME;
const PAY_PRICE = process.env.PAY_PRICE;

if (!TOKEN || !ADMIN_ID) {
  console.error("❌ BOT_TOKEN yoki ADMIN_ID yo‘q. Env variables ni tekshiring.");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

// ==== STATE ====
const usedLogins = {}; // { userId: { login, pass } }
const modeMap = {};    // { userId: "feedback" | "problem" | "support" | "pay_name" | "pay_check" }
const tempData = {};   // { userId: { fullName: "..." } }

// ==== /start ====
bot.onText(/\/start/, msg => {
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
    "Assalomu alaykum! 👋\nBu — Vegas IELTS rasmiy support bot.\nQuyidagilardan birini tanlang:",
    {
      reply_markup: {
        keyboard: [
          ["📝 Send Feedback", "⚠️ Report a Problem"],
          ["🔐 Get Login", "👤 Contact Support"]
        ],
        resize_keyboard: true
      }
    }
  );
});

// ==== LOGIN SO'ROVI (avtomatik login bermaydi) ====
bot.onText(/Get Login/, msg => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || "Foydalanuvchi";

  // Agar oldin login berilgan bo'lsa — eski loginni ko'rsatamiz
  if (usedLogins[chatId]) {
    const l = usedLogins[chatId];
    bot.sendMessage(
      chatId,
      "🔐 Sizga avval berilgan login mavjud:\n" +
      `Login: ${l.login}\nParol: ${l.pass}`
    );
    return;
  }

  // 1) To‘lov ma’lumoti
  bot.sendMessage(
    chatId,
    "💳 TO'LOV MA'LUMOTI:\n\n" +
    `Karta: ${PAY_CARD || "Karta kiritilmagan"}\n` +
    `Ism-familiya: ${PAY_NAME || "Kiritilmagan"}\n` +
    `Narx: ${PAY_PRICE || "Kiritilmagan"}\n`
  );

  // 2) Ogohlantirish va keyingi qadamlar
  bot.sendMessage(
    chatId,
    "⚠️ *Cheksiz to‘lov qabul qilinmaydi!*\n" +
    "Iltimos, to‘lov qilganingizdan so‘ng:\n" +
    "1️⃣ *To‘liq ism-familiyangizni yozing*\n" +
    "2️⃣ *Keyin to‘lov chekini rasm (screenshot) qilib yuboring*\n\n" +
    "⏳ Login berilishi uchun to‘lov admin tomonidan tekshiriladi.",
    { parse_mode: "Markdown" }
  );

  // 3) Admin uchun signal
  bot.sendMessage(
    ADMIN_ID,
    "📥 YANGI LOGIN SO‘ROVI:\n" +
    `User ID: ${chatId}\n` +
    `Ismi (Telegram): ${name}\n\n` +
    "Foydalanuvchi login so‘radi. To‘lovni chek orqali tekshiring.\n\n" +
    `Tasdiqlansa: /give ${chatId} LOGIN PAROL`
  );

  // 4) Endi bu userdan keyingi matnni ism-familiya deb qabul qilamiz
  tempData[chatId] = {};
  modeMap[chatId] = "pay_name";
});

// ==== ADMIN LOGIN BERISH ====
// format: /give USERID LOGIN PAROL
bot.onText(/^\/give (\d+) (\S+) (\S+)/, (msg, match) => {
  const adminId = msg.chat.id;

  if (adminId.toString() !== ADMIN_ID.toString()) {
    return bot.sendMessage(adminId, "⛔ Bu komanda faqat admin uchun!");
  }

  const userId = match[1];
  const login = match[2];
  const pass = match[3];

  usedLogins[userId] = { login, pass };

  bot.sendMessage(
    userId,
    "🔐 Login berildi!\n" +
    `Login: ${login}\nParol: ${pass}`
  );

  bot.sendMessage(
    ADMIN_ID,
    "✅ Login foydalanuvchiga yuborildi.\n" +
    `User ID: ${userId}`
  );
});

// ==== ADMIN REPLY ====
// format: /reply USERID Javob matni
bot.onText(/^\/reply (\d+) ([\s\S]+)/, (msg, match) => {
  const adminId = msg.chat.id;

  if (adminId.toString() !== ADMIN_ID.toString()) {
    return bot.sendMessage(adminId, "⛔ Bu komanda faqat admin uchun!");
  }

  const userId = match[1];
  const text = match[2];

  bot.sendMessage(userId, `📩 Admin javobi:\n\n${text}`);
  bot.sendMessage(adminId, "✅ Javob yuborildi.");
});

// ==== FEEDBACK ====
bot.onText(/Send Feedback/, msg => {
  const chatId = msg.chat.id;
  modeMap[chatId] = "feedback";
  bot.sendMessage(chatId, "📝 Fikringizni yozib yuboring:");
});

// ==== PROBLEM REPORT ====
bot.onText(/Report a Problem/, msg => {
  const chatId = msg.chat.id;
  modeMap[chatId] = "problem";
  bot.sendMessage(chatId, "⚠️ Qanday nosozlik bo‘ldi? Batafsil yozing:");
});

// ==== SUPPORT ====
bot.onText(/Contact Support/, msg => {
  const chatId = msg.chat.id;
  modeMap[chatId] = "support";
  bot.sendMessage(chatId, "👤 Savolingizni yozing. Sizga javob beramiz.");
});

// ==== MATN XABARLAR (mode bo‘yicha) ====
bot.on("message", msg => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // komandalar ( /start, /give, /reply ) bu yerda qayta ishlanmaydi
  if (!text || text.startsWith("/")) return;

  const mode = modeMap[chatId];
  if (!mode) return;

  // 1) To'lov uchun ism-familiya (Get Login dan keyingi qadam)
  if (mode === "pay_name") {
    tempData[chatId] = tempData[chatId] || {};
    tempData[chatId].fullName = text;

    modeMap[chatId] = "pay_check";

    bot.sendMessage(
      chatId,
      "Rahmat! ✅ Endi to‘lov chekini 📸 rasm qilib yuboring."
    );
    return;
  }

  // 2) Feedback
  if (mode === "feedback") {
    bot.sendMessage(
      ADMIN_ID,
      "📝 FEEDBACK:\n" +
      `User ID: ${chatId}\n\n` +
      text
    );
    bot.sendMessage(chatId, "Rahmat! Fikringiz yuborildi. 😊");
    modeMap[chatId] = null;
    return;
  }

  // 3) Problem
  if (mode === "problem") {
    bot.sendMessage(
      ADMIN_ID,
      "⚠️ PROBLEM REPORT:\n" +
      `User ID: ${chatId}\n\n` +
      text
    );
    bot.sendMessage(
      chatId,
      "Xabaringiz qabul qilindi. Nosozlik tez orada ko‘rib chiqiladi. 🙏"
    );
    modeMap[chatId] = null;
    return;
  }

  // 4) Support
  if (mode === "support") {
    bot.sendMessage(
      ADMIN_ID,
      "👤 SUPPORT XABAR:\n" +
      `User ID: ${chatId}\n\n` +
      text
    );
    bot.sendMessage(
      chatId,
      "Rahmat! Savolingiz yuborildi. Javob tez orada beriladi. 😊"
    );
    modeMap[chatId] = null;
    return;
  }
});

// ==== PHOTO HANDLER (CHEK RASMI) ====
bot.on("photo", async msg => {
  const chatId = msg.chat.id;
  const mode = modeMap[chatId];

  if (mode !== "pay_check") return;

  const fullName =
    (tempData[chatId] && tempData[chatId].fullName) || "Noma’lum";

  const photos = msg.photo;
  const fileId = photos[photos.length - 1].file_id;

  await bot.sendMessage(
    ADMIN_ID,
    "💳 TO‘LOV CHEK KELDI:\n" +
    `User ID: ${chatId}\n` +
    `Ism-familiyasi: ${fullName}`
  );

  await bot.sendPhoto(ADMIN_ID, fileId);

  await bot.sendMessage(
    chatId,
    "Rahmat! ✅ Chekingiz admin tomonidan tekshiriladi.\n" +
    "Tasdiqlangandan so‘ng login-parol yuboriladi."
  );

  modeMap[chatId] = null;
  delete tempData[chatId];
});
