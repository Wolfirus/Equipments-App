const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const Equipment = require("../models/Equipment");
const Reservation = require("../models/Reservation");
const Category = require("../models/Category");
const mongoose = require("mongoose");

// Middleware to check equipment ownership/permissions
const checkEquipmentPermission = async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      return next();
    }

    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) {
      return res.status(404).json({ message: "Équipement non trouvé" });
    }

    // Check if equipment is public and user has minimum required role
    if (equipment.visibility.is_public &&
        req.user.role === equipment.visibility.minimum_user_role) {
      return next();
    }

    // Check department restrictions
    if (equipment.visibility.restricted_to_departments.length > 0) {
      if (!equipment.visibility.restricted_to_departments.includes(req.user.department)) {
        return res.status(403).json({ message: "Accès refusé: département non autorisé" });
      }
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/equipment - List all equipment with filtering and search
router.get("/", auth, async (req, res) => {
  try {
    const {
      search,
      category,
      status,
      available,
      page = 1,
      limit = 20,
      sort = 'name',
      order = 'asc',
      min_price,
      max_price
    } = req.query;

    // Build query
    let query = {};

    // Search functionality
    if (search) {
      query.$text = { $search: search };
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    // Availability filter
    if (available === 'true') {
      query.available_quantity = { $gt: 0 };
      query.status = 'available';
    }

    // Price range filter (for hourly rate)
    let priceFilter = {};
    if (min_price || max_price) {
      priceFilter = {};
      if (min_price) priceFilter.$gte = parseFloat(min_price);
      if (max_price) priceFilter.$lte = parseFloat(max_price);
      query['rental_info.hourly_rate'] = priceFilter;
    }

    // Department restriction for non-admin users
    if (req.user.role !== 'admin') {
      query.visibility = {
        $or: [
          { is_public: true },
          { restricted_to_departments: req.user.department }
        ]
      };

      if (req.user.role === 'user') {
        query['visibility.minimum_user_role'] = { $in: ['user', 'supervisor', 'admin'] };
      } else if (req.user.role === 'supervisor') {
        query['visibility.minimum_user_role'] = { $in: ['supervisor', 'admin'] };
      }
    }

    // Sorting options
    const sortOptions = {};
    const sortField = sort === 'popularity' ? 'usage_stats.total_rentals' : sort;
    sortOptions[sortField] = order === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const equipment = await Equipment.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    // Get total count for pagination
    const total = await Equipment.countDocuments(query);

    // Get categories for filters
    const categories = await Category.findActiveCategories();

    res.json({
      success: true,
      data: {
        equipment,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        },
        filters: {
          categories: categories.map(cat => ({
            name: cat.name,
            count: cat.equipment_count
          })),
          statuses: ['available', 'maintenance', 'retired']
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des équipements",
      error: error.message
    });
  }
});

// GET /api/equipment/:id - Get single equipment with availability info
router.get("/:id", auth, checkEquipmentPermission, async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id)
      .populate({
        path: 'related_entity.id',
        model: 'Category',
        select: 'name description icon color'
      });

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Équipement non trouvé"
      });
    }

    // Get availability for next 30 days
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const activeReservations = await Reservation.find({
      equipment_id: equipment._id,
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
    }).select('start_date end_date quantity status');

    // Build availability calendar
    const availability = [];
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() + i);

      const dayReservations = activeReservations.filter(reservation => {
        return checkDate >= new Date(reservation.start_date) &&
               checkDate <= new Date(reservation.end_date);
      });

      const reservedQuantity = dayReservations.reduce((sum, res) => sum + res.quantity, 0);
      const availableQuantity = Math.max(0, equipment.total_quantity - reservedQuantity);

      availability.push({
        date: checkDate.toISOString().split('T')[0],
        available: availableQuantity > 0,
        available_quantity: availableQuantity,
        reserved_quantity: reservedQuantity
      });
    }

    // Get similar equipment
    const similarEquipment = await Equipment.find({
      _id: { $ne: equipment._id },
      category: equipment.category,
      status: 'available',
      available_quantity: { $gt: 0 }
    }).limit(3).select('name images rental_info.hourly_rate');

    res.json({
      success: true,
      data: {
        equipment,
        availability,
        similar_equipment: similarEquipment
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de l'équipement",
      error: error.message
    });
  }
});

