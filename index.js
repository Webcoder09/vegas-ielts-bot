const TelegramBot = require("node-telegram-bot-api");

// ==== CONFIG ====
const TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;
const bot = new TelegramBot(TOKEN, { polling: true });

let credentials = [
    { username: "dE63tUw", password: "Sg82Kb3" },
    { username: "Fh18pQz", password: "yL29Rx7" },
    { username: "gJ54mNa", password: "Tq30Hv8" },
    { username: "Kk02vRb", password: "pZ71sM4" },
    { username: "lM89qFd", password: "Xc56Gy2" },
    { username: "Nn37zHs", password: "uV15Wr6" },
    { username: "oP46bTj", password: "Bf90Ly3" },
    { username: "Qr25cUz", password: "Je68Kn1" },
    { username: "sS10dWx", password: "Zm47Pa9" },
    { username: "Tt83eYa", password: "kR21Qc5" },
    { username: "uV48fZb", password: "Hg60Mn2" },
    { username: "Ww29gAc", password: "Ly37Sv8" },
    { username: "xX65hBd", password: "Po14Tr6" },
    { username: "Yy04iCe", password: "Rq72Vk3" },
    { username: "zZ91jDf", password: "Ns58La7" },
    { username: "Aa36kEg", password: "Ub23Yp9" },
    { username: "Bb57lFh", password: "Xv80Mr2" },
    { username: "Cc18mGi", password: "Kt49Qz6" },
    { username: "Dd64nHj", password: "Pw31Sa8" },
    { username: "Ee02oIk", password: "Ym75Rb4" },
    { username: "Ff39pJl", password: "Gc20Vt7" },
    { username: "Gg70qKm", password: "Hn86Le1" },
    { username: "Hh25rLn", password: "Sv43Yc9" },
    { username: "Ii58sMo", password: "Pt12Bg6" },
    { username: "Jj11tNp", password: "Rw69Dz3" },
    { username: "Kk82uOq", password: "Xa27Mf5" },
    { username: "Ll47vPr", password: "Qb90Hs2" },
    { username: "Mm03wQs", password: "Uz56Ty8" },
    { username: "Nn69xRt", password: "Vo14Kp7" },
    { username: "Oo20ySu", password: "Mc83La2" },
    { username: "Pp51zTv", password: "Jr36Wn9" },
    { username: "Qq06aUw", password: "Sd72Gx4" },
    { username: "Rr88bVx", password: "Ef25Hy1" },
    { username: "Ss33cWy", password: "Kb90Qm6" },
    { username: "Tt14dXz", password: "Ln47Pr2" },
    { username: "Uu76eYa", password: "Gv31Sz8" },
    { username: "Vv09fZb", password: "Hx58Mk3" },
    { username: "Ww62gAc", password: "Py24Rt7" },
    { username: "Xx41hBd", password: "Zv89Ln5" },
    { username: "Yy27iCe", password: "Ab63Qk1" },
    { username: "Zz95jDf", password: "Oc20Vr6" },
    { username: "Aa12kEg", password: "Tn74Hs3" },
    { username: "Bb68lFh", password: "Me31Pw9" },
    { username: "Cc05mGi", password: "Rq56Yv2" },
    { username: "Dd39nHj", password: "Kb87La4" },
    { username: "Ee84oIk", password: "Xc20Gn7" },
    { username: "Ff21pJl", password: "Uz49Mr6" },
    { username: "Gg57qKm", password: "Sv12Tp8" },
    { username: "Hh04rLn", password: "Jy68Wx3" },
    { username: "Ii73sMo", password: "Po25Zv9" },
    { username: "Jj30tNp", password: "La91Qb2" },
    { username: "Kk46uOq", password: "Mf58Cr7" },
    { username: "Ll09vPr", password: "Gw34Tx6" },
    { username: "Mm85wQs", password: "Hs12Yn4" },
    { username: "Nn28xRt", password: "Dz67Vk3" },
    { username: "Oo63ySu", password: "Pc40Rm9" },
    { username: "Pp17zTv", password: "Ub82Gq5" },
    { username: "Qq50aUw", password: "Ke36Sl1" },
    { username: "Rr02bVx", password: "Yn74Pt8" },
    { username: "Ss77cWy", password: "Mo21Hr6" },
    { username: "Tt45dXz", password: "Ax90Qv3" },
    { username: "Uu33eYa", password: "Nf64Pw9" },
    { username: "Vv07fZb", password: "Hb20Rq3" },
    { username: "Ww59gAc", password: "Kp72Jv8" },
    { username: "Xx18hBd", password: "Ly43Zt6" },
    { username: "Yy26iCe", password: "Gc81Qm5" },
    { username: "Zz35jDf", password: "Pa27Vn1" },
    { username: "Aa47kEg", password: "Xb63Rk9" },
    { username: "Bb69lFh", password: "Mq12Hs4" },
    { username: "Cc82mGi", password: "Wn70Tv6" },
    { username: "Dd13nHj", password: "Dr58Qx3" },
    { username: "Ee75oIk", password: "Ho26Lf8" },
    { username: "Ff23pJl", password: "Sv91Gz2" },
    { username: "Gg48qKm", password: "Pn34Jt7" },
    { username: "Hh15rLn", password: "Qy68Xb1" },
    { username: "Ii36sMo", password: "Lc24Nv9" },
    { username: "Jj67tNp", password: "Rk57Py5" },
    { username: "Kk09uOq", password: "Tw31Ba8" },
    { username: "Ll80vPr", password: "Fv64Mz2" },
    { username: "Mm52wQs", password: "Dy78Qk5" },
    { username: "Nn29xRt", password: "Ub46Wp1" },
    { username: "Oo41ySu", password: "Hr23Jc6" },

    { username: "Pp74zTv", password: "Zt15Na7" },
    { username: "Qq05aUw", password: "Km89Vc3" },
    { username: "Rr90bVx", password: "Ye30Hs2" },
    { username: "Ss61cWy", password: "Ap47Lq8" },
    { username: "Tt34dXz", password: "Mn21Zr9" },
    { username: "Uu83eYa", password: "Lg52Tx4" },
    { username: "Vv46fZb", password: "Qf86Kw7" },
    { username: "Ww17gAc", password: "Hd25Vb3" },
    { username: "Xx88hBd", password: "By63Mn2" },
    { username: "Yy64iCe", password: "Ra10Jp9" },
    { username: "Zz39jDf", password: "Xt79Qv5" },
    { username: "Aa21kEg", password: "Zp48Mw1" },
    { username: "Bb85lFh", password: "Hs56Tc4" },
    { username: "Cc14mGi", password: "Kb37Yn8" },
    { username: "Dd58nHj", password: "Vp60Gr3" },
    { username: "Ee40oIk", password: "Mu95Sd7" },
    { username: "Ff73pJl", password: "Pf12Xa6" },
    { username: "Gg24qKm", password: "Lo47Rt8" },
    { username: "Hh71rLn", password: "Cw89Gk1" },
    { username: "Ii19sMo", password: "Jr25Ny5" },
    { username: "Jj86tNp", password: "Vf43Hp2" },
    { username: "Kk68uOq", password: "Zx70Ms3" },
    { username: "Ll32vPr", password: "Qb56Ft9" },
    { username: "Mm09wQs", password: "Ee21Lc4" },
    { username: "Nn80xRt", password: "Rz73Vp1" },
    { username: "Oo44ySu", password: "Sd65Yn6" },
    { username: "Pp26zTv", password: "Ng38Wx7" },
    { username: "Qq97aUw", password: "Ty91Jb3" },
    { username: "Rr58bVx", password: "Aw40Hz5" },
    { username: "Ss73cWy", password: "Mp24Rn2" },
    { username: "Tt35dXz", password: "Bc87Lf1" },
    { username: "Uu12eYa", password: "Kz61Dq4" },
    { username: "Vv94fZb", password: "Yp15Xt7" },
    { username: "Ww57gAc", password: "Jv39Rb9" },
    { username: "Xx48hBd", password: "Gn72Mw6" },
    { username: "Yy23iCe", password: "Ho56Sa3" },
    { username: "Zz84jDf", password: "Qm10Lp5" },
    { username: "Aa30kEg", password: "Rw63Nf2" },
    { username: "Bb46lFh", password: "Ts48Yb7" },
    { username: "Cc15mGi", password: "Fd85Vc9" },
    { username: "Dd97nHj", password: "Zg24Mt1" },
    { username: "Ee38oIk", password: "Uw12Hr6" },
    { username: "Ff71pJl", password: "Xq95Gk4" },
    { username: "Gg22qKm", password: "By36Lz8" },
    { username: "Hh53rLn", password: "Vp69Nj5" },
    { username: "Ii09sMo", password: "Ct40Wa7" },
    { username: "Jj85tNp", password: "Ks33Xf2" },
    { username: "Kk41uOq", password: "Mn27Br1" },
    { username: "Ll76vPr", password: "Hg14Dy9" },
    { username: "Mm58wQs", password: "Qx85Ta6" },
    { username: "Nn20xRt", password: "Rc43Jm8" },
    { username: "Oo99ySu", password: "Uz18Fp5" },
    { username: "Pp64zTv", password: "Wd30Kv7" },
    { username: "xA3dR2pL", password: "T8mQ5yU1" },
    { username: "B5tN9cE4", password: "a2Fz6Lr9" },
    { username: "M7hJ2vQ8", password: "e4Yt1Gk3" },
    { username: "f2Zx5R8t", password: "J6mD9nA2" },
    { username: "p8Lr3K2v", password: "w5Qz9C1x" },
    { username: "G1sM8dH6", password: "q7A2eP5v" },
    { username: "a5Xj9V3k", password: "T2fQ6bL8" },
    { username: "N9hC2wR4", password: "b3Yt7sD1" },
    { username: "t4Pz8F6j", password: "r9Lq5K2n" },
    { username: "J3gK7dV2", password: "W6pT1aR9" },
    { username: "F8yL2xS5", password: "k9D4mB1q" },
    { username: "v2N3zH7g", password: "Q1tR5xL8" },
    { username: "y9C1dK8m", password: "g6B2jZ3v" },
    { username: "E3tP5qH9", password: "u7R4nL2y" },
    { username: "R6jA8vX1", password: "p2M9wF5t" },
    { username: "k4S2hN9b", password: "x5D7qG3a" },
    { username: "H7mJ3cV6", password: "f1T4rK9y" },
    { username: "z8L5nW2x", password: "s9P3yM7t" },
    { username: "C1qK9gH5", password: "v4J6rT2a" },
    { username: "L2bN8yM7", password: "j3S5dX9k" },
    { username: "D6xT3fJ9", password: "N8q1vR5p" },
    { username: "r7Y4hC8s", password: "b2L6aK1m" },
    { username: "W5vF2pR3", password: "x8Z7cN9q" },
    { username: "P3aM9jY5", password: "d6E4fB1h" },
    { username: "n1T6vC8k", password: "G9s2yQ4x" },
    { username: "X9hL3rD7", password: "t4J1wM8p" },
    { username: "b6V2nG5j", password: "q3A9yH4z" },
    { username: "U4pF8dN3", password: "v9T1cL5r" },
    { username: "S5jC1xH9", password: "M7a2nQ6b" },
    { username: "q8R2yK7g", password: "L3z9dV5p" },
    { username: "m9A4tW1x", password: "F6j3rP8v" },

    { username: "o7G5bN2d", password: "R8y1kS4t" },
    { username: "i1C3zL8h", password: "p9J7fQ5m" },
    { username: "Z6dP2xR9", password: "w3N8gT4y" },
    { username: "K3qJ9vF5", password: "t2A4yL7m" },
    { username: "g5N8rM2y", password: "Q9s3pX1v" },
    { username: "t9V4kH3n", password: "e1D7rL6p" },
    { username: "Y2pC7sB9", password: "m4K5nF3v" },
    { username: "e8L5xT1j", password: "R9a7bQ6h" },
    { username: "J1rH9mV4", password: "v3P5xY8n" },
    { username: "F2yS8cW7", password: "L9q4tM1r" },
    { username: "c9B3tK2x", password: "a5W7pV6q" },
    { username: "M4nL1vD9", password: "T8j6gR2h" },
    { username: "R3sF8zK1", password: "b9P5wX4n" },
    { username: "x5Y9rG3t", password: "C2l7mH6v" },
    { username: "p7H4dQ8n", password: "w1T3fM9y" },
    { username: "A6vC1jZ5", password: "q8R9yL2p" },
    { username: "V9lF3tX2", password: "s7D5bN1h" },
    { username: "k8P2nW7r", password: "E9c1jT5m" },
    { username: "N3bD6xJ9", password: "y4F8qL2v" },
    { username: "h1R8yM5g", password: "T2n3aK9p" },
    { username: "w4Z7dL2x", password: "P6r1qV8m" },
    { username: "B9mK3tH1", password: "j4Y2fR6v" },
    { username: "T2vP5rC8", password: "m9A3wL4n" },
    { username: "s6D9qJ2x", password: "N5h4yV8r" },
    { username: "L5kH8tB1", password: "r3J9cM6p" },
    { username: "Q1yN3zV5", password: "t7S8bL9k" },
    { username: "g7P4xM2c", password: "W1q9nR6h" },
    { username: "E8dV5lK9", password: "a3C7yH2t" },
    { username: "u2J6bN4r", password: "x9T1fG5m" },
    { username: "C9hR1sF8", password: "n7V5kM3p" },
    { username: "P7vL4xY2", password: "m9D6rA1h" },
    { username: "y3N2jT9k", password: "f5S4wC8b" },
    { username: "x8G9rH1n", password: "t6P2jM4v" },
    { username: "R5cL7qB2", password: "p9W8nY1t" },
    { username: "H9kN1vX3", password: "r2T4yL5m" },
    { username: "d7J8pQ4c", password: "W9s3tM1v" },
    { username: "m2T9kB5y", password: "E8q1pR6n" },
    { username: "z5F3lN8r", password: "b1K4xV7t" },
    { username: "G4vD2tM9", password: "p3L7qC1y" },
    { username: "J9yL5sF1", password: "t2M6kR8n" },
    { username: "V8kR3jT6", password: "f9P5yN1c" },
    { username: "a3D7wM9x", password: "R4n6bL2t" },
    { username: "L9nF2cV5", password: "y1G3qH8p" },
    { username: "b1Q8tN7r", password: "J4m2xS9v" },
    { username: "W6yC5fK9", password: "a3P1tL7h" },
    { username: "q9V7dR4x", password: "n2B3mT8y" },
    { username: "N2tL6hC1", password: "r9W5kF3p" },
    { username: "k5M4nB8v", password: "E1j3yT9r" },
    { username: "F3rS7gV9", password: "p2L6tK5n" },
    { username: "y8C2vN5t", password: "m9J1hX3b" },
    { username: "Z7xF3qM9", password: "a5T8yL2r" },
    { username: "p9H1dK7t", password: "G3n4bQ6m" },
    { username: "e3Y8nV5r", password: "x2W9kL7t" },
    { username: "M6tC9pJ2", password: "r5F8vB1y" },
    { username: "R8nL2hG4", password: "w9T7cM3p" },
    { username: "v9J3mQ6t", password: "n4K2pR1y" },
    { username: "g5C8rH2x", password: "B9a7vT4m" },
    { username: "x7K4dM9y", password: "t2R8pF1v" },
    { username: "h2N3zL8k", password: "q6W9rY5t" },
    { username: "T3vG9rJ6", password: "L8n2bH1p" },
    { username: "c8M2xK5v", password: "w9P7tN3r" },
    { username: "A4tL7hF1", password: "r5K8nV9y" },
    { username: "w3V9yR2x", password: "J6f1mL5t" },
    { username: "K1qM8bN4", password: "t2S9yH7r" },
    { username: "y9F6dV3p", password: "p5C1nL8t" },
    { username: "b2P4rX9k", password: "q3M7wN5v" },
    { username: "G7tK2vY1", password: "f9P3xR8n" },
    { username: "n5J8yL3h", password: "E2a4mK9t" },
    { username: "z9M1kC7r", password: "t6Q3bH4y" },
    { username: "S8yV3pN2", password: "L1r6qT9h" },
    { username: "d4X9nR5g", password: "m2F1yC8t" },
    { username: "J2tF6lW8", password: "p9K4xM3r" },
    { username: "R9vH5bQ1", password: "y7T8cL2n" },
    { username: "t3G8rM9x", password: "a2J6yP5n" },
    { username: "x8L2hF5q", password: "m1C9nR4v" },
    { username: "P7mV1kG3", password: "r5W2bN9t" },
    { username: "v1Q9tS7n", password: "y8M4jK2p" },
    { username: "L6rX3hN9", password: "t2C5qB7m" },
    { username: "F9dM4vH2", password: "x1J7yK8r" }
];

