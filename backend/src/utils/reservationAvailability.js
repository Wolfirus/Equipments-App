// backend/src/utils/reservationAvailability.js
const mongoose = require("mongoose");
const Reservation = require("../models/Reservation");

/**
 * Overlap rule:
 * reservation overlaps [start,end] if:
 *   start_date < end AND end_date > start
 */
async function getReservedQuantity({ equipmentId, start, end, statuses = ["approved", "active"] }) {
  const equipmentObjectId = new mongoose.Types.ObjectId(equipmentId);

  const agg = await Reservation.aggregate([
    {
      $match: {
        equipment_id: equipmentObjectId,
        status: { $in: statuses },
        start_date: { $lt: end },
        end_date: { $gt: start },
      },
    },
    {
      $group: {
        _id: null,
        totalReserved: { $sum: "$quantity" },
      },
    },
  ]);

  return agg.length ? agg[0].totalReserved : 0;
}

async function getConflictingReservations({ equipmentId, start, end, statuses = ["approved", "active"] }) {
  return Reservation.find({
    equipment_id: equipmentId,
    status: { $in: statuses },
    start_date: { $lt: end },
    end_date: { $gt: start },
  })
    .select("_id start_date end_date quantity status user_id")
    .sort({ start_date: 1 });
}

module.exports = {
  getReservedQuantity,
  getConflictingReservations,
};
