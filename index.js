const TelegramBot = require("node-telegram-bot-api");

// ==== CONFIG (ENV) ====

// Railway / .env dan olamiz
const TOKEN = process.env.BOT_TOKEN;
const ADMIN_IDS = (process.env.ADMIN_IDS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

if (!TOKEN || ADMIN_IDS.length === 0) {
  console.error("❌ BOT_TOKEN yoki ADMIN_IDS yo‘q. Env variables ni tekshiring.");
  process.exit(1);
}

const MAIN_ADMIN_ID = ADMIN_IDS[0];

const bot = new TelegramBot(TOKEN, { polling: true });

// ==== STATE ====

// Loginlar – key: userId(string)
const usedLogins = {};
// { userId: { login, pass, startAt, endAt } }

// Rejimlar – key: userId(string)
const modeMap = {};
// { userId: "feedback"|"problem"|"support"|"pay_check"|"card_holder"|"admin_broadcast" }

// Vaqtincha ma'lumot – chek/card-holder/orderId uchun
const tempData = {};
// { userId: { cardHolder, fileId, orderId } }

// Botni ishlatgan userlar ro‘yxati
const users = new Set(); // "123456789"

// Foydalanuvchi haqida ma'lumot (ism, username)
const userInfo = {};
// { userId: { name, username } }

// To‘lov ORDER tizimi
// orderId: "VGS-0001"
const orders = {};
// { orderId: { orderId, userId, status, cardHolder, checkFileId, createdAt } }
let nextOrderNum = 1;

// Support TICKET tizimi
// ticketId: "T-0001"
const tickets = {};
// { ticketId: { ticketId, userId, type, text, status, createdAt } }
let nextTicketNum = 1;


// ==== HELPERS ====

function getKey(chatId) {
  return chatId.toString();
}

function rememberUser(msg) {
  const key = getKey(msg.chat.id);
  users.add(key);
  userInfo[key] = {
    name: msg.from.first_name || "",
    username: msg.from.username || ""
  };
}

function generateOrderId() {
  const id = "VGS-" + String(nextOrderNum).padStart(4, "0");
  nextOrderNum++;
  return id;
}

function generateTicketId() {
  const id = "T-" + String(nextTicketNum).padStart(4, "0");
  nextTicketNum++;
  return id;
}

function isAdmin(id) {
  return ADMIN_IDS.includes(id.toString());
}

function sendToAdmins(text, options = {}) {
  for (const adminId of ADMIN_IDS) {
    bot.sendMessage(adminId, text, options).catch(() => {});
  }
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString("uz-UZ");
}

// Admin login berishi + 1 oylik premium muddati
function giveLoginToUser(userId, login, pass, orderId = null) {
  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const startAt = now;
  const endAt = now + THIRTY_DAYS;

  usedLogins[userId] = { login, pass, startAt, endAt };

  const info = userInfo[userId] || {};
  const name = info.name ? `(${info.name})` : "";
  const startStr = formatDate(startAt);
  const endStr = formatDate(endAt);

  let text =
    "🔐 Login berildi!\n\n" +
    `Login: ${login}\n` +
    `Parol: ${pass}\n` +
    `Premium obunangiz: ${startStr} sanasidan ${endStr} sanasigacha faol.\n`;

  if (orderId) {
    text += `Order ID: ${orderId}\n`;
  }

  bot.sendMessage(userId, text).catch(() => {});

  sendToAdmins(
    "✅ Login foydalanuvchiga yuborildi.\n" +
    `User ID: ${userId} ${name}\n` +
    (orderId ? `Order ID: ${orderId}\n` : "") +
    `Premium: ${startStr} → ${endStr}`
  );
}


// ==== ADMIN YORDAMCHI FUNKSIYALAR ====

function adminStats(chatId) {
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

  let activeSubs = 0, expiredSubs = 0;
  const now = Date.now();
  for (const l of Object.values(usedLogins)) {
    if (l.endAt && l.endAt < now) expiredSubs++;
    else activeSubs++;
  }

  bot.sendMessage(
    chatId,
    "📊 Vegas Bot Statistika:\n\n" +
    `👥 Ro'yxatdagi userlar: ${totalUsers} ta\n` +
    `🔐 Login berilgan userlar: ${totalLogins} ta\n` +
    `   - Faol premium: ${activeSubs} ta\n` +
    `   - Muddati tugagan: ${expiredSubs} ta\n\n` +
    `💳 Jami orderlar: ${totalOrders} ta\n` +
    `   - pending: ${pending}\n` +
    `   - approved: ${approved}\n` +
    `   - rejected: ${rejected}\n\n` +
    `🎫 Jami ticketlar: ${totalTickets} ta\n` +
    `   - open: ${openTickets}\n` +
    `   - answered: ${answeredTickets}\n`
  );
}

function adminLogins(chatId) {
  const keys = Object.keys(usedLogins);
  if (keys.length === 0) {
    return bot.sendMessage(chatId, "Hali hech kimga login berilmagan.");
  }

  let text = "🔐 Loginlar va premium muddatlari:\n\n";
  for (const userId of keys) {
    const data = usedLogins[userId];
    const info = userInfo[userId] || {};
    const name = info.name || "Noma'lum";
    const username = info.username ? `@${info.username}` : "username yo‘q";

    const startStr = data.startAt ? formatDate(data.startAt) : "—";
    const endStr = data.endAt ? formatDate(data.endAt) : "—";

    text +=
      `User ID: ${userId} | ${name} | ${username}\n` +
      `   Login: ${data.login} | Parol: ${data.pass}\n` +
      `   Premium: ${startStr} → ${endStr}\n\n`;
  }

  bot.sendMessage(chatId, text);
}

function adminOrdersPending(chatId) {
  const pendingOrders = Object.values(orders).filter(o => o.status === "pending");
  if (pendingOrders.length === 0) {
    return bot.sendMessage(chatId, "⏳ Pending orderlar yo‘q.");
  }

  let text = "💳 Pending orderlar:\n\n";
  for (const o of pendingOrders) {
    const info = userInfo[o.userId] || {};
    const name = info.name || "Noma'lum";
    const username = info.username ? `@${info.username}` : "username yo‘q";
    text +=
      `Order ID: ${o.orderId}\n` +
      `User ID: ${o.userId} | ${name} | ${username}\n` +
      `Status: ${o.status}\n` +
      `/payinfo ${o.orderId}\n` +
      `/approve ${o.orderId} LOGIN PAROL\n` +
      `/reject ${o.orderId} SABAB\n\n`;
  }

  bot.sendMessage(chatId, text);
}

function adminTicketsOpen(chatId) {
  const openTickets = Object.values(tickets).filter(t => t.status === "open");
  if (openTickets.length === 0) {
    return bot.sendMessage(chatId, "🎫 Ochiq ticketlar yo‘q.");
  }

  let text = "🎫 Ochiq ticketlar:\n\n";
  for (const t of openTickets) {
    const info = userInfo[t.userId] || {};
    const name = info.name || "Noma'lum";
    const username = info.username ? `@${info.username}` : "username yo‘q";
    text +=
      `Ticket ID: ${t.ticketId} | Tur: ${t.type}\n` +
      `User ID: ${t.userId} | ${name} | ${username}\n` +
      `Matn: ${t.text.slice(0, 80)}${t.text.length > 80 ? "..." : ""}\n` +
      `/answer ${t.ticketId} Javob...\n\n`;
  }

  bot.sendMessage(chatId, text);
}

function adminMenuKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        ["📊 Stats", "🧾 Logins"],
        ["💳 Orders pending", "🎫 Tickets open"],
        ["📣 Broadcast", "❌ Close admin menu"]
      ],
      resize_keyboard: true
    }
  };
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
    "📝 Send Feedback – fikr-mulohazangizni yozish\n" +
    "⚠️ Report a Problem – texnik nosozliklar uchun\n" +
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


