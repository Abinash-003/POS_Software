import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { request, UNAUTHORIZED_EVENT } from "../lib/apiClient.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("checking");

  const loadSession = useCallback(async () => {
    try {
      const data = await request.get("/auth/me");
      setUser(data.user);
      setStatus("authenticated");
    } catch {
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Any 401 from any screen drops the session so the router shows the login page.
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setStatus("anonymous");
    };
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await request.post("/auth/login", credentials);
    setUser(data.user);
    setStatus("authenticated");
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await request.post("/auth/logout");
    } finally {
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isReady: status !== "checking",
      isAuthenticated: status === "authenticated",
      isAdmin: user?.role === "admin",
      login,
      logout,
      refresh: loadSession,
    }),
    [user, status, login, logout, loadSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
