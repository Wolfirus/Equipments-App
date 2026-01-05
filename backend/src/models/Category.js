const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 50,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      // ❌ index: true supprimé (évite le doublon)
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    icon: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          return (
            !v ||
            /^https?:\/\/.+\.(svg|jpg|jpeg|png|gif|webp)$/i.test(v)
          );
        },
        message: "Icon must be a valid image URL",
      },
    },

    color: {
      type: String,
      trim: true,
      match: /^#[0-9A-Fa-f]{6}$/,
      default: "#6366f1",
    },

    parent_category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    order: {
      type: Number,
      default: 0,
    },

    is_active: {
      type: Boolean,
      default: true,
    },

    equipment_count: {
      type: Number,
      default: 0,
    },

    total_rentals: {
      type: Number,
      default: 0,
    },

    settings: {
      requires_approval: {
        type: Boolean,
        default: false,
      },
      max_rental_duration_days: {
        type: Number,
        min: 1,
        default: 30,
      },
      min_user_role: {
        type: String,
        enum: ["user", "supervisor", "admin"],
        default: "user",
      },
      allowed_departments: [
        {
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
        },
      ],
      deposit_required: {
        type: Boolean,
        default: false,
      },
      training_required: {
        type: Boolean,
        default: false,
      },
    },

    metadata: {
      seo_title: {
        type: String,
        trim: true,
        maxlength: 60,
      },
      seo_description: {
        type: String,
        trim: true,
        maxlength: 160,
      },
      tags: [
        {
          type: String,
          trim: true,
          maxlength: 30,
        },
      ],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ================= VIRTUALS ================= */

CategorySchema.virtual("has_children", {
  ref: "Category",
  localField: "_id",
  foreignField: "parent_category",
  count: true,
});

CategorySchema.virtual("full_path").get(function () {
  return this.name;
});

/* ================= STATICS ================= */

CategorySchema.statics.findActiveCategories = function () {
  return this.find({ is_active: true }).sort({ order: 1, name: 1 });
};

CategorySchema.statics.findRootCategories = function () {
  return this.find({
    parent_category: null,
    is_active: true,
  }).sort({ order: 1, name: 1 });
};

CategorySchema.statics.updateEquipmentCounts = async function () {
  const Equipment = mongoose.model("Equipment");
  const categories = await this.find({});

  for (const category of categories) {
    const count = await Equipment.countDocuments({
      category: category.name,
      status: { $ne: "retired" },
    });

    if (count !== category.equipment_count) {
      category.equipment_count = count;
      await category.save();
    }
  }
};

/* ================= MIDDLEWARE ================= */

CategorySchema.pre("save", function (next) {
  if (this.isModified("name") && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  next();
});

/* ================= INDEXES ================= */

// ✅ slug index déjà créé via unique: true
CategorySchema.index({ parent_category: 1 });
CategorySchema.index({ is_active: 1, order: 1 });

module.exports = mongoose.model("Category", CategorySchema);
