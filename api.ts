import axios from 'axios';

// !!! ВАЖНО !!!
// Когда вы сделаете сервер публичным, замените 'http://localhost:3001' 
// на ваш публичный адрес, который вы получите от ngrok или после настройки роутера.
// Например: 'https://random-string.ngrok.io' или 'http://ВАШ_ПУБЛИЧНЫЙ_IP:3001'
const API_BASE_URL = 'https://cb76dd26c418.ngrok-free.app/api';


const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Перехватчик для добавления токена авторизации в каждый запрос
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


export const login = async (email, password) => {
  try {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data; // { user, token }
  } catch (error) {
    throw error.response.data;
  }
};

export const register = async (name, email, password) => {
    try {
        const response = await apiClient.post('/auth/register', { name, email, password });
        return response.data; // { user, token }
    } catch (error) {
        throw error.response.data;
    }
};

export const getCurrentUser = async () => {
    try {
        const response = await apiClient.get('/auth/me');
        return response.data; // user
    } catch (error) {
        throw error.response.data;
    }
};

export const notifyWithdrawal = async (data: { amount: string, address: string }) => {
    try {
        const response = await apiClient.post('/notifications/withdraw', data);
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};
