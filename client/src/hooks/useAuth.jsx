import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../api/index";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Logout helper (also called by api interceptor via event)
  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  }, []);

  // On mount: validate stored token by fetching user profile
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setIsLoading(false);
      return;
    }
    // Decode payload without verifying (server verifies) to restore user state fast
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      // Check not expired (exp is in seconds)
      if (payload.exp * 1000 > Date.now()) {
        setUser({ id: payload.sub, username: payload.username, email: payload.email });
      } else {
  // Token expired — try refresh before giving up
  const refreshToken = localStorage.getItem("refreshToken");
  if (refreshToken) {
    api
      .post("/api/auth/refresh", { refreshToken })
      .then(({ data }) => {
        localStorage.setItem("accessToken", data.accessToken);
        const p = JSON.parse(atob(data.accessToken.split(".")[1]));
        setUser({ id: p.sub, username: p.username, email: p.email });
      })
      .catch(() => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        setUser(null);
      })
      .finally(() => setIsLoading(false));
    return; // Don't call setIsLoading(false) yet — wait for refresh
  } else {
    logout();
  }
}
    } catch {
      logout();
    }
    setIsLoading(false);
  }, [logout]);

  // Listen for forced logout from api interceptor
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener("auth:logout", handler);
    return () => window.removeEventListener("auth:logout", handler);
  }, [logout]);

  // ── register ────────────────────────────────────────────────────────────────
  // Server returns: { accessToken, refreshToken, user: {id, username, email, credits, elo} }
  const register = useCallback(async (username, email, password) => {
    const { data } = await api.post("/api/auth/register", { username, email, password });
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  // ── login ───────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/api/auth/login", { email, password });
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
