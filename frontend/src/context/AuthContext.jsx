import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);   // { id, name, email, role }
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("auth_user");
      const storedToken = localStorage.getItem("auth_token");

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
    setLoading(false);
  }, []);

  // Fetch user profile data when user is logged in
  useEffect(() => {
    if (user && token) {
      fetchUserProfile();
      fetchNotifications();
    }
  }, [user, token]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update user with enhanced profile data
          setUser(prevUser => ({
            ...prevUser,
            ...data.data
          }));

          // Update localStorage with new user data
          localStorage.setItem("auth_user", JSON.stringify({
            ...user,
            ...data.data
          }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications/unread?limit=10', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotifications(data.data.notifications || []);
          setUnreadCount(data.data.count || 0);
        }
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update local user state
          setUser(prevUser => ({
            ...prevUser,
            ...data.data
          }));

          // Update localStorage
          localStorage.setItem("auth_user", JSON.stringify({
            ...user,
            ...data.data
          }));

          return { success: true, data: data.data };
        }
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.message };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const updatePreferences = async (preferences) => {
    try {
      const response = await fetch('/api/profile/preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update user preferences in local state
          setUser(prevUser => ({
            ...prevUser,
            preferences: {
              ...prevUser.preferences,
              ...data.data
            }
          }));

          // Update localStorage
          const updatedUser = {
            ...user,
            preferences: {
              ...user.preferences,
              ...data.data
            }
          };
          localStorage.setItem("auth_user", JSON.stringify(updatedUser));

          return { success: true, data: data.data };
        }
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.message };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: newPassword
        })
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, message: data.message };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.message };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const markNotificationsAsRead = async (notificationIds) => {
    try {
      if (!Array.isArray(notificationIds)) {
        // Single notification
        const response = await fetch(`/api/notifications/${notificationIds}/read`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          setUnreadCount(prev => Math.max(0, prev - 1));
          return { success: true };
        }
      } else {
        // Multiple notifications - mark all as read
        const response = await fetch('/api/notifications/read-all', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          setUnreadCount(0);
          return { success: true };
        }
      }
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
      return { success: false, error: error.message };
    }
  };

  const refreshNotifications = async () => {
    await fetchNotifications();
  };

  // Connexion
  const login = (userData, jwtToken) => {
    // Merge with any existing enhanced data
    const fullUserData = {
      ...userData,
      // Default profile fields that might not be in login response
      phone: userData.phone || "",
      department: userData.department || "General",
      bio: userData.bio || "",
      avatar_url: userData.avatar_url || "",
      preferences: userData.preferences || {
        notifications: {
          email: true,
          browser: true,
          reservation_reminders: true,
          equipment_available: true,
          system_updates: false
        },
        language: 'en',
        theme: 'auto'
      },
      stats: userData.stats || {
        total_reservations: 0,
        active_reservations: 0,
        completed_reservations: 0,
        cancelled_reservations: 0,
        return_rate: 100,
        last_activity: new Date()
      }
    };

    setUser(fullUserData);
    setToken(jwtToken);
    localStorage.setItem("auth_user", JSON.stringify(userData));
    localStorage.setItem("auth_token", jwtToken);
  };

  // Déconnexion
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_token");
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
    fetchUserProfile
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
