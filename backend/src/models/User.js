const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: { type: String, required: true, minlength: 6 },

    role: {
      type: String,
      enum: ["user", "supervisor", "admin"],
      default: "user",
      required: true,
    },

    // ✅ (optionnel) avatar “filename” si tu veux un upload plus tard
    avatar: { type: String, default: "" },

    // Enhanced profile fields (utilisés par profileRoutes/adminRoutes)
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
        "Maintenance",
      ],
      default: "General",
    },

    bio: { type: String, maxlength: 500, trim: true, default: "" },

    avatar_url: {
      type: String,
      trim: true,
      default: "",
      validate: {
        validator: function (v) {
          return !v || /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
        },
        message: "Avatar URL must be a valid image URL",
      },
    },

    preferences: {
      notifications: {
        email: { type: Boolean, default: true },
        browser: { type: Boolean, default: true },
        reservation_reminders: { type: Boolean, default: true },
        equipment_available: { type: Boolean, default: true },
        system_updates: { type: Boolean, default: false },
      },
      language: { type: String, enum: ["en", "fr"], default: "en" },
      theme: { type: String, enum: ["light", "dark", "auto"], default: "auto" },
    },

    stats: {
      total_reservations: { type: Number, default: 0 },
      active_reservations: { type: Number, default: 0 },
      completed_reservations: { type: Number, default: 0 },
      cancelled_reservations: { type: Number, default: 0 },
      return_rate: { type: Number, default: 100 },
      last_activity: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

// ✅ Hash password avant sauvegarde
UserSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ✅ Vérification mot de passe
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
