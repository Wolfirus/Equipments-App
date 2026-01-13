const express = require("express");
const router = express.Router();

const Equipment = require("../models/Equipment");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

/**
 * ✅ GET /api/equipment
 * user: voir (selon visibilité si tu veux)
 * supervisor/admin: voir TOUT (comme admin)
 */
router.get("/", auth, async (req, res) => {
  try {
    const role = (req.user?.role || "").toLowerCase();

    const {
      search = "",
      category = "",
      status = "",
      includeUnavailable = "true",
      page = "1",
      limit = "12",
    } = req.query;

    const query = {};

    if (search.trim()) query.name = { $regex: search.trim(), $options: "i" };
    if (category.trim()) query.category = category.trim();
    if (status.trim()) query.status = status.trim();

    // includeUnavailable=false => seulement dispo
    if (includeUnavailable === "false") {
      query.available_quantity = { $gt: 0 };
    }

    /**
     * ✅ IMPORTANT
     * Si tu avais une logique "visibility" ou "department" qui cachait aux non-admin,
     * on autorise supervisor comme admin => pas de filtre.
     */
    if (role !== "admin" && role !== "supervisor") {
      // si tu veux limiter user seulement:
      // ex: public only (si ton schema contient visibility.is_public)
      // sinon supprime tout ce bloc
      query.$or = [
        { "visibility.is_public": true },
        { "visibility.restricted_to_departments": req.user.department },
      ];
    }

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 12;
    const skip = (pageNum - 1) * limitNum;

    const total = await Equipment.countDocuments(query);
    const equipment = await Equipment.find(query).skip(skip).limit(limitNum);

    return res.json({
      success: true,
      data: {
        equipment,
        pagination: {
          total,
          pages: Math.ceil(total / limitNum),
          page: pageNum,
          limit: limitNum,
        },
      },
    });
  } catch (err) {
    console.error("GET /api/equipment ERROR:", err);
    return res.status(500).json({ success: false, message: "Erreur serveur", error: err.message });
  }
});

/**
 * GET /api/equipment/:id
 */
router.get("/:id", auth, async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) return res.status(404).json({ success: false, message: "Équipement introuvable" });
    return res.json({ success: true, data: { equipment } });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: err.message });
  }
});

/**
 * ✅ supervisor/admin peuvent CRÉER
 */
router.post("/", auth, requireRole("admin", "supervisor"), async (req, res) => {
  try {
    const created = await Equipment.create(req.body);
    return res.status(201).json({ success: true, data: { equipment: created } });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * ✅ supervisor/admin peuvent MODIFIER
 */
router.patch("/:id", auth, requireRole("admin", "supervisor"), async (req, res) => {
  try {
    const updated = await Equipment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ success: false, message: "Équipement introuvable" });
    return res.json({ success: true, data: { equipment: updated } });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * ✅ supervisor/admin peuvent SUPPRIMER
 */
router.delete("/:id", auth, requireRole("admin", "supervisor"), async (req, res) => {
  try {
    const deleted = await Equipment.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Équipement introuvable" });
    return res.json({ success: true, message: "Équipement supprimé" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: err.message });
  }
});

module.exports = router;
