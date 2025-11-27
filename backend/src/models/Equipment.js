const mongoose = require("mongoose");

const EquipmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Computers",
        "Audio/Video",
        "Office Equipment",
        "Tools",
        "Sports",
        "Laboratory",
        "Medical",
        "Photography",
        "Gaming",
        "Kitchen",
        "Cleaning",
        "Safety",
        "Other"
      ],
      index: true
    },
    total_quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    available_quantity: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function(v) {
          return v <= this.total_quantity;
        },
        message: 'Available quantity cannot exceed total quantity'
      }
    },
    status: {
      type: String,
      enum: ['available', 'maintenance', 'retired'],
      default: 'available'
    },
    location: {
      type: String,
      trim: true,
      maxlength: 200,
      default: ""
    },
    specifications: {
      brand: { type: String, trim: true, default: "" },
      model: { type: String, trim: true, default: "" },
      serial_number: { type: String, trim: true, default: "" },
      year_manufactured: { type: Number, min: 1900, max: new Date().getFullYear() + 1 },
      weight: { type: Number, min: 0 },
      dimensions: {
        length: { type: Number, min: 0 },
        width: { type: Number, min: 0 },
        height: { type: Number, min: 0 },
        unit: { type: String, enum: ['cm', 'inches'], default: 'cm' }
      },
      color: { type: String, trim: true, default: "" },
      material: { type: String, trim: true, default: "" },
      power_requirements: {
        voltage: { type: Number, min: 0 },
        frequency: { type: Number, min: 0 },
        power_consumption: { type: Number, min: 0 }
      },
      condition: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor'],
        default: 'good'
      },
      accessories: [{ type: String, trim: true }],
      notes: { type: String, trim: true, maxlength: 500, default: "" }
    },
    images: [{
      type: String,
      validate: {
        validator: function(v) {
          return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
        },
        message: 'Each image must be a valid image URL'
      }
    }],
    rental_info: {
      deposit_required: { type: Number, min: 0, default: 0 },
      hourly_rate: { type: Number, min: 0, default: 0 },
      daily_rate: { type: Number, min: 0, default: 0 },
      weekly_rate: { type: Number, min: 0, default: 0 },
      monthly_rate: { type: Number, min: 0, default: 0 },
      max_rental_duration_days: { type: Number, min: 1, default: 30 },
      min_rental_duration_hours: { type: Number, min: 1, default: 1 },
      requires_approval: { type: Boolean, default: false },
      requires_training: { type: Boolean, default: false }
    },
    usage_stats: {
      total_rentals: { type: Number, default: 0 },
      active_rentals: { type: Number, default: 0 },
      total_rental_days: { type: Number, default: 0 },
      last_rented: { type: Date },
      average_rating: { type: Number, min: 1, max: 5, default: 5 },
      maintenance_count: { type: Number, default: 0 },
      last_maintenance: { type: Date }
    },
    visibility: {
      is_public: { type: Boolean, default: true },
      restricted_to_departments: [{ type: String }],
      minimum_user_role: {
        type: String,
        enum: ['user', 'supervisor', 'admin'],
        default: 'user'
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for utilization rate
EquipmentSchema.virtual('utilization_rate').get(function() {
  return this.total_quantity > 0 ?
    ((this.total_quantity - this.available_quantity) / this.total_quantity * 100) : 0;
});

// Virtual for availability status
EquipmentSchema.virtual('is_available').get(function() {
  return this.status === 'available' && this.available_quantity > 0;
});

// Indexes for search performance
EquipmentSchema.index({ name: 'text', description: 'text' });
EquipmentSchema.index({ category: 1, status: 1 });
EquipmentSchema.index({ 'usage_stats.total_rentals': -1 });

// Pre-save middleware to update availability based on status
EquipmentSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'retired') {
    this.available_quantity = 0;
  } else if (this.isModified('status') && this.status === 'available') {
    this.available_quantity = this.total_quantity;
  }
  next();
});

module.exports = mongoose.model("Equipment", EquipmentSchema);