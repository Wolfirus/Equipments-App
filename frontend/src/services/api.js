const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const apiRequest = async (endpoint, options = {}) => {
  const {
    method = 'GET',
    headers = {},
    body = null,
    requireAuth = false,
    params = {}
  } = options;

  const url = new URL(`${API_BASE_URL}${endpoint}`);

  // Add query parameters
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.append(key, params[key]);
    }
  });

  const requestHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };

  // Add authentication token if required
  if (requireAuth) {
    const token = localStorage.getItem('auth_token');
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    } else {
      throw new ApiError('Authentication required', 401);
    }
  }

  try {
    const response = await fetch(url.toString(), {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : null
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.message || 'Request failed',
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error.message || 'Network error',
      0,
      { originalError: error }
    );
  }
};

// Auth API
export const authAPI = {
  login: async (email, password) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
  },

  register: async (userData) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: userData
    });
  }
};

// Equipment API
export const equipmentAPI = {
  // Get equipment list with filtering and search
  getEquipment: async (params = {}) => {
    return apiRequest('/equipment', {
      requireAuth: true,
      params
    });
  },

  // Get single equipment details
  getEquipmentById: async (id) => {
    return apiRequest(`/equipment/${id}`, {
      requireAuth: true
    });
  },

  // Get equipment availability for specific dates
  getEquipmentAvailability: async (id, startDate, endDate) => {
    return apiRequest(`/equipment/availability/${id}`, {
      requireAuth: true,
      params: {
        start_date: startDate,
        end_date: endDate
      }
    });
  },

  // Create new equipment (admin only)
  createEquipment: async (equipmentData) => {
    return apiRequest('/equipment', {
      method: 'POST',
      requireAuth: true,
      body: equipmentData
    });
  },

  // Update equipment (admin only)
  updateEquipment: async (id, equipmentData) => {
    return apiRequest(`/equipment/${id}`, {
      method: 'PUT',
      requireAuth: true,
      body: equipmentData
    });
  },

  // Delete equipment (admin only)
  deleteEquipment: async (id) => {
    return apiRequest(`/equipment/${id}`, {
      method: 'DELETE',
      requireAuth: true
    });
  },

  // Get equipment statistics
  getEquipmentStats: async () => {
    return apiRequest('/equipment/stats', {
      requireAuth: true
    });
  }
};

// Reservation API
export const reservationAPI = {
  // Get reservations with filtering
  getReservations: async (params = {}) => {
    return apiRequest('/reservations', {
      requireAuth: true,
      params
    });
  },

  // Get single reservation
  getReservationById: async (id) => {
    return apiRequest(`/reservations/${id}`, {
      requireAuth: true
    });
  },

  // Create new reservation
  createReservation: async (reservationData) => {
    return apiRequest('/reservations', {
      method: 'POST',
      requireAuth: true,
      body: reservationData
    });
  },

  // Update reservation
  updateReservation: async (id, updateData) => {
    return apiRequest(`/reservations/${id}`, {
      method: 'PUT',
      requireAuth: true,
      body: updateData
    });
  },

  // Approve reservation (supervisor/admin)
  approveReservation: async (id, notes) => {
    return apiRequest(`/reservations/${id}/approve`, {
      method: 'PUT',
      requireAuth: true,
      body: { notes }
    });
  },

  // Reject reservation (supervisor/admin)
  rejectReservation: async (id, reason) => {
    return apiRequest(`/reservations/${id}/reject`, {
      method: 'PUT',
      requireAuth: true,
      body: { reason }
    });
  },

  // Cancel reservation
  cancelReservation: async (id, reason) => {
    return apiRequest(`/reservations/${id}`, {
      method: 'DELETE',
      requireAuth: true,
      body: { reason }
    });
  },

  // Get reservation statistics
  getReservationStats: async (params = {}) => {
    return apiRequest('/reservations/stats', {
      requireAuth: true,
      params
    });
  }
};