// ==== /menu_admin – admin tugmali panel ====
bot.onText(/\/menu_admin/, msg => {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) {
    return bot.sendMessage(chatId, "⛔ Bu komanda faqat adminlar uchun!");
  }

  bot.sendMessage(
    chatId,
    "ADMIN PANEL 📌\nQuyidagi tugmalardan birini tanlang:",
    adminMenuKeyboard()
  );
});

// Admin tugmalari
bot.onText(/^📊 Stats$/, msg => {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) return;
  adminStats(chatId);
});

bot.onText(/^🧾 Logins$/, msg => {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) return;
  adminLogins(chatId);
});

bot.onText(/^💳 Orders pending$/, msg => {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) return;
  adminOrdersPending(chatId);
});

bot.onText(/^🎫 Tickets open$/, msg => {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) return;
  adminTicketsOpen(chatId);
});

bot.onText(/^📣 Broadcast$/, msg => {
  const chatId = msg.chat.id;
  const key = getKey(chatId);
  if (!isAdmin(chatId)) return;

  modeMap[key] = "admin_broadcast";
  bot.sendMessage(chatId, "📣 Broadcast uchun matnni yozib yuboring. /cancel bilan bekor qilishingiz mumkin.");
});

bot.onText(/^❌ Close admin menu$/, msg => {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) return;

  bot.sendMessage(
    chatId,
    "Admin menyusi yopildi.",
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


// ==== LOGIN SO'ROVI (ORDER + PREMIUM) ====
bot.onText(/Get Login/, msg => {
  const chatId = msg.chat.id;
  const key = getKey(chatId);
  const name = msg.from.first_name || "Foydalanuvchi";

  rememberUser(msg);

  // Agar oldin login berilgan bo'lsa — faqat ma'lumotni ko'rsatamiz, yangi order YO'Q
  if (usedLogins[key]) {
    const l = usedLogins[key];
    const startStr = l.startAt ? formatDate(l.startAt) : "—";
    const endStr = l.endAt ? formatDate(l.endAt) : "—";
    const now = Date.now();
    const active = l.endAt && l.endAt > now;

    bot.sendMessage(
      chatId,
      "🔐 Sizga avval berilgan login mavjud:\n\n" +
      `Login: ${l.login}\n` +
      `Parol: ${l.pass}\n` +
      `Premium obuna: ${startStr} → ${endStr}\n` +
      `Status: ${active ? "Faol ✅" : "Muddati tugagan ⌛"}`
    );
    return;
  }

  // Yangi order
  const orderId = generateOrderId();
  orders[orderId] = {
    orderId,
    userId: key,
    status: "pending",
    cardHolder: null,
    checkFileId: null,
    createdAt: Date.now()
  };

  tempData[key] = { orderId };

  bot.sendMessage(
    chatId,
    "💳 TO'LOV MA'LUMOTI:\n\n" +
    `Karta: 9860 0366 2880 7194\n` +
    `Card-holder: Buxoriddinov Muhammad\n` +
    `Narx: 1 oy = 2,99$ (36 000 so'm)\n\n` +
    `Sizning to‘lov ID'ingiz: *${orderId}*`,
    { parse_mode: "Markdown" }
  );

  bot.sendMessage(
    chatId,
    "⚠️ *Cheksiz to‘lov qabul qilinmaydi!*\n\n" +
    "1️⃣ Avval *to‘lov chekini (screenshot)* rasm qilib yuboring.\n" +
    "2️⃣ So‘ngra *card-holder* (karta egasi ismi-familyasi) ni yozing.\n\n" +
    "⏳ To‘lov admin tomonidan tekshirilgach, 1 oylik premium obunangiz yoqiladi.",
    { parse_mode: "Markdown" }
  );

  const info = userInfo[key] || {};
  const username = info.username ? `@${info.username}` : "username yo‘q";

  sendToAdmins(
    "📥 YANGI LOGIN/TOLÒV SO‘ROVI:\n" +
    `Order ID: ${orderId}\n` +
    `User ID: ${chatId}\n` +
    `Ismi: ${name}\n` +
    `Username: ${username}\n\n` +
    "Foydalanuvchi login so‘radi. Avval chek va ism-familiyani kuting.\n\n" +
    `Ma'lumot: /payinfo ${orderId}\n` +
    `Tasdiqlash: /approve ${orderId} LOGIN PAROL\n` +
    `Rad etish: /reject ${orderId} SABAB`
  );

  modeMap[key] = "pay_check";
});


// ==== ADMIN LOGIN BERISH (qo'lda) ====
// /give USERID LOGIN PAROL
bot.onText(/^\/give (\d+) (\S+) (\S+)/, (msg, match) => {
  const adminId = msg.chat.id;
  if (!isAdmin(adminId)) {
    return bot.sendMessage(adminId, "⛔ Bu komanda faqat adminlar uchun!");
  }

  const userId = match[1];
  const login = match[2];
  const pass = match[3];

  giveLoginToUser(userId, login, pass, null);
});


// ==== ADMIN – LOGINNI REVOKE QILISH ====
// /revoke USER_ID [sababi ixtiyoriy]
bot.onText(/^\/revoke (\d+)\s*([\s\S]*)/, (msg, match) => {
  const adminId = msg.chat.id;
  if (!isAdmin(adminId)) {
    return bot.sendMessage(adminId, "⛔ Bu komanda faqat adminlar uchun!");
  }

  const userId = match[1];
  const reason = (match[2] || "").trim();

  const data = usedLogins[userId];
  if (!data) {
    return bot.sendMessage(adminId, "❓ Bu foydalanuvchiga login berilmagan yoki allaqachon o‘chirilgan.");
  }

  const oldLogin = data.login;
  const oldPass = data.pass;

  delete usedLogins[userId];

  let userText =
    "⚠️ Sizning premium obunangiz bekor qilindi.\n" +
    "Login endi ishlamasligi mumkin.";

  if (reason) {
    userText += "\nSabab: " + reason;
  }

  bot.sendMessage(userId, userText).catch(() => {});

  let adminText =
    "🔴 LOGIN BEKOR QILINDI:\n" +
    `User ID: ${userId}\n` +
    `Oldingi login: ${oldLogin} | Parol: ${oldPass}\n`;

  if (reason) {
    adminText += "Sabab: " + reason + "\n";
  }

  sendToAdmins(adminText);
});


// ==== ADMIN TOLÒV MA'LUMOTINI KO‘RISH ====
// /payinfo ORDERID
bot.onText(/^\/payinfo (\S+)/, (msg, match) => {
  const adminId = msg.chat.id;
  if (!isAdmin(adminId)) {
    return bot.sendMessage(adminId, "⛔ Bu komanda faqat adminlar uchun!");
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
    return bot.sendMessage(adminId, "⛔ Bu komanda faqat adminlar uchun!");
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
    return bot.sendMessage(adminId, "⛔ Bu komanda faqat adminlar uchun!");
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
  ).catch(() => {});

  sendToAdmins(`Order ${orderId} rad etildi.\nSabab: ${reason}`);
});


// ==== ADMIN REPLY (oddiy) ====
// /reply USERID Matn...
bot.onText(/^\/reply (\d+) ([\s\S]+)/, (msg, match) => {
  const adminId = msg.chat.id;
  if (!isAdmin(adminId)) {
    return bot.sendMessage(adminId, "⛔ Bu komanda faqat adminlar uchun!");
  }

  const userId = match[1];
  const text = match[2];

  bot.sendMessage(userId, `📩 Admin javobi:\n\n${text}`).catch(() => {});
  bot.sendMessage(adminId, "✅ Javob yuborildi.");
});


// ==== /stats – admin statistikasi ====
bot.onText(/\/stats/, msg => {
  const adminId = msg.chat.id;
  if (!isAdmin(adminId)) {
    return bot.sendMessage(adminId, "⛔ Bu komanda faqat adminlar uchun!");
  }
  adminStats(adminId);
});

// ==== /logins – admin loginlar ro'yxati ====
bot.onText(/\/logins/, msg => {
  const adminId = msg.chat.id;
  if (!isAdmin(adminId)) {
    return bot.sendMessage(adminId, "⛔ Bu komanda faqat adminlar uchun!");
  }
  adminLogins(adminId);
});


// ==== ADMIN BROADCAST (/broadcast) ====
// /broadcast Matn...
bot.onText(/^\/broadcast ([\s\S]+)/, async (msg, match) => {
  const adminId = msg.chat.id;
  if (!isAdmin(adminId)) {
    return bot.sendMessage(adminId, "⛔ Bu komanda faqat adminlar uchun!");
  }

  const text = match[1];
  if (!text || !text.trim()) {
    return bot.sendMessage(adminId, "⚠️ Matn bo‘sh bo‘lmasligi kerak.");
  }

  if (users.size === 0) {
    return bot.sendMessage(adminId, "Hali birorta user ro'yxatga tushmagan.");
  }

  bot.sendMessage(adminId, `📨 Broadcast boshlanyapti. Jami userlar: ${users.size} ta.`);

  let ok = 0, fail = 0;

  for (const userId of users) {
    try {
      await bot.sendMessage(
        userId,
        "📢 *Vegas e'loni:*\n\n" + text,
        { parse_mode: "Markdown" }
      );
      ok++;
    } catch (e) {
      fail++;
    }
  }

  bot.sendMessage(
    adminId,
    `✅ Tugadi.\nYuborildi: ${ok} ta\nXato: ${fail} ta`
  );
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
    return bot.sendMessage(adminId, "⛔ Bu komanda faqat adminlar uchun!");
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
  ).catch(() => {});

  bot.sendMessage(
    adminId,
    `✅ Ticket ${ticketId} uchun javob yuborildi.`
  );
});


// ==== MATN XABARLAR (mode bo‘yicha) ====
bot.on("message", async msg => {
  const chatId = msg.chat.id;
  const key = getKey(chatId);
  const text = msg.text;

  rememberUser(msg);

  if (!text || text.startsWith("/")) return;

  const mode = modeMap[key];
  if (!mode) return;

  // 🔹 Admin broadcast rejimi (tugma orqali)
  if (mode === "admin_broadcast" && isAdmin(chatId)) {
    if (!text.trim()) {
      bot.sendMessage(chatId, "⚠️ Matn bo‘sh bo‘lmasin. /cancel bilan bekor qilishingiz mumkin.");
      return;
    }

    if (users.size === 0) {
      bot.sendMessage(chatId, "Hali birorta user ro'yxatga tushmagan.");
      modeMap[key] = null;
      return;
    }

    bot.sendMessage(chatId, `📨 Broadcast boshlanyapti. Jami userlar: ${users.size} ta.`);

    let ok = 0, fail = 0;

    for (const userId of users) {
      try {
        await bot.sendMessage(
          userId,
          "📢 *Vegas e'loni:*\n\n" + text,
          { parse_mode: "Markdown" }
        );
        ok++;
      } catch (e) {
        fail++;
      }
    }

    bot.sendMessage(
      chatId,
      `✅ Tugadi.\nYuborildi: ${ok} ta\nXato: ${fail} ta`
    );

    modeMap[key] = null;
    return;
  }

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

    sendToAdmins(
      "💳 TO‘LOV MA'LUMOTI KELDI:\n" +
      `Order ID: ${orderId}\n` +
      `User ID: ${chatId}\n` +
      `Card-holder: ${cardHolder}\n\n` +
      `Ma'lumot: /payinfo ${orderId}\n` +
      `Tasdiqlash: /approve ${orderId} LOGIN PAROL\n` +
      `Rad etish: /reject ${orderId} SABAB`
    );

    if (fileId) {
      sendToAdmins(`Order ${orderId} chek rasmi kelgan.`);
      for (const adminId of ADMIN_IDS) {
        bot.sendPhoto(adminId, fileId, { caption: `Order ID: ${orderId} chek rasmi` }).catch(() => {});
      }
      if (order) {
        order.checkFileId = fileId;
      }
    }

    bot.sendMessage(
      chatId,
      "Rahmat! ✅ Ma’lumotlaringiz adminga yuborildi.\n" +
      "To‘lov tasdiqlangach, 1 oylik premium obunangiz yoqiladi."
    );

    modeMap[key] = null;
    delete tempData[key];
    return;
  }

  // 2) Feedback – TICKET
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

    const info = userInfo[key] || {};
    const username = info.username ? `@${info.username}` : "username yo‘q";

    sendToAdmins(
      "📝 YANGI FEEDBACK TICKET:\n" +
      `Ticket ID: ${ticketId}\n` +
      `User ID: ${chatId}\n` +
      `Username: ${username}\n\n` +
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

    const info = userInfo[key] || {};
    const username = info.username ? `@${info.username}` : "username yo‘q";

    sendToAdmins(
      "⚠️ YANGI PROBLEM REPORT TICKET:\n" +
      `Ticket ID: ${ticketId}\n` +
      `User ID: ${chatId}\n` +
      `Username: ${username}\n\n` +
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

    const info = userInfo[key] || {};
    const username = info.username ? `@${info.username}` : "username yo‘q";

    sendToAdmins(
      "👤 YANGI SUPPORT TICKET:\n" +
      `Ticket ID: ${ticketId}\n` +
      `User ID: ${chatId}\n` +
      `Username: ${username}\n\n` +
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

  modeMap[key] = "card_holder";
});
