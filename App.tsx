import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, LocalizationProvider } from './contexts';
import { AuthProvider } from './AuthContext'; // Импортируем AuthProvider
import Layout from './components/Layout';
import HomePage from './components/HomePage';
import PropertiesPage from './components/PropertiesPage';
import AuthPage from './components/AuthPage';
import DashboardPage from './components/DashboardPage';
import StaticPages from './components/StaticPages';

function App() {
  return (
    <ThemeProvider>
      <LocalizationProvider>
        <AuthProvider>
          <HashRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="properties" element={<PropertiesPage />} />
                <Route path="how-it-works" element={<StaticPages page="how-it-works" />} />
                <Route path="about" element={<StaticPages page="about" />} />
              </Route>
              <Route path="/login" element={<AuthPage />} />
              <Route path="/dashboard/*" element={<DashboardPage />} />
            </Routes>
          </HashRouter>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
