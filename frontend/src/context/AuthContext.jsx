import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authAPI, usersAPI, notificationsAPI } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("auth_token") || "");
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("auth_user") || "null");
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const saveSession = (newUser, newToken) => {
    setUser(newUser);
    setToken(newToken);

    if (newToken) localStorage.setItem("auth_token", newToken);
    else localStorage.removeItem("auth_token");

    if (newUser) localStorage.setItem("auth_user", JSON.stringify(newUser));
    else localStorage.removeItem("auth_user");
  };

  const login = (userObj, jwtToken) => {
    // accepte {token,user} ou (user, token)
    const t = jwtToken || userObj?.token;
    const u = userObj?.user || userObj;
    saveSession(u, t);
  };

  const logout = () => {
    saveSession(null, "");
    setUnreadCount(0);
  };

  const refreshMe = async () => {
    if (!token) return;
    try {
      const me = await usersAPI.me();
      saveSession(me, token);
    } catch {
      // token invalide
      logout();
    }
  };

  const refreshUnread = async () => {
    if (!token) return setUnreadCount(0);
    try {
      const data = await notificationsAPI.unread({ limit: 1 });
      // backend -> { notifications, count }
      setUnreadCount(data?.count ?? 0);
    } catch {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (token) {
        await refreshMe();
        await refreshUnread();
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      unreadCount,
      login,
      logout,
      refreshMe,
      refreshUnread,
    }),
    [user, token, loading, unreadCount]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