// Category API
export const categoryAPI = {
  // Get all categories
  getCategories: async (params = {}) => {
    return apiRequest('/categories', {
      requireAuth: true,
      params
    });
  },

  // Get category tree structure
  getCategoryTree: async () => {
    return apiRequest('/categories/tree', {
      requireAuth: true
    });
  },

  // Get single category
  getCategoryById: async (id) => {
    return apiRequest(`/categories/${id}`, {
      requireAuth: true
    });
  },

  // Get equipment by category
  getCategoryEquipment: async (id, params = {}) => {
    return apiRequest(`/categories/${id}/equipment`, {
      requireAuth: true,
      params
    });
  },

  // Create new category (admin only)
  createCategory: async (categoryData) => {
    return apiRequest('/categories', {
      method: 'POST',
      requireAuth: true,
      body: categoryData
    });
  },

  // Update category (admin only)
  updateCategory: async (id, categoryData) => {
    return apiRequest(`/categories/${id}`, {
      method: 'PUT',
      requireAuth: true,
      body: categoryData
    });
  },

  // Delete category (admin only)
  deleteCategory: async (id) => {
    return apiRequest(`/categories/${id}`, {
      method: 'DELETE',
      requireAuth: true
    });
  },

  // Reorder categories (admin only)
  reorderCategories: async (id, direction) => {
    return apiRequest(`/categories/${id}/reorder`, {
      method: 'PUT',
      requireAuth: true,
      body: { direction }
    });
  },

  // Get category statistics
  getCategoryStats: async () => {
    return apiRequest('/categories/stats', {
      requireAuth: true
    });
  }
};

// Profile API
export const profileAPI = {
  // Get user profile
  getProfile: async () => {
    return apiRequest('/profile', {
      requireAuth: true
    });
  },

  // Update profile
  updateProfile: async (profileData) => {
    return apiRequest('/profile', {
      method: 'PUT',
      requireAuth: true,
      body: profileData
    });
  },

  // Update preferences
  updatePreferences: async (preferences) => {
    return apiRequest('/profile/preferences', {
      method: 'PUT',
      requireAuth: true,
      body: preferences
    });
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    return apiRequest('/profile/password', {
      method: 'PUT',
      requireAuth: true,
      body: {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: newPassword
      }
    });
  },

  // Get user activity
  getActivity: async (params = {}) => {
    return apiRequest('/profile/activity', {
      requireAuth: true,
      params
    });
  },

  // Get profile statistics
  getProfileStats: async (params = {}) => {
    return apiRequest('/profile/stats', {
      requireAuth: true,
      params
    });
  },

  // Delete user account
  deleteAccount: async (password, confirmation) => {
    return apiRequest('/profile', {
      method: 'DELETE',
      requireAuth: true,
      body: {
        password,
        confirmation
      }
    });
  }
};

// Notification API
export const notificationAPI = {
  // Get notifications
  getNotifications: async (params = {}) => {
    return apiRequest('/notifications', {
      requireAuth: true,
      params
    });
  },

  // Get unread notifications
  getUnreadNotifications: async (params = {}) => {
    return apiRequest('/notifications/unread', {
      requireAuth: true,
      params
    });
  },

  // Get single notification
  getNotificationById: async (id) => {
    return apiRequest(`/notifications/${id}`, {
      requireAuth: true
    });
  },

  // Mark notification as read
  markAsRead: async (id) => {
    return apiRequest(`/notifications/${id}/read`, {
      method: 'PUT',
      requireAuth: true
    });
  },

  // Mark all notifications as read
  markAllAsRead: async (params = {}) => {
    return apiRequest('/notifications/read-all', {
      method: 'PUT',
      requireAuth: true,
      params
    });
  },

  // Delete notification
  deleteNotification: async (id) => {
    return apiRequest(`/notifications/${id}`, {
      method: 'DELETE',
      requireAuth: true
    });
  },

  // Batch delete notifications
  batchDeleteNotifications: async (notificationIds) => {
    return apiRequest('/notifications/batch', {
      method: 'DELETE',
      requireAuth: true,
      body: { notification_ids: notificationIds }
    });
  },

  // Create notification (admin/supervisor)
  createNotification: async (notificationData) => {
    return apiRequest('/notifications', {
      method: 'POST',
      requireAuth: true,
      body: notificationData
    });
  },

  // Get notification queue (admin only)
  getNotificationQueue: async (params = {}) => {
    return apiRequest('/notifications/queue', {
      requireAuth: true,
      params
    });
  },

  // Process notification queue (admin only)
  processNotificationQueue: async (params = {}) => {
    return apiRequest('/notifications/process-queue', {
      method: 'POST',
      requireAuth: true,
      body: params
    });
  },

  // Get notification statistics
  getNotificationStats: async () => {
    return apiRequest('/notifications/stats', {
      requireAuth: true
    });
  }
};

