const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const Equipment = require("../models/Equipment");
const Reservation = require("../models/Reservation");

function overlapQuery(start, end) {
  return {
    start_date: { $lte: end },
    end_date: { $gte: start },
  };
}

// GET /api/equipment (list)
router.get("/", auth, async (req, res) => {
  try {
    const { page = 1, limit = 24, search, category, status, available } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const q = {};
    if (search) q.name = { $regex: String(search), $options: "i" };
    if (category) q.category = category; // (si Equipment.category est string)
    if (status) q.status = status;

    if (available === "true") {
      q.status = "available";
      q.available_quantity = { $gt: 0 };
    }

    const equipment = await Equipment.find(q)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    const total = await Equipment.countDocuments(q);

    res.json({
      success: true,
      data: {
        equipment,
        pagination: { current: +page, pages: Math.ceil(total / +limit), total, limit: +limit },
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur liste équipements", error: e.message });
  }
});

// GET /api/equipment/:id
router.get("/:id", auth, async (req, res) => {
  try {
    const eq = await Equipment.findById(req.params.id);
    if (!eq) return res.status(404).json({ success: false, message: "Équipement introuvable" });
    res.json({ success: true, data: eq });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur équipement", error: e.message });
  }
});

// ✅ GET /api/equipment/:id/availability?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get("/:id/availability", auth, async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ success: false, message: "start et end requis" });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
      return res.status(400).json({ success: false, message: "Période invalide" });
    }

    const eq = await Equipment.findById(req.params.id);
    if (!eq) return res.status(404).json({ success: false, message: "Équipement introuvable" });

    const overlaps = await Reservation.find({
      equipment_id: eq._id,
      status: { $in: ["approved", "active"] },
      ...overlapQuery(startDate, endDate),
    }).select("quantity");

    const reserved = overlaps.reduce((s, r) => s + (r.quantity || 0), 0);
    const availableForPeriod = Math.max(0, (eq.total_quantity || 0) - reserved);

    res.json({
      success: true,
      data: {
        equipment_id: eq._id,
        start: startDate,
        end: endDate,
        total_quantity: eq.total_quantity || 0,
        reserved_quantity: reserved,
        available_quantity: availableForPeriod,
        status: eq.status,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur availability", error: e.message });
  }
});

// POST /api/equipment (manager)
router.post("/", auth, requireRole("supervisor", "admin"), async (req, res) => {
  try {
    const { name, description, category, status = "available", quantity = 1, image_url } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Nom requis" });

    const eq = await Equipment.create({
      name,
      description: description || "",
      category: category || "",
      status,
      total_quantity: Number(quantity || 1),
      available_quantity: Number(quantity || 1),
      images: image_url ? [image_url] : [],
    });

    res.status(201).json({ success: true, data: eq });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur création équipement", error: e.message });
  }
});

// PUT /api/equipment/:id (manager)
router.put("/:id", auth, requireRole("supervisor", "admin"), async (req, res) => {
  try {
    const { name, description, category, status, quantity, image_url } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (status !== undefined) updates.status = status;

    if (quantity !== undefined) {
      const q = Number(quantity);
      updates.total_quantity = q;
      // ✅ on resynchronise available_quantity “NOW” juste pour l’affichage,
      // mais la vraie dispo reste par /availability
      updates.available_quantity = Math.max(0, q);
    }

    if (image_url !== undefined) updates.images = image_url ? [image_url] : [];

    const eq = await Equipment.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!eq) return res.status(404).json({ success: false, message: "Équipement introuvable" });

    res.json({ success: true, data: eq });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur update équipement", error: e.message });
  }
});

// DELETE /api/equipment/:id (manager)
router.delete("/:id", auth, requireRole("supervisor", "admin"), async (req, res) => {
  try {
    const eq = await Equipment.findByIdAndDelete(req.params.id);
    if (!eq) return res.status(404).json({ success: false, message: "Équipement introuvable" });
    res.json({ success: true, message: "Équipement supprimé" });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur suppression équipement", error: e.message });
  }
});

module.exports = router;
