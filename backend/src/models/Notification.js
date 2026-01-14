const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: { type: String, required: true, trim: true, index: true },

    title: { type: String, required: true, trim: true, maxlength: 200 },

    message: { type: String, required: true, trim: true, maxlength: 1000 },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
      index: true,
    },

    /**
     * ✅ Standard: read
     * ✅ Compat: is_read (alias)
     */
    read: {
      type: Boolean,
      default: false,
      index: true,
      alias: "is_read",
    },

    read_at: { type: Date, default: null },

    action_required: { type: Boolean, default: false },

    action_url: { type: String, trim: true, default: "" },

    action_text: { type: String, trim: true, default: "" },

    related_entity: {
      type: { type: String, trim: true, default: "" },
      id: { type: mongoose.Schema.Types.ObjectId, default: null },
      model: { type: String, trim: true, default: "" },
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// ---------- Static helpers (utilisés par reservationRoutes.js) ----------
NotificationSchema.statics.createNotification = async function (payload) {
  return this.create(payload);
};

NotificationSchema.statics.reservationCreated = async function (
  userId,
  reservationId,
  equipmentName,
  startDate
) {
  return this.create({
    user_id: userId,
    type: "reservation_created",
    title: "Réservation créée",
    message: `Votre demande de réservation pour "${equipmentName}" a été créée (début: ${new Date(
      startDate
    ).toLocaleDateString()}).`,
    priority: "medium",
    action_required: true,
    action_url: `/reservations/${reservationId}`,
    action_text: "Voir la réservation",
    related_entity: { type: "reservation", id: reservationId, model: "Reservation" },
  });
};

NotificationSchema.statics.reservationApproved = async function (
  userId,
  reservationId,
  equipmentName
) {
  return this.create({
    user_id: userId,
    type: "reservation_approved",
    title: "Réservation approuvée",
    message: `Votre réservation pour "${equipmentName}" a été approuvée.`,
    priority: "high",
    action_required: false,
    action_url: `/reservations/${reservationId}`,
    action_text: "Voir",
    related_entity: { type: "reservation", id: reservationId, model: "Reservation" },
  });
};

NotificationSchema.statics.reservationRejected = async function (
  userId,
  reservationId,
  equipmentName,
  reason = "Demande refusée"
) {
  return this.create({
    user_id: userId,
    type: "reservation_rejected",
    title: "Réservation refusée",
    message: `Votre réservation pour "${equipmentName}" a été refusée. Raison: ${reason}`,
    priority: "high",
    action_required: false,
    action_url: `/reservations/${reservationId}`,
    action_text: "Voir",
    related_entity: { type: "reservation", id: reservationId, model: "Reservation" },
  });
};

NotificationSchema.statics.reservationCancelled = async function (
  userId,
  reservationId,
  reason = "Annulation"
) {
  return this.create({
    user_id: userId,
    type: "reservation_cancelled",
    title: "Réservation annulée",
    message: `Votre réservation a été annulée. Raison: ${reason}`,
    priority: "medium",
    action_required: false,
    action_url: `/reservations/${reservationId}`,
    action_text: "Voir",
    related_entity: { type: "reservation", id: reservationId, model: "Reservation" },
  });
};

// ---------- Methods ----------
NotificationSchema.methods.markAsRead = async function () {
  this.read = true; // ✅ champ standard
  this.read_at = new Date();
  return this.save();
};

module.exports = mongoose.model("Notification", NotificationSchema);
