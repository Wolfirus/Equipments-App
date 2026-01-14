const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const Category = require("../models/Category");
const Equipment = require("../models/Equipment");

// GET /api/categories - List all categories
router.get("/", auth, async (req, res) => {
  try {
    const { include_inactive = false } = req.query;

    const query = {};
    if (include_inactive !== "true") query.is_active = true;

    const categories = await Category.find(query)
      .sort({ order: 1, name: 1 })
      .populate("has_children");

    // stats équipements par catégorie (Equipment.category = string name)
    const categoryStats = await Equipment.aggregate([
      {
        $group: {
          _id: "$category",
          total_quantity: { $sum: "$total_quantity" },
          available_quantity: { $sum: "$available_quantity" },
          active_reservations: { $sum: "$usage_stats.active_rentals" },
        },
      },
    ]);

    const statsMap = categoryStats.reduce((map, s) => {
      map[s._id] = s;
      return map;
    }, {});

    const categoriesWithStats = categories.map((category) => {
      const categoryObj = category.toObject();
      const stats = statsMap[category.name];

      categoryObj.equipment_count = stats ? stats.total_quantity : 0;
      categoryObj.available_equipment = stats ? stats.available_quantity : 0;
      categoryObj.active_reservations = stats ? stats.active_reservations : 0;

      return categoryObj;
    });

    res.json({
      success: true,
      data: { categories: categoriesWithStats, total: categories.length },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des catégories",
      error: error.message,
    });
  }
});

// GET /api/categories/tree - Get categories as tree structure
router.get("/tree", auth, async (req, res) => {
  try {
    const categories = await Category.find({ is_active: true }).sort({ order: 1, name: 1 });

    const categoryMap = {};
    const rootCategories = [];

    categories.forEach((category) => {
      categoryMap[category._id] = { ...category.toObject(), children: [] };
    });

    categories.forEach((category) => {
      const categoryObj = categoryMap[category._id];
      if (category.parent_category) {
        const parent = categoryMap[category.parent_category];
        if (parent) parent.children.push(categoryObj);
      } else {
        rootCategories.push(categoryObj);
      }
    });

    res.json({ success: true, data: { categories: rootCategories } });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de l'arborescence",
      error: error.message,
    });
  }
});

// GET /api/categories/:id - Get single category
router.get("/:id", auth, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate("has_children");
    if (!category) return res.status(404).json({ success: false, message: "Catégorie non trouvée" });

    const equipmentStats = await Equipment.aggregate([
      { $match: { category: category.name } },
      {
        $group: {
          _id: null,
          total_quantity: { $sum: "$total_quantity" },
          available_quantity: { $sum: "$available_quantity" },
          active_reservations: { $sum: "$usage_stats.active_rentals" },
          total_rentals: { $sum: "$usage_stats.total_rentals" },
          average_rating: { $avg: "$usage_stats.average_rating" },
        },
      },
    ]);

    const stats = equipmentStats[0] || {
      total_quantity: 0,
      available_quantity: 0,
      active_reservations: 0,
      total_rentals: 0,
      average_rating: 0,
    };

    const recentEquipment = await Equipment.find({
      category: category.name,
      status: "available",
    })
      .sort({ createdAt: -1 }) // ✅ timestamps
      .limit(5)
      .select("name images rental_info.hourly_rate rental_info.daily_rate");

    const categoryObj = category.toObject();
    categoryObj.equipment_stats = stats;
    categoryObj.recent_equipment = recentEquipment;

    res.json({ success: true, data: categoryObj });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de la catégorie",
      error: error.message,
    });
  }
});

// GET /api/categories/:id/equipment - Get equipment by category
router.get("/:id/equipment", auth, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Catégorie non trouvée" });

    const { page = 1, limit = 20, sort = "name", order = "asc", status, available } = req.query;

    const query = { category: category.name };

    if (status) query.status = status;

    if (available === "true") {
      query.available_quantity = { $gt: 0 };
      query.status = "available";
    }

    // ✅ Visibility correct (root-level $or)
    if (req.user.role !== "admin") {
      query.$or = [
        { "visibility.is_public": true },
        { "visibility.restricted_to_departments": req.user.department },
      ];

      if (req.user.role === "user") {
        query["visibility.minimum_user_role"] = { $in: ["user", "supervisor", "admin"] };
      } else if (req.user.role === "supervisor") {
        query["visibility.minimum_user_role"] = { $in: ["supervisor", "admin"] };
      }
    }

    const sortOptions = { [sort]: order === "desc" ? -1 : 1 };
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const equipment = await Equipment.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit, 10))
      .select("-__v");

    const total = await Equipment.countDocuments(query);

    res.json({
      success: true,
      data: {
        equipment,
        category: {
          _id: category._id,
          name: category.name,
          description: category.description,
          icon: category.icon,
          color: category.color,
        },
        pagination: {
          current: parseInt(page, 10),
          pages: Math.ceil(total / parseInt(limit, 10)),
          total,
          limit: parseInt(limit, 10),
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

// POST /api/categories - Create new category (admin only)
router.post("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const { name, description, icon, color, parent_category, settings } = req.body;

    if (!name) return res.status(400).json({ success: false, message: "Le nom de la catégorie est requis" });

    const existingCategory = await Category.findOne({ name });
    if (existingCategory) return res.status(400).json({ success: false, message: "Une catégorie avec ce nom existe déjà" });

    if (parent_category) {
      const parent = await Category.findById(parent_category);
      if (!parent) return res.status(400).json({ success: false, message: "Catégorie parente non trouvée" });
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const category = new Category({
      name,
      slug,
      description,
      icon,
      color: color || "#6366f1",
      parent_category: parent_category || null,
      settings: settings || {},
    });

    await category.save();

    res.status(201).json({ success: true, message: "Catégorie créée avec succès", data: category });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Erreur de validation",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }
    res.status(500).json({ success: false, message: "Erreur lors de la création de la catégorie", error: error.message });
  }
});

// PUT /api/categories/:id - Update category (admin only)
router.put("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Catégorie non trouvée" });

    const allowedUpdates = ["name", "description", "icon", "color", "parent_category", "order", "is_active", "settings"];
    const updates = {};
    for (const f of allowedUpdates) if (req.body[f] !== undefined) updates[f] = req.body[f];

    if (updates.parent_category) {
      if (String(updates.parent_category) === String(category._id)) {
        return res.status(400).json({ success: false, message: "Une catégorie ne peut pas être sa propre parente" });
      }
      const parent = await Category.findById(updates.parent_category);
      if (!parent) return res.status(400).json({ success: false, message: "Catégorie parente non trouvée" });
    }

    if (updates.name && updates.name !== category.name) {
      const existing = await Category.findOne({ name: updates.name, _id: { $ne: category._id } });
      if (existing) return res.status(400).json({ success: false, message: "Une catégorie avec ce nom existe déjà" });

      updates.slug = updates.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }

    const oldName = category.name;
    Object.assign(category, updates);
    await category.save();

    // si name change -> update équipements
    if (updates.name && updates.name !== oldName) {
      await Equipment.updateMany({ category: oldName }, { category: updates.name });
    }

    res.json({ success: true, message: "Catégorie mise à jour avec succès", data: category });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Erreur de validation",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }
    res.status(500).json({ success: false, message: "Erreur lors de la mise à jour de la catégorie", error: error.message });
  }
});

module.exports = router;
