const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const Reservation = require("../models/Reservation");
const Equipment = require("../models/Equipment");
const User = require("../models/User");
const Notification = require("../models/Notification");

// Helper function to check reservation permission
const checkReservationPermission = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('equipment_id', 'name category');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Réservation non trouvée"
      });
    }

    // Check if user owns the reservation or is admin/supervisor
    if (req.user.role === 'admin' ||
        req.user.role === 'supervisor' ||
        reservation.user_id.toString() === req.user._id.toString()) {
      req.reservation = reservation;
      return next();
    }

    // Supervisors can see reservations from their department
    if (req.user.role === 'supervisor') {
      const reservationUser = await User.findById(reservation.user_id);
      if (reservationUser && reservationUser.department === req.user.department) {
        req.reservation = reservation;
        return next();
      }
    }

    res.status(403).json({
      success: false,
      message: "Accès non autorisé à cette réservation"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la vérification des permissions",
      error: error.message
    });
  }
};

// GET /api/reservations - List reservations (filtered by user role)
router.get("/", auth, async (req, res) => {
  try {
    const {
      status,
      equipment_id,
      start_date,
      end_date,
      page = 1,
      limit = 20,
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    let query = {};

    // Role-based filtering
    if (req.user.role === 'admin') {
      // Admin can see all reservations
    } else if (req.user.role === 'supervisor') {
      // Supervisor can see reservations from their department
      const departmentUsers = await User.find({ department: req.user.department }).select('_id');
      query.user_id = { $in: departmentUsers.map(u => u._id) };
    } else {
      // Regular users can only see their own reservations
      query.user_id = req.user._id;
    }

    // Status filter
    if (status) {
      if (Array.isArray(status)) {
        query.status = { $in: status };
      } else {
        query.status = status;
      }
    }

    // Equipment filter
    if (equipment_id) {
      query.equipment_id = equipment_id;
    }

    // Date range filter
    if (start_date && end_date) {
      query.$and = [
        { start_date: { $lte: new Date(end_date) } },
        { end_date: { $gte: new Date(start_date) } }
      ];
    } else if (start_date) {
      query.end_date = { $gte: new Date(start_date) };
    } else if (end_date) {
      query.start_date = { $lte: new Date(end_date) };
    }

    // Sorting
    const sortOptions = {};
    sortOptions[sort] = order === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const reservations = await Reservation.find(query)
      .populate('user_id', 'name email department')
      .populate('equipment_id', 'name category images rental_info')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    // Get total count for pagination
    const total = await Reservation.countDocuments(query);

    // Get statistics
    const statusStats = await Reservation.aggregate([
      { $match: query },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        reservations,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        },
        stats: {
          by_status: statusStats
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des réservations",
      error: error.message
    });
  }
});

// GET /api/reservations/:id - Get single reservation
router.get("/:id", auth, checkReservationPermission, async (req, res) => {
  try {
    const reservation = req.reservation;

    // Additional population for detailed view
    await reservation.populate([
      {
        path: 'user_id',
        select: 'name email department phone avatar_url'
      },
      {
        path: 'equipment_id',
        select: 'name description category images specifications rental_info'
      },
      {
        path: 'approval_details.approved_by',
        select: 'name email'
      }
    ]);

    res.json({
      success: true,
      data: reservation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de la réservation",
      error: error.message
    });
  }
});

// POST /api/reservations - Create new reservation
router.post("/", auth, async (req, res) => {
  try {
    const {
      equipment_id,
      start_date,
      end_date,
      quantity = 1,
      purpose,
      notes
    } = req.body;

    // Validate required fields
    if (!equipment_id || !start_date || !end_date || !purpose) {
      return res.status(400).json({
        success: false,
        message: "Les champs equipment_id, start_date, end_date et purpose sont requis"
      });
    }

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: "La date de fin doit être postérieure à la date de début"
      });
    }

    if (startDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "La date de début doit être dans le futur"
      });
    }

    // Check equipment exists and is available
    const equipment = await Equipment.findById(equipment_id);
    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Équipement non trouvé"
      });
    }

    if (equipment.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: `Équipement non disponible: statut actuel "${equipment.status}"`
      });
    }

    // Check equipment visibility and permissions
    if (!equipment.visibility.is_public) {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: "Cet équipement n'est pas publiquement disponible"
        });
      }
    }

    if (req.user.role !== 'admin' &&
        req.user.role !== equipment.visibility.minimum_user_role) {
      return res.status(403).json({
        success: false,
        message: "Vous n'avez pas le rôle requis pour réserver cet équipement"
      });
    }

    if (equipment.visibility.restricted_to_departments.length > 0 &&
        !equipment.visibility.restricted_to_departments.includes(req.user.department)) {
      return res.status(403).json({
        success: false,
        message: "Cet équipement n'est pas disponible pour votre département"
      });
    }

    // Check quantity availability
    if (quantity > equipment.available_quantity) {
      return res.status(400).json({
        success: false,
        message: `Quantité non disponible: ${quantity} demandé, ${equipment.available_quantity} disponible`
      });
    }

    // Check for conflicting reservations
    const conflictingReservations = await Reservation.find({
      equipment_id,
      status: { $in: ['approved', 'active'] },
      $or: [
        {
          start_date: { $lte: startDate },
          end_date: { $gte: startDate }
        },
        {
          start_date: { $lte: endDate },
          end_date: { $gte: endDate }
        },
        {
          start_date: { $gte: startDate },
          end_date: { $lte: endDate }
        }
      ]
    });

    const totalReservedQuantity = conflictingReservations.reduce((sum, res) => sum + res.quantity, 0);
    if (totalReservedQuantity + quantity > equipment.total_quantity) {
      return res.status(409).json({
        success: false,
        message: "Conflit de réservation: équipement déjà réservé pour cette période",
        conflicting_reservations: conflictingReservations.map(res => ({
          id: res._id,
          start_date: res.start_date,
          end_date: res.end_date,
          quantity: res.quantity,
          status: res.status
        }))
      });
    }

    // Check user's reservation limits
    const activeReservations = await Reservation.find({
      user_id: req.user._id,
      status: { $in: ['pending', 'approved', 'active'] }
    });

    if (activeReservations.length >= 10) { // Configurable limit
      return res.status(400).json({
        success: false,
        message: "Limite de réservations actives atteinte (10)"
      });
    }

    // Check rental duration limits
    const rentalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const maxDays = equipment.rental_info.max_rental_duration_days || 30;

    if (rentalDays > maxDays) {
      return res.status(400).json({
        success: false,
        message: `Durée maximale de location dépassée: ${maxDays} jours maximum`
      });
    }

    // Create reservation
    const reservation = new Reservation({
      user_id: req.user._id,
      equipment_id,
      start_date: startDate,
      end_date: endDate,
      quantity,
      purpose,
      notes,
      status: equipment.rental_info.requires_approval ? 'pending' : 'approved'
    });

    // Calculate costs
    if (equipment.rental_info.hourly_rate > 0) {
      const rentalHours = Math.ceil((endDate - startDate) / (1000 * 60 * 60));
      reservation.payment_details.total_cost = rentalHours * equipment.rental_info.hourly_rate * quantity;
    } else if (equipment.rental_info.daily_rate > 0) {
      reservation.payment_details.total_cost = rentalDays * equipment.rental_info.daily_rate * quantity;
    }

    reservation.payment_details.deposit_required = equipment.rental_info.deposit_required;
    reservation.payment_details.deposit_amount = equipment.rental_info.deposit_required ?
      equipment.rental_info.deposit_amount : 0;

    // Auto-approve if not requiring approval
    if (reservation.status === 'approved') {
      reservation.approval_details.approved_by = req.user._id;
      reservation.approval_details.approved_at = new Date();
      reservation.approval_details.approval_notes = "Approbation automatique";

      // Update equipment availability
      equipment.available_quantity -= quantity;
      await equipment.save();
    }

    await reservation.save();

    // Update user stats
    const user = await User.findById(req.user._id);
    user.stats.total_reservations += 1;
    if (reservation.status === 'approved') {
      user.stats.active_reservations += 1;
    }
    user.stats.last_activity = new Date();
    await user.save();

    // Create notification
    if (reservation.status === 'pending') {
      await Notification.reservationCreated(
        req.user._id,
        reservation._id,
        equipment.name,
        startDate
      );
    } else {
      await Notification.reservationApproved(
        req.user._id,
        reservation._id,
        equipment.name
      );
    }

    // Send notifications to supervisors if approval is needed
    if (equipment.rental_info.requires_approval) {
      const supervisors = await User.find({ role: 'supervisor', department: req.user.department });
      for (const supervisor of supervisors) {
        await Notification.createNotification({
          user_id: supervisor._id,
          type: 'reservation_created',
          title: 'Nouvelle réservation nécessitant une approbation',
          message: `${req.user.name} demande à réserver ${quantity}x ${equipment.name} du ${startDate.toLocaleDateString()} au ${endDate.toLocaleDateString()}`,
          priority: 'medium',
          action_required: true,
          action_url: `/reservations/${reservation._id}`,
          action_text: 'Approuver/Refuser',
          related_entity: {
            type: 'reservation',
            id: reservation._id,
            model: 'Reservation'
          }
        });
      }
    }

    res.status(201).json({
      success: true,
      message: reservation.status === 'pending' ?
        "Réservation créée, en attente d'approbation" :
        "Réservation approuvée avec succès",
      data: reservation
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Erreur de validation",
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({
      success: false,
      message: "Erreur lors de la création de la réservation",
      error: error.message
    });
  }
});

