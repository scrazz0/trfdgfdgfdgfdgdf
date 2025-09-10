"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = 3001;
const DB_PATH = path_1.default.join(__dirname, '..', 'db.json');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
// --- Мидлвары ---
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// --- Хелперы для работы с БД ---
async function readDB() {
    try {
        const data = await promises_1.default.readFile(DB_PATH, 'utf-8');
        return JSON.parse(data);
    }
    catch (error) {
        // Если файла нет, создаем его со структурой по умолчанию
        return { users: [] };
    }
}
async function writeDB(data) {
    await promises_1.default.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}
// --- Middleware для проверки JWT токена ---
// Fix: Use express.Request, express.Response, and express.NextFunction for correct Express types.
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) {
        return res.status(401).json({ message: 'Token not provided' });
    }
    jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};
// --- Маршруты (Routes) ---
// 1. Регистрация нового пользователя
// Fix: Use express.Request and express.Response for correct Express types.
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    const db = await readDB();
    const existingUser = db.users.find((user) => user.email === email);
    if (existingUser) {
        return res.status(409).json({ message: 'User with this email already exists' });
    }
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    const newUser = {
        id: (0, uuid_1.v4)(),
        name,
        email,
        passwordHash,
    };
    db.users.push(newUser);
    await writeDB(db);
    const userPayload = { id: newUser.id, name: newUser.name, email: newUser.email };
    const token = jsonwebtoken_1.default.sign(userPayload, JWT_SECRET, { expiresIn: '1d' });
    res.status(201).json({ user: userPayload, token });
});
// 2. Вход пользователя (логин)
// Fix: Use express.Request and express.Response for correct Express types.
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }
    const db = await readDB();
    const user = db.users.find((u) => u.email === email);
    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isPasswordValid = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    const userPayload = { id: user.id, name: user.name, email: user.email };
    const token = jsonwebtoken_1.default.sign(userPayload, JWT_SECRET, { expiresIn: '1d' });
    res.json({ user: userPayload, token });
});
// 3. Получение данных текущего пользователя (защищенный маршрут)
// Fix: Use express.Request and express.Response for correct Express types.
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const db = await readDB();
    const user = db.users.find((u) => u.id === userId);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    // Возвращаем данные без хеша пароля
    res.json({ id: user.id, name: user.name, email: user.email });
});
// 4. Отправка уведомления о выводе средств
// Fix: Use express.Request and express.Response for correct Express types.
app.post('/api/notifications/withdraw', async (req, res) => {
    const { amount, address } = req.body;
    if (!amount || !address) {
        return res.status(400).json({ message: 'Amount and address are required.' });
    }
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) {
        console.error("Telegram credentials are not configured in .env file");
        return res.status(500).json({ message: 'Server configuration error.' });
    }
    const message = `
    🚨 *New Withdrawal Request* 🚨

    *Amount:* ${amount} USD
    *Address:* \`${address}\`

    Please review and process this request.
  `;
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    try {
        await axios_1.default.post(url, {
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown',
        });
        res.json({ success: true, message: 'Notification sent successfully.' });
    }
    catch (error) {
        console.error('Error sending Telegram message:', error);
        res.status(500).json({ message: 'Failed to send notification.' });
    }
});
// --- Запуск сервера ---
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту http://localhost:${PORT}`);
});
