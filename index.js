const TelegramBot = require("node-telegram-bot-api");

// ==== CONFIG (ENV) ====
const TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

if (!TOKEN || !ADMIN_ID) {
  console.error("❌ BOT_TOKEN yoki ADMIN_ID yo‘q. Env variables ni tekshiring.");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

// ==== STATE ====
const usedLogins = {}; // { userId: { login, pass } }
const modeMap = {};    // { userId: "feedback" | "problem" | "support" | "pay_check" | "card_holder" }
const tempData = {};   // { userId: { cardHolder: "...", fileId: "..." } }

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

  // To'lov ma'lumoti
  bot.sendMessage(
    chatId,
    "💳 TO'LOV MA'LUMOTI:\n\n" +
    `Karta: 9860 0366 2880 7194\n` +
    `Card-holder: Buxoriddinov Muhammad\n` +
    `Narx: 1 oy = 2,99$ (36 000 so'm)\n`
  );

  // Ogohlantirish va qadamlar
  bot.sendMessage(
    chatId,
    "⚠️ *Cheksiz to‘lov qabul qilinmaydi!*\n\n" +
    "1️⃣ Avval *to‘lov chekini (screenshot)* rasm qilib yuboring.\n" +
    "2️⃣ So‘ngra *card-holder* (karta egasi ismi-familyasi) ni yozing.\n\n" +
    "⏳ Login berilishi uchun to‘lov admin tomonidan tekshiriladi.",
    { parse_mode: "Markdown" }
  );

  // Admin uchun signal
  bot.sendMessage(
    ADMIN_ID,
    "📥 YANGI LOGIN SO‘ROVI:\n" +
    `User ID: ${chatId}\n` +
    `Ismi (Telegram): ${name}\n\n` +
    "Foydalanuvchi login so‘radi. To‘lovni chek va ism-familiya bo‘yicha tekshiring.\n\n" +
    `Tasdiqlansa: /give ${chatId} LOGIN PAROL`
  );

  // Endi birinchi navbatda chek kutamiz
  tempData[chatId] = {};
  modeMap[chatId] = "pay_check";
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

  // komandalar bu yerda qayta ishlanmaydi
  if (!text || text.startsWith("/")) return;

  const mode = modeMap[chatId];
  if (!mode) return;

  // 1) Card-holder (chekdan keyin)
  if (mode === "card_holder") {
    tempData[chatId] = tempData[chatId] || {};
    tempData[chatId].cardHolder = text;

    const cardHolder = tempData[chatId].cardHolder || "Noma'lum card-holder";
    const fileId = tempData[chatId].fileId;

    // Adminga to'lov ma'lumoti
    bot.sendMessage(
      ADMIN_ID,
      "💳 TO‘LOV MA'LUMOTI KELDI:\n" +
      `User ID: ${chatId}\n` +
      `Card-holder: ${cardHolder}`
    );

    // Agar chek rasm bor bo'lsa — yuboramiz
    if (fileId) {
      bot.sendPhoto(ADMIN_ID, fileId);
    }

    bot.sendMessage(
      chatId,
      "Rahmat! ✅ Ma’lumotlaringiz adminga yuborildi.\n" +
      "To‘lov tasdiqlangach, login-parol beriladi."
    );

    modeMap[chatId] = null;
    delete tempData[chatId];
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

// ==== PHOTO HANDLER (BIRINCHI CHEK, KEYIN CARD-HOLDER) ====
bot.on("photo", async msg => {
  const chatId = msg.chat.id;
  const mode = modeMap[chatId];

  // faqat pay_check holatida chekni qabul qilamiz
  if (mode !== "pay_check") return;

  const photos = msg.photo;
  const fileId = photos[photos.length - 1].file_id;

  tempData[chatId] = tempData[chatId] || {};
  tempData[chatId].fileId = fileId;

  await bot.sendMessage(
    chatId,
    "Chek qabul qilindi ✅\nEndi iltimos *ism-familiya* (karta egasi ismi-familyasi) ni yozing.",
    { parse_mode: "Markdown" }
  );

  // endi card-holderni kutamiz
  modeMap[chatId] = "card_holder";
});




