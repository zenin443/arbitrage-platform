'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

interface User {
  id: string;
  email: string | null;
  name: string;
  plan: string;
  role: string;
  walletAddress?: string | null;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  accessToken: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // U3: prevent duplicate checkAuth calls (React StrictMode double-invocation,
  // or any component explicitly calling checkAuth() multiple times).
  // Reset to false in login/signup so re-check works after explicit sign-in.
  const refreshAttemptedRef = useRef(false);

  useEffect(() => {
    void checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh token before expiry (every 13 minutes for 15min tokens)
  // Guard: only runs when user is set — so unauthenticated sessions never poll.
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(refreshToken, 13 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  async function checkAuth() {
    // U3: if we already fired a refresh attempt and got a non-ok response,
    // don't keep retrying — there is no session to restore.
    if (refreshAttemptedRef.current) return;
    refreshAttemptedRef.current = true;
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setAccessToken(data.accessToken);
        const meRes = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${data.accessToken}` }
        });
        if (meRes.ok) {
          const meData = await meRes.json();
          setUser(meData.user);
        }
      }
      // 401 = no session — fall through to finally, isLoading → false
    } catch {
      // Network error — treat as no session
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshToken() {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setAccessToken(data.accessToken);
      } else if (res.status === 401) {
        // Session expired — clear auth state, stop interval via [user] dep
        setUser(null);
        setAccessToken(null);
      }
    } catch {
      setUser(null);
      setAccessToken(null);
    }
  }

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    refreshAttemptedRef.current = false; // U3: allow checkAuth again if needed
    setUser(data.user);
    setAccessToken(data.accessToken);
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signup failed');
    setUser(data.user);
    setAccessToken(data.accessToken);
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setAccessToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, isLoading, isAuthenticated: !!user, login, signup, logout, checkAuth, accessToken
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