// ==== STORAGE ====
let used = {};       // berilgan loginlar
let modeMap = {};    // feedback/support/problem holatlari

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

  bot.sendMessage(chatId, 
    "Assalomu alaykum! 👋\nVegas IELTS support botiga xush kelibsiz.",
    opts
  );
});

// ==== LOGIN SO‘ROVI (Admin tasdiqlashi kerak) ====
bot.onText(/Get Login/, msg => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || "User";

  bot.sendMessage(chatId, 
    "⏳ Login so‘rovingiz qabul qilindi.\nAdmin tasdiqlaguncha kuting.");
  
  // Adminni ogohlantiramiz
  bot.sendMessage(
    ADMIN_ID,
    `📥 Yangi login so‘rovi:\nUser ID: ${chatId}\nIsmi: ${name}\n\nAgar to‘lov qilgan bo‘lsa, login bering:\n👉 /give ${chatId} LOGIN PAROL`
  );
});

// ==== ADMIN LOGIN BERISH (qo‘lda tasdiqlash) ====
// format: /give 5321123456 dE63tUw Sg82Kb3
bot.onText(/^\/give (\d+) (\S+) (\S+)/, (msg, match) => {
  const adminId = msg.chat.id;

  if (adminId.toString() !== ADMIN_ID.toString()) {
    return bot.sendMessage(adminId, "⛔ Bu komanda faqat admin uchun!");
  }

  const userId = match[1];
  const login = match[2];
  const pass = match[3];

  // userga yuboramiz
  bot.sendMessage(
    userId,
    `🔐 Sizning login-parolingiz:\nLogin: ${login}\nParol: ${pass}`
  );

  bot.sendMessage(
    ADMIN_ID,
    "✅ Login foydalanuvchiga yuborildi."
  );

  // saqlab qo'yamiz
  used[userId] = { login, pass };
});

