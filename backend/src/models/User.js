const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["user", "supervisor", "admin"],
      default: "user",
      required: true,
    },
    // Enhanced profile fields
    phone: {
      type: String,
      trim: true,
      match: /^\+?[1-9]\d{1,14}$/,
      default: "",
    },
    department: {
      type: String,
      enum: [
        "General",
        "IT",
        "HR",
        "Finance",
        "Marketing",
        "Operations",
        "Research",
        "Development",
        "Sales",
        "Support",
        "Maintenance"
      ],
      default: "General",
    },
    bio: {
      type: String,
      maxlength: 500,
      trim: true,
      default: "",
    },
    avatar_url: {
      type: String,
      trim: true,
      default: "",
      validate: {
        validator: function(v) {
          return !v || /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
        },
        message: 'Avatar URL must be a valid image URL'
      }
    },
    preferences: {
      notifications: {
        email: { type: Boolean, default: true },
        browser: { type: Boolean, default: true },
        reservation_reminders: { type: Boolean, default: true },
        equipment_available: { type: Boolean, default: true },
        system_updates: { type: Boolean, default: false }
      },
      language: { type: String, enum: ['en', 'fr'], default: 'en' },
      theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' }
    },
    stats: {
      total_reservations: { type: Number, default: 0 },
      active_reservations: { type: Number, default: 0 },
      completed_reservations: { type: Number, default: 0 },
      cancelled_reservations: { type: Number, default: 0 },
      return_rate: { type: Number, default: 100 },
      last_activity: { type: Date, default: Date.now }
    }
  },
  { timestamps: true }
);
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "user", enum: ["user", "supervisor", "admin"] },
  avatar: { type: String, default: "" },
}, { timestamps: true });

// Hash password avant sauvegarde
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Vérification mot de passe
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