// PUT /api/reservations/:id - Update reservation
router.put("/:id", auth, checkReservationPermission, async (req, res) => {
  try {
    const reservation = req.reservation;
    const allowedUpdates = ['purpose', 'notes', 'start_date', 'end_date', 'quantity'];
    const updates = {};

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    // Restrict updates based on status
    if (['completed', 'cancelled'].includes(reservation.status)) {
      return res.status(400).json({
        success: false,
        message: "Impossible de modifier une réservation terminée ou annulée"
      });
    }

    // Only allow date/quantity changes for pending reservations
    if (reservation.status === 'approved' || reservation.status === 'active') {
      if (updates.start_date || updates.end_date || updates.quantity) {
        return res.status(400).json({
          success: false,
          message: "Impossible de modifier les dates ou la quantité d'une réservation approuvée"
        });
      }
    }

    // Only equipment owner can modify pending reservations
    if (reservation.status === 'pending' &&
        reservation.user_id.toString() !== req.user._id.toString() &&
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Seul le propriétaire peut modifier une réservation en attente"
      });
    }

    // Validate date changes
    if (updates.start_date || updates.end_date) {
      const startDate = new Date(updates.start_date || reservation.start_date);
      const endDate = new Date(updates.end_date || reservation.end_date);

      if (startDate >= endDate) {
        return res.status(400).json({
          success: false,
          message: "La date de fin doit être postérieure à la date de début"
        });
      }

      if (startDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: "La date de début doit être dans le futur"
        });
      }

      // Check for conflicts
      const equipment = await Equipment.findById(reservation.equipment_id);
      const conflictingReservations = await Reservation.find({
        _id: { $ne: reservation._id },
        equipment_id: reservation.equipment_id,
        status: { $in: ['approved', 'active'] },
        $or: [
          {
            start_date: { $lte: startDate },
            end_date: { $gte: startDate }
          },
          {
            start_date: { $lte: endDate },
            end_date: { $gte: endDate }
          },
          {
            start_date: { $gte: startDate },
            end_date: { $lte: endDate }
          }
        ]
      });

      const totalReservedQuantity = conflictingReservations.reduce((sum, res) => sum + res.quantity, 0);
      const requestedQuantity = updates.quantity || reservation.quantity;

      if (totalReservedQuantity + requestedQuantity > equipment.total_quantity) {
        return res.status(409).json({
          success: false,
          message: "Conflit de réservation pour la nouvelle période"
        });
      }
    }

    // Update reservation
    Object.assign(reservation, updates);
    await reservation.save();

    res.json({
      success: true,
      message: "Réservation mise à jour avec succès",
      data: reservation
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Erreur de validation",
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour de la réservation",
      error: error.message
    });
  }
});