// ==== FEEDBACK / PROBLEM / SUPPORT ====
bot.onText(/Send Feedback/, msg => {
  modeMap[msg.chat.id] = "feedback";
  bot.sendMessage(msg.chat.id, "📝 Fikringizni yozing:");
});

bot.onText(/Report a Problem/, msg => {
  modeMap[msg.chat.id] = "problem";
  bot.sendMessage(msg.chat.id, "⚠️ Muammoni yozing:");
});

bot.onText(/Contact Support/, msg => {
  modeMap[msg.chat.id] = "support";
  bot.sendMessage(msg.chat.id, "👤 Savolingizni yozing:");
});

bot.on("message", msg => {
  const chatId = msg.chat.id;
  const mode = modeMap[chatId];
  const text = msg.text;

  if (!mode || text.startsWith("/")) return;

  if (mode === "feedback") {
    bot.sendMessage(ADMIN_ID, `📝 FEEDBACK:\nUser: ${chatId}\n${text}`);
    bot.sendMessage(chatId, "Rahmat! 😊");
  }
  if (mode === "problem") {
    bot.sendMessage(ADMIN_ID, `⚠️ PROBLEM:\nUser: ${chatId}\n${text}`);
    bot.sendMessage(chatId, "Qabul qilindi. 🙏");
  }
  if (mode === "support") {
    bot.sendMessage(ADMIN_ID, `👤 SUPPORT:\nUser: ${chatId}\n${text}`);
    bot.sendMessage(chatId, "Javob tez orada yuboriladi.");
  }

  modeMap[chatId] = null;
});
