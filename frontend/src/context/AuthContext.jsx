import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // ✅ INIT AUTH STATE FROM LOCAL STORAGE
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("auth_user");
      const storedToken = localStorage.getItem("auth_token");

      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      }
    } catch (error) {
      console.error("Erreur lors du chargement du stockage local :", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ FETCH PROFILE + NOTIFICATIONS WHEN USER LOGS IN
  useEffect(() => {
    if (user && token) {
      fetchUserProfile();
      fetchNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ✅ FETCH USER PROFILE
  const fetchUserProfile = async () => {
    try {
      const response = await fetch("/api/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      if (data?.success) {
        const updatedUser = { ...user, ...data.data };
        setUser(updatedUser);
        localStorage.setItem("auth_user", JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    }
  };

  // ✅ FETCH NOTIFICATIONS
  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications/unread?limit=10", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      if (data?.success) {
        setNotifications(data.data?.notifications || []);
        setUnreadCount(data.data?.count || 0);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  // ✅ UPDATE PROFILE
  const updateProfile = async (profileData) => {
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (response.ok && data?.success) {
        const updatedUser = { ...user, ...data.data };
        setUser(updatedUser);
        localStorage.setItem("auth_user", JSON.stringify(updatedUser));
        return { success: true, data: data.data };
      }

      return { success: false, error: data?.message || "Update failed" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // ✅ UPDATE PREFERENCES
  const updatePreferences = async (preferences) => {
    try {
      const response = await fetch("/api/profile/preferences", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferences),
      });

      const data = await response.json();

      if (response.ok && data?.success) {
        const updatedUser = {
          ...user,
          preferences: { ...(user?.preferences || {}), ...data.data },
        };

        setUser(updatedUser);
        localStorage.setItem("auth_user", JSON.stringify(updatedUser));
        return { success: true, data: data.data };
      }

      return { success: false, error: data?.message || "Update failed" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // ✅ CHANGE PASSWORD
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await fetch("/api/profile/password", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) return { success: true, message: data?.message };
      return { success: false, error: data?.message || "Password update failed" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // ✅ MARK NOTIFICATIONS AS READ
  const markNotificationsAsRead = async (notificationIds) => {
    try {
      const endpoint = Array.isArray(notificationIds)
        ? "/api/notifications/read-all"
        : `/api/notifications/${notificationIds}/read`;

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) return { success: false };

      if (!Array.isArray(notificationIds)) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } else {
        setUnreadCount(0);
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
      return { success: false, error: error.message };
    }
  };

  // ✅ REFRESH NOTIFICATIONS
  const refreshNotifications = async () => {
    await fetchNotifications();
  };

  // ✅ LOGIN
  const login = (userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem("auth_user", JSON.stringify(userData));
    localStorage.setItem("auth_token", jwtToken);
  };

  // ✅ LOGOUT
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_token");
    setNotifications([]);
    setUnreadCount(0);
  };

  const contextValue = {
    user,
    token,
    loading,
    notifications,
    unreadCount,
    login,
    logout,
    updateProfile,
    updatePreferences,
    changePassword,
    markNotificationsAsRead,
    refreshNotifications,
    fetchUserProfile,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
