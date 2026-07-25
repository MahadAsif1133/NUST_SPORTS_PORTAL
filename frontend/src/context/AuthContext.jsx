import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    if (!api.accessToken) {
      setLoading(false);
      return;
    }
    try {
      const { user } = await api.getMe();
      setUser(user);
    } catch (err) {
      // Only log out if it is an explicit authentication error (401 or 403)
      if (err.status === 401 || err.status === 403) {
        api.clearTokens();
        setUser(null);
      } else {
        console.warn('Temporary connection or server error during session verify:', err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = async (credentials) => {
    let data;
    if (credentials.registrationNumber) {
      data = await api.loginStudent(credentials.registrationNumber, credentials.password);
    } else {
      data = await api.loginEmail(credentials.email, credentials.password);
    }
    api.setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try { await api.logout(); } catch {}
    api.clearTokens();
    setUser(null);
  };

  const value = { user, setUser, loading, login, logout, fetchUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
