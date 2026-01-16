const mongoose = require("mongoose");

/**
 * ReservationSchema
 * Représente une demande de réservation d'un équipement
 *
 * Logique importante:
 * - Le stock n'est PAS décrémenté globalement dans Equipment.available_quantity
 * - La disponibilité se calcule par période via:
 *   - /api/equipment/:id/availability
 *   - et dans reservationRoutes (overlap + total_quantity)
 */
const ReservationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    equipment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Equipment",
      required: true,
      index: true,
    },

    // Date de début de réservation
    start_date: {
      type: Date,
      required: true,
    },

    // Date de fin de réservation
    end_date: {
      type: Date,
      required: true,
    },

    /**
     * Statut:
     * - pending   : en attente de validation
     * - approved  : validée (réservée)
     * - rejected  : refusée
     * - cancelled : annulée
     *
     * (Tu peux ajouter active/completed plus tard si tu veux)
     */
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },

    // Quantité demandée
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    // Motif / usage demandé
    purpose: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    // Notes optionnelles
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    // Motif de refus (si rejected)
    rejection_reason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  {
    timestamps: true, // createdAt / updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ================= VALIDATIONS ================= */

/**
 * Validation: end_date doit être >= start_date
 * (On met une validation simple ici, et le check "stock par période"
 * se fait dans reservationRoutes au moment du create/approve)
 */
ReservationSchema.pre("validate", function (next) {
  if (this.start_date && this.end_date && this.start_date > this.end_date) {
    return next(new Error("Période invalide: start_date > end_date"));
  }
  next();
});

/* ================= VIRTUALS ================= */

/**
 * Durée en jours (ex: 12/03 -> 12/03 = 1 jour)
 */
ReservationSchema.virtual("duration_days").get(function () {
  if (!this.start_date || !this.end_date) return 0;
  const ms = this.end_date - this.start_date;
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
});

/* ================= INDEXES ================= */
ReservationSchema.index({ equipment_id: 1, start_date: 1, end_date: 1 });
ReservationSchema.index({ user_id: 1, status: 1 });

module.exports = mongoose.model("Reservation", ReservationSchema);
