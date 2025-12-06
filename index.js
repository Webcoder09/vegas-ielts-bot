const TelegramBot = require("node-telegram-bot-api");

// ==== CONFIG (ENV) ====
const TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID; // bitta admin ID (string ko'rinishida bo'ladi)

if (!TOKEN || !ADMIN_ID) {
  console.error("❌ BOT_TOKEN yoki ADMIN_ID yo‘q. Env variables ni tekshiring.");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

// ==== STATE ====

// Loginlar (bitta userga bitta login) – key: userId (string)
const usedLogins = {}; // { userId: { login, pass } }

// Rejimlar – key: userId (string)
const modeMap = {};    // { userId: "feedback" | "problem" | "support" | "pay_check" | "card_holder" }

// Vaqtincha ma'lumot – chek/card-holder/orderId uchun
const tempData = {};   // { userId: { cardHolder, fileId, orderId } }

// Botni ishlatgan userlar ro‘yxati
const users = new Set(); // masalan: "123456789"

// Foydalanuvchi haqida ma'lumot (ism, username)
const userInfo = {}; // { userId: { name, username } }

// To‘lov ORDER tizimi
// orderId: "VGS-0001" kabi
const orders = {}; // { orderId: { orderId, userId, status, cardHolder, checkFileId, createdAt } }
let nextOrderNum = 1;

// Support TICKET tizimi
// ticketId: "T-0001"
const tickets = {}; // { ticketId: { ticketId, userId, type, text, status, createdAt } }
let nextTicketNum = 1;


// ==== HELPERS ====

// userId ni stringga aylantirish
function getKey(chatId) {
  return chatId.toString();
}

// User haqida ma'lumotni eslab qolish
function rememberUser(msg) {
  const key = getKey(msg.chat.id);
  users.add(key);
  userInfo[key] = {
    name: msg.from.first_name || "",
    username: msg.from.username || ""
  };
}

// Order ID generatsiya
function generateOrderId() {
  const id = "VGS-" + String(nextOrderNum).padStart(4, "0");
  nextOrderNum++;
  return id;
}

// Ticket ID generatsiya
function generateTicketId() {
  const id = "T-" + String(nextTicketNum).padStart(4, "0");
  nextTicketNum++;
  return id;
}

// Admin tekshiruvchi
function isAdmin(id) {
  return id.toString() === ADMIN_ID.toString();
}

// Admin uchun login berish funksiyasi (bir nechta joyda ishlatamiz)
function giveLoginToUser(userId, login, pass, orderId = null) {
  usedLogins[userId] = { login, pass };

  const info = userInfo[userId] || {};
  const name = info.name ? `(${info.name})` : "";

  let text =
    "🔐 Login berildi!\n\n" +
    `Login: ${login}\n` +
    `Parol: ${pass}\n`;

  if (orderId) {
    text += `Order ID: ${orderId}\n`;
  }

  bot.sendMessage(
    userId,
    text
  );

  bot.sendMessage(
    ADMIN_ID,
    "✅ Login foydalanuvchiga yuborildi.\n" +
    `User ID: ${userId} ${name}` +
    (orderId ? `\nOrder ID: ${orderId}` : "")
  );
}


// ==== /start ====
bot.onText(/\/start/, msg => {
  const chatId = msg.chat.id;
  const key = getKey(chatId);

  rememberUser(msg);

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

  modeMap[key] = null;
  delete tempData[key];
});


// ==== /help ====
bot.onText(/\/help/, msg => {
  const chatId = msg.chat.id;
  rememberUser(msg);

  bot.sendMessage(
    chatId,
    "Yordam bo‘limi 📚\n\n" +
    "🔐 Get Login – to‘lov qilib platforma loginini olish\n" +
    "📝 Send Feedback – kurs bo‘yicha fikr-mulohazangizni yozish\n" +
    "⚠️ Report a Problem – texnik nosozliklarni yozish\n" +
    "👤 Contact Support – savollar uchun supportga murojaat\n\n" +
    "Istalgan payt /cancel yozib, jarayondan chiqishingiz mumkin."
  );
});


// ==== /cancel ====
bot.onText(/\/cancel/, msg => {
  const chatId = msg.chat.id;
  const key = getKey(chatId);
  rememberUser(msg);

  modeMap[key] = null;
  delete tempData[key];

  bot.sendMessage(
    chatId,
    "✅ Jarayon bekor qilindi. Asosiy menyuga qaytdingiz.",
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


// ==== LOGIN SO'ROVI (ORDER bilan) ====
bot.onText(/Get Login/, msg => {
  const chatId = msg.chat.id;
  const key = getKey(chatId);
  const name = msg.from.first_name || "Foydalanuvchi";

  rememberUser(msg);

  // Agar oldin login berilgan bo'lsa — eski loginni ko'rsatamiz
  if (usedLogins[key]) {
    const l = usedLogins[key];
    bot.sendMessage(
      chatId,
      "🔐 Sizga avval berilgan login mavjud:\n\n" +
      `Login: ${l.login}\n` +
      `Parol: ${l.pass}`
    );
    return;
  }

  // Order yaratamiz
  const orderId = generateOrderId();
  orders[orderId] = {
    orderId,
    userId: key,
    status: "pending", // pending | approved | rejected
    cardHolder: null,
    checkFileId: null,
    createdAt: Date.now()
  };

  // tempData ichida ham saqlaymiz (chek/card-holder flow uchun)
  tempData[key] = { orderId };

  // To'lov ma'lumoti
  bot.sendMessage(
    chatId,
    "💳 TO'LOV MA'LUMOTI:\n\n" +
    `Karta: 9860 0366 2880 7194\n` +
    `Card-holder: Buxoriddinov Muhammad\n` +
    `Narx: 1 oy = 2,99$ (36 000 so'm)\n\n` +
    `Sizning to‘lov ID'ingiz: *${orderId}*`,
    { parse_mode: "Markdown" }
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
    "📥 YANGI LOGIN/TOLÒV SO‘ROVI:\n" +
    `Order ID: ${orderId}\n` +
    `User ID: ${chatId}\n` +
    `Ismi (Telegram): ${name}\n\n` +
    "Foydalanuvchi login so‘radi. Avval chek va ism-familiyani kuting.\n\n" +
    `Ma'lumot: /payinfo ${orderId}\n` +
    `Tasdiqlash: /approve ${orderId} LOGIN PAROL\n` +
    `Rad etish: /reject ${orderId} SABAB`
  );

  // Endi chek kutamiz
  modeMap[key] = "pay_check";
});


// ==== ADMIN LOGIN BERISH (order bilan bog'liq bo'lmagan holda) ====
// format: /give USERID LOGIN PAROL
bot.onText(/^\/give (\d+) (\S+) (\S+)/, (msg, match) => {
  const adminId = msg.chat.id;
  if (!isAdmin(adminId)) {
    return bot.sendMessage(adminId, "⛔ Bu komanda faqat admin uchun!");
  }

  const userId = match[1]; // string
  const login = match[2];
  const pass = match[3];

  giveLoginToUser(userId, login, pass, null);
});


// ==== ADMIN TOLÒV MA'LUMOTINI KO‘RISH ====
// /payinfo ORDERID
bot.onText(/^\/payinfo (\S+)/, (msg, match) => {
  const adminId = msg.chat.id;
  if (!isAdmin(adminId)) {
    return bot.sendMessage(adminId, "⛔ Bu komanda faqat admin uchun!");
  }

  const orderId = match[1];
  const order = orders[orderId];

  if (!order) {
    return bot.sendMessage(adminId, "❓ Bunday order topilmadi.");
  }

  const info = userInfo[order.userId] || {};
  const name = info.name || "Noma'lum";
  const username = info.username ? `@${info.username}` : "yo‘q";

  const createdAt = new Date(order.createdAt).toLocaleString("uz-UZ");

  let text =
    `💳 ORDER MA'LUMOTI\n\n` +
    `Order ID: ${order.orderId}\n` +
    `User ID: ${order.userId}\n` +
    `Ismi: ${name}\n` +
    `Username: ${username}\n` +
    `Status: ${order.status}\n` +
    `Card-holder: ${order.cardHolder || "hali kiritilmagan"}\n` +
    `Yaratilgan: ${createdAt}\n`;

  bot.sendMessage(adminId, text);

  if (order.checkFileId) {
    bot.sendPhoto(adminId, order.checkFileId, { caption: `Order ID: ${order.orderId} chek rasmi` });
  }
});


// ==== ADMIN APPROVE ====
// /approve ORDERID LOGIN PAROL
bot.onText(/^\/approve (\S+) (\S+) (\S+)/, (msg, match) => {
  const adminId = msg.chat.id;
  if (!isAdmin(adminId)) {
    return bot.sendMessage(adminId, "⛔ Bu komanda faqat admin uchun!");
  }

  const orderId = match[1];
  const login = match[2];
  const pass = match[3];

  const order = orders[orderId];
  if (!order) {
    return bot.sendMessage(adminId, "❓ Bunday order topilmadi.");
  }

  order.status = "approved";

  giveLoginToUser(order.userId, login, pass, orderId);
});

// ==== ADMIN REJECT ====
// /reject ORDERID SABAB...
bot.onText(/^\/reject (\S+) ([\s\S]+)/, (msg, match) => {
  const adminId = msg.chat.id;
  if (!isAdmin(adminId)) {
    return bot.sendMessage(adminId, "⛔ Bu komanda faqat admin uchun!");
  }

  const orderId = match[1];
  const reason = match[2];

  const order = orders[orderId];
  if (!order) {
    return bot.sendMessage(adminId, "❓ Bunday order topilmadi.");
  }

  order.status = "rejected";

  bot.sendMessage(
    order.userId,
    "❌ Sizning to‘lov so‘rovingiz rad etildi.\n" +
    `Order ID: ${orderId}\n` +
    `Sabab: ${reason}`
  );

  bot.sendMessage(
    adminId,
    `Order ${orderId} rad etildi.`
  );
});


// ==== ADMIN REPLY (ticketdan tashqari oddiy javob) ====
// format: /reply USERID Javob matni
bot.onText(/^\/reply (\d+) ([\s\S]+)/, (msg, match) => {
  const adminId = msg.chat.id;
  if (!isAdmin(adminId)) {
    return bot.sendMessage(adminId, "⛔ Bu komanda faqat admin uchun!");
  }

  const userId = match[1];
  const text = match[2];

  bot.sendMessage(userId, `📩 Admin javobi:\n\n${text}`);
  bot.sendMessage(adminId, "✅ Javob yuborildi.");
});


// ==== ADMIN STATS ====
// /stats – umumiy statistikalar
bot.onText(/\/stats/, msg => {
  const adminId = msg.chat.id;
  if (!isAdmin(adminId)) {
    return bot.sendMessage(adminId, "⛔ Bu komanda faqat admin uchun!");
  }

  const totalUsers = users.size;
  const totalLogins = Object.keys(usedLogins).length;
  const totalOrders = Object.keys(orders).length;
  const totalTickets = Object.keys(tickets).length;

  let pending = 0, approved = 0, rejected = 0;
  for (const o of Object.values(orders)) {
    if (o.status === "pending") pending++;
    if (o.status === "approved") approved++;
    if (o.status === "rejected") rejected++;
  }

  let openTickets = 0, answeredTickets = 0;
  for (const t of Object.values(tickets)) {
    if (t.status === "open") openTickets++;
    if (t.status === "answered") answeredTickets++;
  }

  bot.sendMessage(
    adminId,
    "📊 Vegas Bot Statistika:\n\n" +
    `👥 Ro'yxatdagi userlar: ${totalUsers} ta\n` +
    `🔐 Login berilgan userlar: ${totalLogins} ta\n\n` +
    `💳 Jami orderlar: ${totalOrders} ta\n` +
    `   - pending: ${pending}\n` +
    `   - approved: ${approved}\n` +
    `   - rejected: ${rejected}\n\n` +
    `🎫 Jami ticketlar: ${totalTickets} ta\n` +
    `   - open: ${openTickets}\n` +
    `   - answered: ${answeredTickets}\n`
  );
});

// ==== ADMIN – LOGINLAR RO‘YXATI ====
// /logins – kimga qaysi login/parol berilgan
bot.onText(/\/logins/, msg => {
  const adminId = msg.chat.id;
  if (!isAdmin(adminId)) {
    return bot.sendMessage(adminId, "⛔ Bu komanda faqat admin uchun!");
  }

  const keys = Object.keys(usedLogins);
  if (keys.length === 0) {
    return bot.sendMessage(adminId, "Hali hech kimga login berilmagan.");
  }

  let text = "🔐 Loginlar ro‘yxati:\n\n";
  for (const userId of keys) {
    const data = usedLogins[userId];
    const info = userInfo[userId] || {};
    const name = info.name || "Noma'lum";
    const username = info.username ? `@${info.username}` : "username yo‘q";

    text +=
      `User ID: ${userId} | ${name} | ${username}\n` +
      `   Login: ${data.login} | Parol: ${data.pass}\n\n`;
  }

  bot.sendMessage(adminId, text);
});


// ==== FEEDBACK (ticket sifatida) ====
bot.onText(/Send Feedback/, msg => {
  const chatId = msg.chat.id;
  const key = getKey(chatId);
  rememberUser(msg);

  modeMap[key] = "feedback";
  bot.sendMessage(chatId, "📝 Fikringizni yozib yuboring:");
});


// ==== PROBLEM REPORT (ticket) ====
bot.onText(/Report a Problem/, msg => {
  const chatId = msg.chat.id;
  const key = getKey(chatId);
  rememberUser(msg);

  modeMap[key] = "problem";
  bot.sendMessage(chatId, "⚠️ Qanday nosozlik bo‘ldi? Batafsil yozing:");
});


// ==== SUPPORT (ticket) ====
bot.onText(/Contact Support/, msg => {
  const chatId = msg.chat.id;
  const key = getKey(chatId);
  rememberUser(msg);

  modeMap[key] = "support";
  bot.sendMessage(chatId, "👤 Savolingizni yozing. Sizga javob beramiz.");
});


// ==== ADMIN – TICKETGA JAVOB ====
// /answer T-0001 javob matni...
bot.onText(/^\/answer (\S+) ([\s\S]+)/, (msg, match) => {
  const adminId = msg.chat.id;
  if (!isAdmin(adminId)) {
    return bot.sendMessage(adminId, "⛔ Bu komanda faqat admin uchun!");
  }

  const ticketId = match[1];
  const answer = match[2];

  const ticket = tickets[ticketId];
  if (!ticket) {
    return bot.sendMessage(adminId, "❓ Bunday ticket topilmadi.");
  }

  ticket.status = "answered";

  bot.sendMessage(
    ticket.userId,
    `📩 Sizning ticketingiz (${ticketId}) bo‘yicha javob:\n\n${answer}`
  );

  bot.sendMessage(
    adminId,
    `✅ Ticket ${ticketId} uchun javob yuborildi.`
  );
});


// ==== MATN XABARLAR (mode bo‘yicha) ====
// bu yerda card-holder, feedback, problem, support TICKET sifatida yaratiladi
bot.on("message", msg => {
  const chatId = msg.chat.id;
  const key = getKey(chatId);
  const text = msg.text;

  rememberUser(msg);

  // komandalar bu yerda qayta ishlanmaydi
  if (!text || text.startsWith("/")) return;

  const mode = modeMap[key];
  if (!mode) return;

  // 1) Card-holder (chekdan keyin)
  if (mode === "card_holder") {
    tempData[key] = tempData[key] || {};
    tempData[key].cardHolder = text;

    const orderId = tempData[key].orderId;
    const cardHolder = tempData[key].cardHolder || "Noma'lum card-holder";
    const fileId = tempData[key].fileId;
    const order = orders[orderId];

    if (order) {
      order.cardHolder = cardHolder;
    }

    // Adminga to'lov ma'lumoti
    bot.sendMessage(
      ADMIN_ID,
      "💳 TO‘LOV MA'LUMOTI KELDI:\n" +
      `Order ID: ${orderId}\n` +
      `User ID: ${chatId}\n` +
      `Card-holder: ${cardHolder}\n\n` +
      `Ma'lumot: /payinfo ${orderId}\n` +
      `Tasdiqlash: /approve ${orderId} LOGIN PAROL\n` +
      `Rad etish: /reject ${orderId} SABAB`
    );

    // Agar chek rasm bor bo'lsa — yuboramiz
    if (fileId) {
      bot.sendPhoto(ADMIN_ID, fileId, { caption: `Order ID: ${orderId} chek rasmi` });
      if (order) {
        order.checkFileId = fileId;
      }
    }

    bot.sendMessage(
      chatId,
      "Rahmat! ✅ Ma’lumotlaringiz adminga yuborildi.\n" +
      "To‘lov tasdiqlangach, login-parol beriladi."
    );

    modeMap[key] = null;
    delete tempData[key];
    return;
  }

  // 2) Feedback – TICKET sifatida
  if (mode === "feedback") {
    const ticketId = generateTicketId();
    tickets[ticketId] = {
      ticketId,
      userId: key,
      type: "feedback",
      text,
      status: "open",
      createdAt: Date.now()
    };

    bot.sendMessage(
      ADMIN_ID,
      "📝 YANGI FEEDBACK TICKET:\n" +
      `Ticket ID: ${ticketId}\n` +
      `User ID: ${chatId}\n\n` +
      `${text}\n\n` +
      `Javob berish: /answer ${ticketId} Javob matni...`
    );

    bot.sendMessage(
      chatId,
      `Rahmat! Fikringiz qabul qilindi. 😊\nTicket raqamingiz: ${ticketId}`
    );

    modeMap[key] = null;
    return;
  }

  // 3) Problem – TICKET
  if (mode === "problem") {
    const ticketId = generateTicketId();
    tickets[ticketId] = {
      ticketId,
      userId: key,
      type: "problem",
      text,
      status: "open",
      createdAt: Date.now()
    };

    bot.sendMessage(
      ADMIN_ID,
      "⚠️ YANGI PROBLEM REPORT TICKET:\n" +
      `Ticket ID: ${ticketId}\n` +
      `User ID: ${chatId}\n\n` +
      `${text}\n\n` +
      `Javob berish: /answer ${ticketId} Javob matni...`
    );

    bot.sendMessage(
      chatId,
      `Xabaringiz qabul qilindi. Nosozlik tez orada ko‘rib chiqiladi. 🙏\nTicket raqamingiz: ${ticketId}`
    );

    modeMap[key] = null;
    return;
  }

  // 4) Support – TICKET
  if (mode === "support") {
    const ticketId = generateTicketId();
    tickets[ticketId] = {
      ticketId,
      userId: key,
      type: "support",
      text,
      status: "open",
      createdAt: Date.now()
    };

    bot.sendMessage(
      ADMIN_ID,
      "👤 YANGI SUPPORT TICKET:\n" +
      `Ticket ID: ${ticketId}\n` +
      `User ID: ${chatId}\n\n` +
      `${text}\n\n` +
      `Javob berish: /answer ${ticketId} Javob matni...`
    );

    bot.sendMessage(
      chatId,
      `Rahmat! Savolingiz qabul qilindi. 😊\nTicket raqamingiz: ${ticketId}`
    );

    modeMap[key] = null;
    return;
  }
});


// ==== PHOTO HANDLER (BIRINCHI CHEK, KEYIN CARD-HOLDER) ====
bot.on("photo", async msg => {
  const chatId = msg.chat.id;
  const key = getKey(chatId);
  const mode = modeMap[key];

  rememberUser(msg);

  // faqat pay_check holatida chekni qabul qilamiz
  if (mode !== "pay_check") return;

  const photos = msg.photo;
  const fileId = photos[photos.length - 1].file_id;

  tempData[key] = tempData[key] || {};
  tempData[key].fileId = fileId;

  const orderId = tempData[key].orderId;
  if (orderId && orders[orderId]) {
    orders[orderId].checkFileId = fileId;
  }

  await bot.sendMessage(
    chatId,
    "Chek qabul qilindi ✅\nEndi iltimos *ism-familiya* (karta egasi ismi-familyasi) ni yozing.",
    { parse_mode: "Markdown" }
  );

  // endi card-holderni kutamiz
  modeMap[key] = "card_holder";
});