// PUT /api/reservations/:id/approve - Approve reservation (supervisor/admin)
router.put("/:id/approve", auth, requireRole("supervisor", "admin"), async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('equipment_id', 'name rental_info')
      .populate('user_id', 'name email department');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Réservation non trouvée"
      });
    }

    if (reservation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: "Cette réservation n'est pas en attente d'approbation"
      });
    }

    // Check department permissions for supervisors
    if (req.user.role === 'supervisor' &&
        reservation.user_id.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: "Vous ne pouvez approuver que les réservations de votre département"
      });
    }

    const equipment = await Equipment.findById(reservation.equipment_id);
    if (equipment.available_quantity < reservation.quantity) {
      return res.status(400).json({
        success: false,
        message: "Équipement plus disponible en quantité suffisante"
      });
    }

    // Approve reservation
    reservation.status = 'approved';
    reservation.approval_details.approved_by = req.user._id;
    reservation.approval_details.approved_at = new Date();
    reservation.approval_details.approval_notes = req.body.notes || "Approbé par " + req.user.name;

    await reservation.save();

    // Update equipment availability
    equipment.available_quantity -= reservation.quantity;
    await equipment.save();

    // Update user stats
    const user = await User.findById(reservation.user_id._id);
    user.stats.active_reservations += 1;
    user.stats.last_activity = new Date();
    await user.save();

    // Create notification for user
    await Notification.reservationApproved(
      reservation.user_id._id,
      reservation._id,
      equipment.name
    );

    res.json({
      success: true,
      message: "Réservation approuvée avec succès",
      data: reservation
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'approbation de la réservation",
      error: error.message
    });
  }
});

