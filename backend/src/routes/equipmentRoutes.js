const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const Equipment = require("../models/Equipment");
const Reservation = require("../models/Reservation");
const Category = require("../models/Category");

// Role hierarchy
const ROLE_LEVEL = { user: 1, supervisor: 2, admin: 3 };
const hasMinRole = (userRole, minRole) =>
  (ROLE_LEVEL[userRole] || 0) >= (ROLE_LEVEL[minRole] || 0);

// Permission middleware
const checkEquipmentPermission = async (req, res, next) => {
  try {
    if (req.user.role === "admin") return next();

    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) {
      return res.status(404).json({ message: "Équipement non trouvé" });
    }

    if (equipment.visibility?.is_public) {
      const minRole = equipment.visibility?.minimum_user_role || "user";
      if (hasMinRole(req.user.role, minRole)) return next();
    }

    const restricted = equipment.visibility?.restricted_to_departments || [];
    if (restricted.length > 0 && !restricted.includes(req.user.department)) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ======================================================
   GET ALL EQUIPMENT
====================================================== */
router.get("/", auth, async (req, res) => {
  try {
    const { search, category, status, available, page = 1, limit = 20 } = req.query;
    let query = {};

    if (search) query.$text = { $search: search };
    if (category) query.category = category;
    if (status) query.status = status;
    if (available === "true") {
      query.available_quantity = { $gt: 0 };
      query.status = "available";
    }

    if (req.user.role !== "admin") {
      const minAllowed =
        req.user.role === "user"
          ? ["user", "supervisor", "admin"]
          : ["supervisor", "admin"];

      query["visibility.minimum_user_role"] = { $in: minAllowed };
      query.$or = [
        { "visibility.is_public": true },
        { "visibility.restricted_to_departments": req.user.department },
      ];
    }

    const skip = (page - 1) * limit;
    const equipment = await Equipment.find(query)
      .skip(skip)
      .limit(Number(limit))
      .select("-__v");

    const total = await Equipment.countDocuments(query);
    const categories = await Category.find();

    res.json({
      success: true,
      equipment, // frontend compatibility
      categories: categories.map(c => c.name),
      data: {
        equipment,
        pagination: {
          page: Number(page),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des équipements",
      error: error.message,
    });
  }
});

/* ======================================================
   GET ONE EQUIPMENT
====================================================== */
router.get("/:id", auth, checkEquipmentPermission, async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) {
      return res.status(404).json({ success: false, message: "Équipement non trouvé" });
    }

    res.json({ success: true, data: equipment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ======================================================
   CREATE EQUIPMENT
====================================================== */
router.post("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const { name, description, category, total_quantity } = req.body;

    if (!name || !description || !category || !total_quantity) {
      return res.status(400).json({
        success: false,
        message: "Champs requis manquants",
      });
    }

    const equipment = new Equipment({
      ...req.body,
      available_quantity:
        req.body.available_quantity ?? req.body.total_quantity,
    });

    await equipment.save();
    await Category.updateEquipmentCounts();

    res.status(201).json({
      success: true,
      message: "Équipement créé",
      data: equipment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/* ======================================================
   PUT EQUIPMENT
====================================================== */
router.put("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) {
      return res.status(404).json({ success: false, message: "Équipement non trouvé" });
    }

    const oldCategory = String(equipment.category || "");
    Object.assign(equipment, req.body);
    await equipment.save();

    if (req.body.category && String(req.body.category) !== oldCategory) {
      await Category.updateEquipmentCounts();
    }

    res.json({
      success: true,
      message: "Équipement mis à jour",
      data: equipment,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ======================================================
   PATCH EQUIPMENT (FIXES YOUR 404)
====================================================== */
router.patch("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) {
      return res.status(404).json({ success: false, message: "Équipement non trouvé" });
    }

    Object.assign(equipment, req.body);
    await equipment.save();
    await Category.updateEquipmentCounts();

    res.json({
      success: true,
      message: "Équipement mis à jour (PATCH)",
      data: equipment,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ======================================================
   DELETE EQUIPMENT (SOFT DELETE)
====================================================== */
router.delete("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) {
      return res.status(404).json({ success: false, message: "Équipement non trouvé" });
    }

    equipment.status = "retired";
    equipment.available_quantity = 0;
    await equipment.save();
    await Category.updateEquipmentCounts();

    res.json({ success: true, message: "Équipement supprimé" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
