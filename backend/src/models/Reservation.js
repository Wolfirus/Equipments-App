const mongoose = require("mongoose");

const ReservationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    equipment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Equipment',
      required: true,
      index: true
    },
    start_date: {
      type: Date,
      required: true,
      validate: {
        validator: function(v) {
          return v > new Date();
        },
        message: 'Start date must be in the future'
      }
    },
    end_date: {
      type: Date,
      required: true,
      validate: {
        validator: function(v) {
          return v > this.start_date;
        },
        message: 'End date must be after start date'
      }
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'active', 'completed', 'cancelled', 'overdue'],
      default: 'pending',
      index: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    purpose: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },
    approval_details: {
      approved_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      approved_at: Date,
      approval_notes: {
        type: String,
        trim: true,
        maxlength: 500
      },
      requires_supervisor_approval: {
        type: Boolean,
        default: false
      }
    },
    payment_details: {
      deposit_paid: {
        type: Boolean,
        default: false
      },
      deposit_amount: {
        type: Number,
        min: 0,
        default: 0
      },
      total_cost: {
        type: Number,
        min: 0,
        default: 0
      },
      payment_method: {
        type: String,
        enum: ['cash', 'card', 'transfer', 'internal'],
        default: 'internal'
      },
      payment_status: {
        type: String,
        enum: ['pending', 'paid', 'refunded', 'partial'],
        default: 'pending'
      }
    },
    usage_tracking: {
      actual_start_date: Date,
      actual_end_date: Date,
      pickup_confirmed_at: Date,
      return_confirmed_at: Date,
      condition_on_checkout: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor'],
        default: 'good'
      },
      condition_on_return: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor', 'damaged'],
        default: 'good'
      },
      damage_notes: {
        type: String,
        trim: true,
        maxlength: 1000
      },
      additional_charges: {
        type: Number,
        min: 0,
        default: 0
      },
      damage_fees: {
        type: Number,
        min: 0,
        default: 0
      }
    },
    ratings: {
      user_rating: {
        type: Number,
        min: 1,
        max: 5
      },
      equipment_rating: {
        type: Number,
        min: 1,
        max: 5
      },
      user_feedback: {
        type: String,
        trim: true,
        maxlength: 500
      },
      equipment_feedback: {
        type: String,
        trim: true,
        maxlength: 500
      }
    },
    notifications: {
      reminder_sent: {
        type: Boolean,
        default: false
      },
      overdue_notices_sent: {
        type: Number,
        default: 0
      },
      pickup_reminder_sent: {
        type: Boolean,
        default: false
      },
      return_reminder_sent: {
        type: Boolean,
        default: false
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtuals
ReservationSchema.virtual('duration_days').get(function() {
  const end = this.actual_end_date || this.end_date;
  const start = this.actual_start_date || this.start_date;
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
});

ReservationSchema.virtual('duration_hours').get(function() {
  const end = this.actual_end_date || this.end_date;
  const start = this.actual_start_date || this.start_date;
  return Math.ceil((end - start) / (1000 * 60 * 60));
});

ReservationSchema.virtual('is_active').get(function() {
  const now = new Date();
  const start = this.actual_start_date || this.start_date;
  const end = this.actual_end_date || this.end_date;
  return this.status === 'active' && now >= start && now <= end;
});

ReservationSchema.virtual('is_overdue').get(function() {
  const now = new Date();
  const end = this.actual_end_date || this.end_date;
  return this.status === 'active' && now > end;
});

ReservationSchema.virtual('is_upcoming').get(function() {
  const now = new Date();
  const start = this.actual_start_date || this.start_date;
  return this.status === 'approved' && now < start;
});

// Compound indexes
ReservationSchema.index({ equipment_id: 1, start_date: 1, end_date: 1 });
ReservationSchema.index({ user_id: 1, status: 1 });
ReservationSchema.index({ status: 1, start_date: 1 });
ReservationSchema.index({ end_date: 1, status: 1 });

// Pre-save validation for conflicts
ReservationSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('start_date') || this.isModified('end_date') || this.isModified('quantity')) {
    if (this.status === 'cancelled') {
      return next();
    }

    const Equipment = mongoose.model('Equipment');
    const equipment = await Equipment.findById(this.equipment_id);

    if (!equipment) {
      return next(new Error('Equipment not found'));
    }

    if (equipment.available_quantity < this.quantity) {
      return next(new Error('Not enough equipment available'));
    }

    // Check for conflicts only for approved or active reservations
    if (['approved', 'active'].includes(this.status)) {
      const conflictingReservation = await this.constructor.findOne({
        _id: { $ne: this._id },
        equipment_id: this.equipment_id,
        status: { $in: ['approved', 'active'] },
        $or: [
          {
            start_date: { $lte: this.start_date },
            end_date: { $gte: this.start_date }
          },
          {
            start_date: { $lte: this.end_date },
            end_date: { $gte: this.end_date }
          },
          {
            start_date: { $gte: this.start_date },
            end_date: { $lte: this.end_date }
          }
        ]
      });

      if (conflictingReservation) {
        const totalRequestedQuantity = conflictingReservation.quantity + this.quantity;
        if (totalRequestedQuantity > equipment.total_quantity) {
          return next(new Error('Equipment already reserved for the selected dates'));
        }
      }
    }
  }
  next();
});

// Post-save middleware to update equipment availability
ReservationSchema.post('save', async function(doc) {
  const Equipment = mongoose.model('Equipment');
  const equipment = await Equipment.findById(doc.equipment_id);

  if (!equipment) return;

  // Update equipment stats
  const activeReservations = await mongoose.model('Reservation')
    .find({ equipment_id: doc.equipment_id, status: 'active' });

  const totalQuantity = activeReservations.reduce((sum, res) => sum + res.quantity, 0);
  equipment.available_quantity = equipment.total_quantity - totalQuantity;
  equipment.usage_stats.active_rentals = activeReservations.length;

  if (doc.status === 'completed') {
    equipment.usage_stats.total_rentals += 1;
    equipment.usage_stats.last_rented = new Date();
  }

  await equipment.save();
});

// Static methods
ReservationSchema.statics.findOverdueReservations = function() {
  return this.find({
    status: 'active',
    end_date: { $lt: new Date() }
  });
};

ReservationSchema.statics.findUpcomingReservations = function(daysAhead = 7) {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + daysAhead);

  return this.find({
    status: 'approved',
    start_date: { $gte: startDate, $lte: endDate }
  });
};

ReservationSchema.statics.getUserReservations = function(userId, options = {}) {
  const query = { user_id: userId };
  if (options.status) query.status = options.status;
  if (options.equipment_id) query.equipment_id = options.equipment_id;
  if (options.start_date && options.end_date) {
    query.start_date = { $gte: options.start_date };
    query.end_date = { $lte: options.end_date };
  }

  return this.find(query)
    .populate('equipment_id', 'name description category images')
    .sort({ created_at: -1 });
};

module.exports = mongoose.model("Reservation", ReservationSchema);