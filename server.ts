import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3001;
const DB_PATH = path.join(__dirname, '..', 'db.json');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// --- Мидлвары ---
app.use(cors());
app.use(express.json());

// --- Типы данных ---
interface User {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
}

// --- Хелперы для работы с БД ---
async function readDB() {
    try {
        const data = await fs.readFile(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // Если файла нет, создаем его со структурой по умолчанию
        return { users: [] };
    }
}

async function writeDB(data: any) {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

// --- Middleware для проверки JWT токена ---
// Fix: Use express.Request, express.Response, and express.NextFunction for correct Express types.
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ message: 'Token not provided' });
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        (req as any).user = user;
        next();
    });
};

// --- Маршруты (Routes) ---

// 1. Регистрация нового пользователя
// Fix: Use express.Request and express.Response for correct Express types.
app.post('/api/auth/register', async (req: express.Request, res: express.Response) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const db = await readDB();
    const existingUser = db.users.find((user: User) => user.email === email);
    if (existingUser) {
        return res.status(409).json({ message: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser: User = {
        id: uuidv4(),
        name,
        email,
        passwordHash,
    };

    db.users.push(newUser);
    await writeDB(db);

    const userPayload = { id: newUser.id, name: newUser.name, email: newUser.email };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({ user: userPayload, token });
});

// 2. Вход пользователя (логин)
// Fix: Use express.Request and express.Response for correct Express types.
app.post('/api/auth/login', async (req: express.Request, res: express.Response) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    const db = await readDB();
    const user = db.users.find((u: User) => u.email === email);

    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const userPayload = { id: user.id, name: user.name, email: user.email };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '1d' });

    res.json({ user: userPayload, token });
});

// 3. Получение данных текущего пользователя (защищенный маршрут)
// Fix: Use express.Request and express.Response for correct Express types.
app.get('/api/auth/me', authenticateToken, async (req: express.Request, res: express.Response) => {
    const userId = (req as any).user.id;
    const db = await readDB();
    const user = db.users.find((u: User) => u.id === userId);

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    
    // Возвращаем данные без хеша пароля
    res.json({ id: user.id, name: user.name, email: user.email });
});

// 4. Отправка уведомления о выводе средств
// Fix: Use express.Request and express.Response for correct Express types.
app.post('/api/notifications/withdraw', async (req: express.Request, res: express.Response) => {
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
        await axios.post(url, {
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown',
        });
        res.json({ success: true, message: 'Notification sent successfully.' });
    } catch (error) {
        console.error('Error sending Telegram message:', error);
        res.status(500).json({ message: 'Failed to send notification.' });
    }
});


// --- Запуск сервера ---
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту http://localhost:${PORT}`);
});
