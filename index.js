const TelegramBot = require("node-telegram-bot-api");

// ==== CONFIG (ENV) ====
const TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;
const PAY_CARD = process.env.PAY_CARD;
const PAY_NAME = process.env.PAY_NAME;
const PAY_PRICE = process.env.PAY_PRICE;

if (!TOKEN || !ADMIN_ID) {
  console.error("❌ BOT_TOKEN yoki ADMIN_ID yo‘q.");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

// ==== STATE ====
const usedLogins = {}; // { userId: { login, pass } }
const modeMap = {};    // { userId: "feedback" | "problem" | "support" | "pay_name" | "pay_check" }
const tempData = {};   // { userId: { fullName: ... } }

// ==== START MENU ====
bot.onText(/\/start/, msg => {
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
    "Assalomu alaykum! 👋\nBu — Vegas IELTS rasmiy support bot.\nQuyidagilardan birini tanlang:",
    {
      reply_markup: {
        keyboard: [
          ["📝 Send Feedback", "⚠️ Report a Problem"],
          ["🔐 Get Login", "👤 Contact Support"],
          ["💳 To'lov ma'lumoti", "📸 To'lov chekini yuborish"]
        ],
        resize_keyboard: true
      }
    }
  );
});

// ==== TO‘LOV MA’LUMOTI ====
bot.onText(/To'lov ma'lumoti/, msg => {
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
    `💳 TO'LOV MA'LUMOTI:\n\n` +
    `Karta: ${PAY_CARD || "Karta kiritilmagan"}\n` +
    `Ism-familiya: ${PAY_NAME || "Kiritilmagan"}\n` +
    `Narx: ${PAY_PRICE || "Kiritilmagan"}\n\n` +
    `To‘lov qilganingizdan so‘ng 📸 chekingizni botga yuboring.`
  );
});

// ==== LOGIN SO'ROVI (avtomatik berilmaydi) ====
bot.onText(/Get Login/, msg => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || "Foydalanuvchi";

  if (usedLogins[chatId]) {
    const l = usedLogins[chatId];
    bot.sendMessage(
      chatId,
      `🔐 Sizga avval berilgan login:\nLogin: ${l.login}\nParol: ${l.pass}`
    );
    return;
  }

  bot.sendMessage(
    chatId,
    "⏳ Login so‘rovingiz qabul qilindi.\nAdmin tomonidan tekshirilyapti."
  );

  bot.sendMessage(
    ADMIN_ID,
    `📥 YANGI LOGIN SO‘ROVI:\nUser ID: ${chatId}\nIsmi: ${name}\n\n` +
    `Agar to‘lov tasdiqlangan bo‘lsa, login ber:\n` +
    `👉 /give ${chatId} LOGIN PAROL`
  );
});

// ==== TO'LOV CHEK TUGMASI ====
bot.onText(/To'lov chekini yuborish/, msg => {
  const chatId = msg.chat.id;

  tempData[chatId] = {};
  modeMap[chatId] = "pay_name";

  bot.sendMessage(chatId, "Iltimos, to‘liq ism va familiyangizni yozing:");
});

// ==== ADMIN LOGIN BERISH ====
// Format: /give USERID LOGIN PAROL
bot.onText(/^\/give (\d+) (\S+) (\S+)/, (msg, match) => {
  const adminId = msg.chat.id;

  if (adminId.toString() !== ADMIN_ID.toString()) {
    return bot.sendMessage(adminId, "⛔ Faqat admin ishlatishi mumkin!");
  }

  const userId = match[1];
  const login = match[2];
  const pass = match[3];

  usedLogins[userId] = { login, pass };

  bot.sendMessage(
    userId,
    `🔐 Login berildi!\nLogin: ${login}\nParol: ${pass}`
  );

  bot.sendMessage(
    ADMIN_ID,
    `✅ Login foydalanuvchiga yuborildi.\nUser ID: ${userId}`
  );
});

// ==== ADMIN REPLY ====
// Format: /reply USERID Matn
bot.onText(/^\/reply (\d+) ([\s\S]+)/, (msg, match) => {
  const adminId = msg.chat.id;

  if (adminId.toString() !== ADMIN_ID.toString()) {
    return bot.sendMessage(adminId, "⛔ Faqat admin ishlatishi mumkin!");
  }

  const userId = match[1];
  const text = match[2];

  bot.sendMessage(userId, `📩 Admin javobi:\n${text}`);
  bot.sendMessage(adminId, "✅ Javob yuborildi.");
});

// ==== GENERAL TEXT HANDLER ====
bot.on("message", msg => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith("/")) return;

  const mode = modeMap[chatId];

  if (!mode) return;

  // === PAYMENT NAME ===
  if (mode === "pay_name") {
    tempData[chatId].fullName = text;
    modeMap[chatId] = "pay_check";

    bot.sendMessage(
      chatId,
      "Rahmat! Endi to‘lov chekini 📸 rasm qilib yuboring."
    );
    return;
  }

  // === FEEDBACK ===
  if (mode === "feedback") {
    bot.sendMessage(ADMIN_ID, `📝 FEEDBACK:\nUser: ${chatId}\n${text}`);
    bot.sendMessage(chatId, "Rahmat! Fikringiz yuborildi 😊");
    modeMap[chatId] = null;
    return;
  }

  // === PROBLEM ===
  if (mode === "problem") {
    bot.sendMessage(ADMIN_ID, `⚠️ PROBLEM:\nUser: ${chatId}\n${text}`);
    bot.sendMessage(chatId, "Qabul qilindi 🙏");
    modeMap[chatId] = null;
    return;
  }

  // === SUPPORT ===
  if (mode === "support") {
    bot.sendMessage(ADMIN_ID, `👤 SUPPORT:\nUser: ${chatId}\n${text}`);
    bot.sendMessage(chatId, "Savolingiz yuborildi 😊");
    modeMap[chatId] = null;
    return;
  }
});

// ==== PHOTO HANDLER (CHEK) ====
bot.on("photo", async msg => {
  const chatId = msg.chat.id;
  const mode = modeMap[chatId];

  if (mode !== "pay_check") return;

  const fullName = tempData[chatId]?.fullName || "Noma’lum";
  const photos = msg.photo;
  const fileId = photos[photos.length - 1].file_id;

  await bot.sendMessage(
    ADMIN_ID,
    `💳 TO‘LOV CHEK KELDI:\nUser ID: ${chatId}\nIsm-fam: ${fullName}`
  );

  await bot.sendPhoto(ADMIN_ID, fileId);

  await bot.sendMessage(
    chatId,
    "Rahmat! Chekingiz admin tomonidan tekshiriladi ⏳"
  );

  modeMap[chatId] = null;
});
