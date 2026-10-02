import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthToken, setBaseUrl, setUnauthorizedHandler } from '../api/client';
import * as storage from '../storage';

const AuthContext = createContext(null);

const SIGNED_OUT = { status: 'signedOut', user: null, onboarding: null, error: null };

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, onboarding: null, error: null });

  // Runs on app start: restores the saved session, if there is one.
  const bootstrap = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading', error: null }));
    const savedUrl = await storage.getServerUrl(); // address chosen in Server settings, if any
    if (savedUrl) setBaseUrl(savedUrl);
    const token = await storage.getToken();
    if (!token) {
      setState(SIGNED_OUT);
      return;
    }
    setAuthToken(token);
    try {
      const me = await api.me();
      setState({ status: 'signedIn', user: me.user, onboarding: me.onboarding, error: null });
    } catch (err) {
      if (err.status === 401) {
        await storage.clearToken();
        setAuthToken(null);
        setState(SIGNED_OUT);
      } else {
        // Server unreachable: do not log the person out, let them retry.
        setState({ status: 'error', user: null, onboarding: null, error: err.message });
      }
    }
  }, []);

  const logout = useCallback(async () => {
    await storage.clearToken();
    setAuthToken(null);
    setState(SIGNED_OUT);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    await storage.setToken(data.token);
    setAuthToken(data.token);
    setState({ status: 'signedIn', user: data.user, onboarding: data.onboarding, error: null });
  }, []);

  const updateOnboarding = useCallback((patch) => {
    setState((s) => ({ ...s, onboarding: { ...s.onboarding, ...patch } }));
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout); // an expired token anywhere logs the person out
    bootstrap();
  }, [bootstrap, logout]);

  const value = useMemo(
    () => ({ ...state, login, logout, retry: bootstrap, updateOnboarding }),
    [state, login, logout, bootstrap, updateOnboarding],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
