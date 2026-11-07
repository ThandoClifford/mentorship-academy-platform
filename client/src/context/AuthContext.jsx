import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearStoredAuthToken,
  getStoredAuthToken,
  storeAuthToken,
} from '../services/api.js';
import * as authService from '../services/authService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const storedToken = getStoredAuthToken();

    function handleUnauthorized() {
      setUser(null);
      setToken(null);
      setLoading(false);
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    if (!storedToken) {
      setLoading(false);
    } else {
      setToken(storedToken);
      authService
        .getCurrentUser()
        .then((currentUser) => {
          if (active) setUser(currentUser);
        })
        .catch(() => {
          if (active) {
            setUser(null);
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    return () => {
      active = false;
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  async function login(credentials) {
    const result = await authService.login(credentials);
    storeAuthToken(result.token);
    setToken(result.token);
    setUser(result.user);
    return result.user;
  }

  async function register(details) {
    const result = await authService.register(details);
    return result.user;
  }

  function logout() {
    clearStoredAuthToken();
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      loading,
      login,
      register,
      logout,
    }),
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return context;
}
