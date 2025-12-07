const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      required: true,
      enum: [
        'reservation_created',
        'reservation_approved',
        'reservation_rejected',
        'reservation_reminder',
        'reservation_cancelled',
        'reservation_completed',
        'reservation_overdue',
        'equipment_available',
        'equipment_maintenance',
        'equipment_retired',
        'equipment_due_soon',
        'equipment_return_reminder',
        'payment_due',
        'payment_overdue',
        'payment_received',
        'payment_refunded',
        'system_update',
        'profile_updated',
        'role_changed',
        'equipment_added',
        'new_equipment_in_category'
      ],
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    read: {
      type: Boolean,
      default: false,
      index: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    action_required: {
      type: Boolean,
      default: false
    },
    action_url: {
      type: String,
      trim: true,
      maxlength: 500
    },
    action_text: {
      type: String,
      trim: true,
      maxlength: 50
    },
    related_entity: {
      type: {
        type: String,
        enum: ['reservation', 'equipment', 'user', 'payment', 'system']
      },
      id: {
        type: mongoose.Schema.Types.ObjectId
      },
      model: {
        type: String,
        enum: ['Reservation', 'Equipment', 'User', 'Payment', 'System']
      }
    },
    delivery_methods: {
      browser: {
        delivered: {
          type: Boolean,
          default: false
        },
        delivered_at: Date,
        viewed: {
          type: Boolean,
          default: false
        },
        viewed_at: Date
      },
      email: {
        delivered: {
          type: Boolean,
          default: false
        },
        delivered_at: Date,
        sent: {
          type: Boolean,
          default: false
        },
        sent_at: Date,
        error: String
      },
      sms: {
        delivered: {
          type: Boolean,
          default: false
        },
        delivered_at: Date,
        sent: {
          type: Boolean,
          default: false
        },
        sent_at: Date,
        error: String
      }
    },
    scheduling: {
      send_immediately: {
        type: Boolean,
        default: true
      },
      scheduled_for: Date,
      recurring: {
        enabled: {
          type: Boolean,
          default: false
        },
        interval: {
          type: String,
          enum: ['daily', 'weekly', 'monthly', 'yearly']
        },
        next_send: Date,
        end_date: Date
      },
      expires_at: Date
    },
    metadata: {
      source: {
        type: String,
        enum: ['system', 'user_action', 'admin_action', 'automated'],
        default: 'system'
      },
      category: {
        type: String,
        enum: ['reservations', 'equipment', 'payments', 'profile', 'system', 'marketing'],
        default: 'system'
      },
      template: String,
      template_data: mongoose.Schema.Types.Mixed,
      custom_data: mongoose.Schema.Types.Mixed
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtuals
NotificationSchema.virtual('is_expired').get(function() {
  return this.scheduling.expires_at && new Date() > this.scheduling.expires_at;
});

NotificationSchema.virtual('should_send_now').get(function() {
  const now = new Date();

  if (this.read || this.is_expired) return false;

  if (this.scheduling.send_immediately) return true;

  if (this.scheduling.scheduled_for && now >= this.scheduling.scheduled_for) return true;

  if (this.scheduling.recurring.enabled &&
      this.scheduling.recurring.next_send &&
      now >= this.scheduling.recurring.next_send &&
      (!this.scheduling.recurring.end_date || now <= this.scheduling.recurring.end_date)) {
    return true;
  }

  return false;
});

// Indexes for performance
NotificationSchema.index({ user_id: 1, read: 1, created_at: -1 });
NotificationSchema.index({ user_id: 1, type: 1, created_at: -1 });
NotificationSchema.index({ created_at: -1 });
NotificationSchema.index({ 'scheduling.scheduled_for': 1 });
NotificationSchema.index({ 'scheduling.expires_at': 1 });

// Pre-save middleware
NotificationSchema.pre('save', async function(next) {
  // Auto-set scheduling next_send for recurring notifications
  if (this.scheduling.recurring.enabled && !this.scheduling.recurring.next_send) {
    const now = new Date();
    let nextSend = new Date(now);

    switch (this.scheduling.recurring.interval) {
      case 'daily':
        nextSend.setDate(nextSend.getDate() + 1);
        break;
      case 'weekly':
        nextSend.setDate(nextSend.getDate() + 7);
        break;
      case 'monthly':
        nextSend.setMonth(nextSend.getMonth() + 1);
        break;
      case 'yearly':
        nextSend.setFullYear(nextSend.getFullYear() + 1);
        break;
    }

    this.scheduling.recurring.next_send = nextSend;
  }

  next();
});

// Static methods
NotificationSchema.statics.createNotification = async function(data) {
  const notification = new this(data);
  await notification.save();

  // Trigger delivery if needed
  if (notification.should_send_now) {
    await notification.deliver();
  }

  return notification;
};

NotificationSchema.statics.findUnreadByUser = function(userId, options = {}) {
  const query = {
    user_id: userId,
    read: false,
    $or: [
      { 'scheduling.expires_at': { $exists: false } },
      { 'scheduling.expires_at': { $gt: new Date() } }
    ]
  };

  if (options.type) {
    query.type = options.type;
  }

  if (options.priority) {
    query.priority = options.priority;
  }

  return this.find(query)
    .sort({ priority: -1, created_at: -1 })
    .limit(options.limit || 50);
};

NotificationSchema.statics.markAllAsRead = async function(userId) {
  return this.updateMany(
    { user_id: userId, read: false },
    {
      $set: {
        read: true,
        'delivery_methods.browser.viewed': true,
        'delivery_methods.browser.viewed_at': new Date()
      }
    }
  );
};

NotificationSchema.statics.getPendingDeliveries = function() {
  return this.find({
    $or: [
      { 'delivery_methods.browser.delivered': false },
      { 'delivery_methods.email.sent': false },
      { 'delivery_methods.sms.sent': false }
    ],
    $and: [
      {
        $or: [
          { 'scheduling.expires_at': { $exists: false } },
          { 'scheduling.expires_at': { $gt: new Date() } }
        ]
      }
    ]
  });
};

// Instance methods
NotificationSchema.methods.markAsRead = async function() {
  this.read = true;
  this.delivery_methods.browser.viewed = true;
  this.delivery_methods.browser.viewed_at = new Date();
  return this.save();
};

NotificationSchema.methods.deliver = async function() {
  const User = mongoose.model('User');
  const user = await User.findById(this.user_id);

  if (!user || !user.preferences.notifications.browser) {
    return;
  }

  // Browser notification (already stored in database)
  this.delivery_methods.browser.delivered = true;
  this.delivery_methods.browser.delivered_at = new Date();

  // Email notification (placeholder for email service integration)
  if (user.preferences.notifications.email && !this.delivery_methods.email.sent) {
    try {
      // TODO: Integrate with email service
      // await emailService.send(user.email, this.title, this.message);
      this.delivery_methods.email.sent = true;
      this.delivery_methods.email.sent_at = new Date();
    } catch (error) {
      this.delivery_methods.email.error = error.message;
    }
  }

  // Schedule next recurring notification if needed
  if (this.scheduling.recurring.enabled) {
    const now = new Date();
    let nextSend = new Date(now);

    switch (this.scheduling.recurring.interval) {
      case 'daily':
        nextSend.setDate(nextSend.getDate() + 1);
        break;
      case 'weekly':
        nextSend.setDate(nextSend.getDate() + 7);
        break;
      case 'monthly':
        nextSend.setMonth(nextSend.getMonth() + 1);
        break;
      case 'yearly':
        nextSend.setFullYear(nextSend.getFullYear() + 1);
        break;
    }

    if (!this.scheduling.recurring.end_date || nextSend <= this.scheduling.recurring.end_date) {
      this.scheduling.recurring.next_send = nextSend;
    } else {
      this.scheduling.recurring.enabled = false;
    }
  }

  return this.save();
};

// Helper methods for creating different notification types
NotificationSchema.statics.reservationCreated = async function(userId, reservationId, equipmentName, startDate) {
  return this.createNotification({
    user_id: userId,
    type: 'reservation_created',
    title: 'Reservation Confirmed',
    message: `Your reservation for ${equipmentName} has been created and is pending approval.`,
    priority: 'medium',
    action_required: true,
    action_url: `/reservations/${reservationId}`,
    action_text: 'View Reservation',
    related_entity: {
      type: 'reservation',
      id: reservationId,
      model: 'Reservation'
    },
    metadata: {
      source: 'user_action',
      category: 'reservations'
    }
  });
};

NotificationSchema.statics.equipmentAvailable = async function(userId, equipmentName, equipmentId) {
  return this.createNotification({
    user_id: userId,
    type: 'equipment_available',
    title: 'Equipment Available',
    message: `${equipmentName} is now available for reservation.`,
    priority: 'low',
    action_required: true,
    action_url: `/equipment/${equipmentId}`,
    action_text: 'Reserve Now',
    related_entity: {
      type: 'equipment',
      id: equipmentId,
      model: 'Equipment'
    },
    metadata: {
      source: 'automated',
      category: 'equipment'
    }
  });
};

module.exports = mongoose.model("Notification", NotificationSchema);