// PUT /api/reservations/:id/reject - Reject reservation (supervisor/admin)
router.put("/:id/reject", auth, requireRole("supervisor", "admin"), async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('equipment_id', 'name')
      .populate('user_id', 'name email');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Réservation non trouvée"
      });
    }

    if (reservation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: "Cette réservation n'est pas en attente"
      });
    }

    // Check department permissions for supervisors
    if (req.user.role === 'supervisor' &&
        reservation.user_id.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: "Vous ne pouvez rejeter que les réservations de votre département"
      });
    }

    // Reject reservation
    reservation.status = 'cancelled';
    reservation.approval_details.approved_by = req.user._id;
    reservation.approval_details.approved_at = new Date();
    reservation.approval_details.approval_notes = req.body.reason || "Rejeté par " + req.user.name;

    await reservation.save();

    // Update user stats
    const user = await User.findById(reservation.user_id._id);
    user.stats.cancelled_reservations += 1;
    user.stats.last_activity = new Date();
    await user.save();

    // Create notification for user
    await Notification.reservationRejected(
      reservation.user_id._id,
      reservation._id,
      equipment.name,
      req.body.reason || "Demande refusée"
    );

    res.json({
      success: true,
      message: "Réservation rejetée avec succès",
      data: reservation
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors du rejet de la réservation",
      error: error.message
    });
  }
});

// DELETE /api/reservations/:id - Cancel reservation
router.delete("/:id", auth, checkReservationPermission, async (req, res) => {
  try {
    const reservation = req.reservation;
    const reason = req.body.reason;

    // Cannot cancel completed reservations
    if (reservation.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: "Impossible d'annuler une réservation terminée"
      });
    }

    // Only allow cancellation under certain conditions
    const now = new Date();
    const startDate = new Date(reservation.start_date);

    if (reservation.status === 'active' && now >= startDate) {
      // User cannot cancel active reservations (admin/supervisor only)
      if (req.user.role === 'user') {
        return res.status(400).json({
          success: false,
          message: "Impossible d'annuler une réservation active. Contactez un administrateur."
        });
      }
    }

    const oldStatus = reservation.status;
    reservation.status = 'cancelled';

    await reservation.save();

    // Update equipment availability if reservation was approved/active
    if (['approved', 'active'].includes(oldStatus)) {
      const equipment = await Equipment.findById(reservation.equipment_id);
      equipment.available_quantity += reservation.quantity;
      await equipment.save();
    }

    // Update user stats
    const user = await User.findById(reservation.user_id);
    user.stats.cancelled_reservations += 1;
    if (oldStatus === 'approved' || oldStatus === 'active') {
      user.stats.active_reservations -= 1;
    }
    user.stats.last_activity = new Date();
    await user.save();

    // Create notification
    await Notification.reservationCancelled(
      reservation.user_id,
      reservation._id,
      reservation.equipment_id,
      reason || "Annulation de l'utilisateur"
    );

    res.json({
      success: true,
      message: "Réservation annulée avec succès",
      data: reservation
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'annulation de la réservation",
      error: error.message
    });
  }
});

// GET /api/reservations/stats - Get reservation statistics
router.get("/stats", auth, async (req, res) => {
  try {
    let matchQuery = {};

    // Role-based filtering
    if (req.user.role === 'admin') {
      // Admin sees all stats
    } else if (req.user.role === 'supervisor') {
      // Supervisor sees stats from their department
      const departmentUsers = await User.find({ department: req.user.department }).select('_id');
      matchQuery.user_id = { $in: departmentUsers.map(u => u._id) };
    } else {
      // User sees only their stats
      matchQuery.user_id = req.user._id;
    }

    // Overall statistics
    const overallStats = await Reservation.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total_reservations: { $sum: 1 },
          pending_reservations: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
          },
          approved_reservations: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] }
          },
          active_reservations: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] }
          },
          completed_reservations: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
          },
          cancelled_reservations: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] }
          }
        }
      }
    ]);

    // Monthly trends (last 6 months)
    const monthlyTrends = await Reservation.aggregate([
      { $match: { ...matchQuery, created_at: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: {
            year: { $year: "$created_at" },
            month: { $month: "$created_at" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // Popular equipment
    const popularEquipment = await Reservation.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$equipment_id",
          count: { $sum: 1 },
          name: { $first: "$equipment_id.name" }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "equipment",
          localField: "_id",
          foreignField: "_id",
          as: "equipment"
        }
      },
      { $unwind: "$equipment" }
    ]);

    res.json({
      success: true,
      data: {
        overview: overallStats[0] || {
          total_reservations: 0,
          pending_reservations: 0,
          approved_reservations: 0,
          active_reservations: 0,
          completed_reservations: 0,
          cancelled_reservations: 0
        },
        monthly_trends: monthlyTrends,
        popular_equipment: popularEquipment
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des statistiques",
      error: error.message
    });
  }
});

module.exports = router;