// Admin API
export const adminAPI = {
  // Get dashboard statistics
  getDashboardStats: async (params = {}) => {
    return apiRequest('/admin/stats', {
      requireAuth: true,
      params
    });
  },

  // Get system activity
  getActivity: async (params = {}) => {
    return apiRequest('/admin/activity', {
      requireAuth: true,
      params
    });
  },

  // Get reports
  getReports: async (params = {}) => {
    return apiRequest('/admin/reports', {
      requireAuth: true,
      params
    });
  },

  // Get system health
  getHealth: async () => {
    return apiRequest('/admin/health', {
      requireAuth: true
    });
  },

  // Get maintenance information
  getMaintenance: async () => {
    return apiRequest('/admin/maintenance', {
      requireAuth: true
    });
  },

  // Execute system actions
  executeSystemAction: async (action, parameters = {}) => {
    return apiRequest('/admin/system-actions', {
      method: 'POST',
      requireAuth: true,
      body: {
        action,
        parameters
      }
    });
  }
};

// Users API (existing functionality)
export const usersAPI = {
  // Get users (admin/supervisor)
  getUsers: async (params = {}) => {
    return apiRequest('/users', {
      requireAuth: true,
      params
    });
  },

  // Update user (admin only)
  updateUser: async (id, userData) => {
    return apiRequest(`/users/${id}`, {
      method: 'PUT',
      requireAuth: true,
      body: userData
    });
  },

  // Delete user (admin only)
  deleteUser: async (id) => {
    return apiRequest(`/users/${id}`, {
      method: 'DELETE',
      requireAuth: true
    });
  }
};

// Messages API (existing functionality)
export const messagesAPI = {
  // Submit contact form
  submitMessage: async (messageData) => {
    return apiRequest('/messages', {
      method: 'POST',
      body: messageData
    });
  },

  // Get messages (admin)
  getMessages: async () => {
    return apiRequest('/messages', {
      requireAuth: true
    });
  },

  // Delete message (admin)
  deleteMessage: async (id) => {
    return apiRequest(`/messages/${id}`, {
      method: 'DELETE',
      requireAuth: true
    });
  }
};

// Error handling utilities
export const handleApiError = (error) => {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        // Unauthorized - redirect to login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.href = '/login';
        break;
      case 403:
        // Forbidden - insufficient permissions
        return 'Vous n\'avez pas les permissions nécessaires pour cette action.';
      case 404:
        // Not found
        return 'Ressource non trouvée.';
      case 409:
        // Conflict
        return error.data?.message || 'Conflit détecté.';
      case 422:
        // Validation error
        return error.data?.errors?.join(', ') || 'Données invalides.';
      case 500:
        // Server error
        return 'Erreur serveur. Veuillez réessayer plus tard.';
      default:
        return error.message || 'Une erreur est survenue.';
    }
  }
  return error.message || 'Une erreur est survenue.';
};

export default apiRequest;