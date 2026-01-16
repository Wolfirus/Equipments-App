const mongoose = require("mongoose");

/**
 * EquipmentSchema
 * Un équipement réservable.
 * Champs utilisés dans le projet :
 * - name, description, category
 * - total_quantity, available_quantity
 * - status
 * - images, location
 * - rental_info, visibility
 */
const EquipmentSchema = new mongoose.Schema(
  {
    // Nom de l'équipement
    name: { type: String, required: true, trim: true, maxlength: 100 },

    // Description
    description: { type: String, required: true, trim: true, maxlength: 1000 },

    // Catégorie (simple string)
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
        "Other",
      ],
    },

    // Quantité totale (stock réel)
    total_quantity: { type: Number, required: true, min: 1, default: 1 },

    /**
     * Quantité disponible "maintenant"
     * ⚠️ La vraie disponibilité sur une période est calculée via /availability
     */
    available_quantity: {
      type: Number,
      min: 0,
      default: undefined, // ✅ évite un default "1" trompeur
      validate: {
        validator: function (v) {
          if (v === undefined || v === null) return true;
          return v <= this.total_quantity;
        },
        message: "available_quantity ne peut pas dépasser total_quantity",
      },
    },

    // Etat global
    status: {
      type: String,
      enum: ["available", "maintenance", "retired"],
      default: "available",
      index: true,
    },

    // Lieu (optionnel)
    location: { type: String, trim: true, maxlength: 200, default: "" },

    // Liste d'URLs (simple)
    images: { type: [String], default: [] },

    // Politique de réservation
    rental_info: {
      requires_approval: { type: Boolean, default: true },
      max_rental_duration_days: { type: Number, min: 1, default: 30 },
    },

    // Visibilité / restrictions
    visibility: {
      is_public: { type: Boolean, default: true },
      restricted_to_departments: { type: [String], default: [] },
      minimum_user_role: {
        type: String,
        enum: ["user", "supervisor", "admin"],
        default: "user",
      },
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

/**
 * Virtual : l'équipement est "réservable" si
 * - status=available
 * - stock disponible > 0
 */
EquipmentSchema.virtual("is_available").get(function () {
  return this.status === "available" && (this.available_quantity ?? 0) > 0;
});

// Indexes utiles (recherche + filtres)
EquipmentSchema.index({ name: "text", description: "text" });
EquipmentSchema.index({ category: 1, status: 1 });

/**
 * Si available_quantity n'est pas défini au create,
 * on le met = total_quantity
 */
EquipmentSchema.pre("validate", function (next) {
  if (this.available_quantity === undefined || this.available_quantity === null) {
    this.available_quantity = this.total_quantity;
  }
  next();
});

/**
 * Si l'équipement est retiré, il ne doit plus être disponible.
 * ⚠️ On ne reset PAS available_quantity quand status redevient available
 * car la disponibilité par période est gérée par les réservations.
 */
EquipmentSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status === "retired") {
    this.available_quantity = 0;
  }
  next();
});

module.exports = mongoose.model("Equipment", EquipmentSchema);