// GET /api/equipment/availability/:id - Get equipment availability for specific dates
router.get("/availability/:id", auth, checkEquipmentPermission, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: "Les dates de début et de fin sont requises"
      });
    }

    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Équipement non trouvé"
      });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    // Validate dates
    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: "La date de fin doit être postérieure à la date de début"
      });
    }

    // Get conflicting reservations
    const conflictingReservations = await Reservation.find({
      equipment_id: equipment._id,
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
    }).select('start_date end_date quantity user_id status');

    // Calculate total reserved quantity for the period
    const maxReservedQuantity = conflictingReservations.reduce((max, reservation) => {
      return Math.max(max, reservation.quantity);
    }, 0);

    const availableQuantity = Math.max(0, equipment.total_quantity - maxReservedQuantity);

    res.json({
      success: true,
      data: {
        equipment_id: equipment._id,
        available: availableQuantity > 0,
        available_quantity: availableQuantity,
        total_quantity: equipment.total_quantity,
        conflicting_reservations: conflictingReservations.map(res => ({
          start_date: res.start_date,
          end_date: res.end_date,
          quantity: res.quantity,
          status: res.status
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la vérification de disponibilité",
      error: error.message
    });
  }
});

// POST /api/equipment - Create new equipment (admin only)
router.post("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const equipmentData = req.body;

    // Validate required fields
    const requiredFields = ['name', 'description', 'category', 'total_quantity'];
    const missingFields = requiredFields.filter(field => !equipmentData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Champs requis manquants: ${missingFields.join(', ')}`
      });
    }

    // Set available_quantity to total_quantity if not specified
    if (!equipmentData.available_quantity) {
      equipmentData.available_quantity = equipmentData.total_quantity;
    }

    // Validate images if provided
    if (equipmentData.images && Array.isArray(equipmentData.images)) {
      for (const image of equipmentData.images) {
        try {
          new URL(image);
          if (!/\.(jpg|jpeg|png|gif|webp)$/i.test(image)) {
            throw new Error('Invalid image format');
          }
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: `URL d'image invalide: ${image}`
          });
        }
      }
    }

    const equipment = new Equipment(equipmentData);
    await equipment.save();

    // Update category count
    await Category.updateEquipmentCounts();

    res.status(201).json({
      success: true,
      message: "Équipement créé avec succès",
      data: equipment
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
      message: "Erreur lors de la création de l'équipement",
      error: error.message
    });
  }
});

// PUT /api/equipment/:id - Update equipment (admin only)
router.put("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Équipement non trouvé"
      });
    }

    const updateData = req.body;

    // Prevent reducing available_quantity below reserved quantity
    if (updateData.available_quantity !== undefined) {
      const activeReservations = await Reservation.find({
        equipment_id: equipment._id,
        status: 'active'
      });

      const reservedQuantity = activeReservations.reduce((sum, res) => sum + res.quantity, 0);

      if (updateData.available_quantity < reservedQuantity) {
        return res.status(400).json({
          success: false,
          message: `Impossible de réduire la quantité disponible en dessous de la quantité réservée (${reservedQuantity})`
        });
      }
    }

    // Validate images if provided
    if (updateData.images && Array.isArray(updateData.images)) {
      for (const image of updateData.images) {
        try {
          new URL(image);
          if (!/\.(jpg|jpeg|png|gif|webp)$/i.test(image)) {
            throw new Error('Invalid image format');
          }
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: `URL d'image invalide: ${image}`
          });
        }
      }
    }

    Object.assign(equipment, updateData);
    await equipment.save();

    // Update category count if category changed
    if (updateData.category && updateData.category !== equipment.category) {
      await Category.updateEquipmentCounts();
    }

    res.json({
      success: true,
      message: "Équipement mis à jour avec succès",
      data: equipment
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
      message: "Erreur lors de la mise à jour de l'équipement",
      error: error.message
    });
  }
});

// DELETE /api/equipment/:id - Delete equipment (admin only)
router.delete("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Équipement non trouvé"
      });
    }

    // Check for active reservations
    const activeReservations = await Reservation.find({
      equipment_id: equipment._id,
      status: { $in: ['pending', 'approved', 'active'] }
    });

    if (activeReservations.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Impossible de supprimer cet équipement car il a des réservations actives"
      });
    }

    // Soft delete by marking as retired
    equipment.status = 'retired';
    equipment.available_quantity = 0;
    await equipment.save();

    // Update category count
    await Category.updateEquipmentCounts();

    res.json({
      success: true,
      message: "Équipement supprimé avec succès"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression de l'équipement",
      error: error.message
    });
  }
});

// GET /api/equipment/stats - Get equipment statistics (admin only)
router.get("/stats", auth, requireRole("admin"), async (req, res) => {
  try {
    const stats = await Equipment.aggregate([
      {
        $group: {
          _id: null,
          total_equipment: { $sum: "$total_quantity" },
          available_equipment: { $sum: "$available_quantity" },
          total_categories: { $addToSet: "$category" }
        }
      },
      {
        $project: {
          _id: 0,
          total_equipment: 1,
          available_equipment: 1,
          utilized_equipment: { $subtract: ["$total_equipment", "$available_equipment"] },
          total_categories: { $size: "$total_categories" }
        }
      }
    ]);

    const categoryStats = await Equipment.aggregate([
      {
        $group: {
          _id: "$category",
          total_quantity: { $sum: "$total_quantity" },
          available_quantity: { $sum: "$available_quantity" },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { total_quantity: -1 }
      }
    ]);

    const statusStats = await Equipment.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          total_equipment: 0,
          available_equipment: 0,
          utilized_equipment: 0,
          total_categories: 0
        },
        by_category: categoryStats,
        by_status: statusStats
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