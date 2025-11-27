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

    let query = {};
    if (include_inactive !== 'true') {
      query.is_active = true;
    }

    const categories = await Category.find(query)
      .sort({ order: 1, name: 1 })
      .populate('has_children');

    // Get equipment counts for each category
    const categoryStats = await Equipment.aggregate([
      {
        $group: {
          _id: "$category",
          total_quantity: { $sum: "$total_quantity" },
          available_quantity: { $sum: "$available_quantity" },
          active_reservations: { $sum: "$usage_stats.active_rentals" }
        }
      }
    ]);

    const statsMap = categoryStats.reduce((map, stat) => {
      map[stat._id] = stat;
      return map;
    }, {});

    // Add stats to categories
    const categoriesWithStats = categories.map(category => {
      const categoryObj = category.toObject();
      const stats = statsMap[category.name];

      if (stats) {
        categoryObj.equipment_count = stats.total_quantity;
        categoryObj.available_equipment = stats.available_quantity;
        categoryObj.active_reservations = stats.active_reservations;
      } else {
        categoryObj.equipment_count = 0;
        categoryObj.available_equipment = 0;
        categoryObj.active_reservations = 0;
      }

      return categoryObj;
    });

    res.json({
      success: true,
      data: {
        categories: categoriesWithStats,
        total: categories.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des catégories",
      error: error.message
    });
  }
});

// GET /api/categories/tree - Get categories as tree structure
router.get("/tree", auth, async (req, res) => {
  try {
    const categories = await Category.find({ is_active: true })
      .sort({ order: 1, name: 1 });

    // Build tree structure
    const categoryMap = {};
    const rootCategories = [];

    // Create map
    categories.forEach(category => {
      categoryMap[category._id] = { ...category.toObject(), children: [] };
    });

    // Build tree
    categories.forEach(category => {
      const categoryObj = categoryMap[category._id];

      if (category.parent_category) {
        const parent = categoryMap[category.parent_category];
        if (parent) {
          parent.children.push(categoryObj);
        }
      } else {
        rootCategories.push(categoryObj);
      }
    });

    res.json({
      success: true,
      data: {
        categories: rootCategories
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de l'arborescence",
      error: error.message
    });
  }
});

// GET /api/categories/:id - Get single category
router.get("/:id", auth, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('has_children');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Catégorie non trouvée"
      });
    }

    // Get equipment stats for this category
    const equipmentStats = await Equipment.aggregate([
      { $match: { category: category.name } },
      {
        $group: {
          _id: null,
          total_quantity: { $sum: "$total_quantity" },
          available_quantity: { $sum: "$available_quantity" },
          active_reservations: { $sum: "$usage_stats.active_rentals" },
          total_rentals: { $sum: "$usage_stats.total_rentals" },
          average_rating: { $avg: "$usage_stats.average_rating" }
        }
      }
    ]);

    const stats = equipmentStats[0] || {
      total_quantity: 0,
      available_quantity: 0,
      active_reservations: 0,
      total_rentals: 0,
      average_rating: 0
    };

    // Get recent equipment in this category
    const recentEquipment = await Equipment.find({
      category: category.name,
      status: 'available'
    })
      .sort({ created_at: -1 })
      .limit(5)
      .select('name images rental_info.hourly_rate rental_info.daily_rate');

    const categoryObj = category.toObject();
    categoryObj.equipment_stats = stats;
    categoryObj.recent_equipment = recentEquipment;

    res.json({
      success: true,
      data: categoryObj
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de la catégorie",
      error: error.message
    });
  }
});

// GET /api/categories/:id/equipment - Get equipment by category
router.get("/:id/equipment", auth, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Catégorie non trouvée"
      });
    }

    const {
      page = 1,
      limit = 20,
      sort = 'name',
      order = 'asc',
      status,
      available
    } = req.query;

    let query = { category: category.name };

    // Status filter
    if (status) {
      query.status = status;
    }

    // Available filter
    if (available === 'true') {
      query.available_quantity = { $gt: 0 };
      query.status = 'available';
    }

    // Visibility and role-based filtering
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

    // Sorting
    const sortOptions = {};
    sortOptions[sort] = order === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const equipment = await Equipment.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

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
          color: category.color
        },
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
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

// POST /api/categories - Create new category (admin only)
router.post("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const { name, description, icon, color, parent_category, settings } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Le nom de la catégorie est requis"
      });
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Une catégorie avec ce nom existe déjà"
      });
    }

    // Validate parent category if provided
    if (parent_category) {
      const parent = await Category.findById(parent_category);
      if (!parent) {
        return res.status(400).json({
          success: false,
          message: "Catégorie parente non trouvée"
        });
      }
    }

    // Generate slug
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const categoryData = {
      name,
      slug,
      description,
      icon,
      color: color || '#6366f1',
      parent_category,
      settings: settings || {}
    };

    const category = new Category(categoryData);
    await category.save();

    res.status(201).json({
      success: true,
      message: "Catégorie créée avec succès",
      data: category
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
      message: "Erreur lors de la création de la catégorie",
      error: error.message
    });
  }
});

// PUT /api/categories/:id - Update category (admin only)
router.put("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Catégorie non trouvée"
      });
    }

    const allowedUpdates = ['name', 'description', 'icon', 'color', 'parent_category', 'order', 'is_active', 'settings'];
    const updates = {};

    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Validate parent category if being changed
    if (updates.parent_category) {
      if (updates.parent_category === category._id.toString()) {
        return res.status(400).json({
          success: false,
          message: "Une catégorie ne peut pas être sa propre parente"
        });
      }

      const parent = await Category.findById(updates.parent_category);
      if (!parent) {
        return res.status(400).json({
          success: false,
          message: "Catégorie parente non trouvée"
        });
      }
    }

    // Update slug if name changed
    if (updates.name && updates.name !== category.name) {
      // Check if new name already exists
      const existingCategory = await Category.findOne({
        name: updates.name,
        _id: { $ne: category._id }
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: "Une catégorie avec ce nom existe déjà"
        });
      }

      updates.slug = updates.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    // Check for circular reference if parent is being changed
    if (updates.parent_category && updates.parent_category !== category.parent_category?.toString()) {
      // Find all descendants to prevent circular reference
      const findDescendants = async (parentId) => {
        const descendants = await Category.find({ parent_category: parentId });
        const allDescendants = [parentId];

        for (const descendant of descendants) {
          allDescendants.push(...await findDescendants(descendant._id));
        }

        return allDescendants;
      };

      const descendants = await findDescendants(category._id);
      if (descendants.includes(updates.parent_category)) {
        return res.status(400).json({
          success: false,
          message: "Référence circulaire détectée dans la hiérarchie des catégories"
        });
      }
    }

    Object.assign(category, updates);
    await category.save();

    // Update equipment counts if category name changed
    if (updates.name && updates.name !== category.name) {
      await Equipment.updateMany(
        { category: category.name },
        { category: updates.name }
      );
    }

    res.json({
      success: true,
      message: "Catégorie mise à jour avec succès",
      data: category
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
      message: "Erreur lors de la mise à jour de la catégorie",
      error: error.message
    });
  }
});

// DELETE /api/categories/:id - Delete category (admin only)
router.delete("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Catégorie non trouvée"
      });
    }

    // Check for equipment in this category
    const equipmentCount = await Equipment.countDocuments({
      category: category.name,
      status: { $ne: 'retired' }
    });

    if (equipmentCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Impossible de supprimer cette catégorie car elle contient ${equipmentCount} équipement(s) actif(s)`
      });
    }

    // Check for child categories
    const childCategories = await Category.find({ parent_category: category._id });
    if (childCategories.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Impossible de supprimer cette catégorie car elle contient des sous-catégories"
      });
    }

    // Soft delete by deactivating
    category.is_active = false;
    await category.save();

    res.json({
      success: true,
      message: "Catégorie désactivée avec succès"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression de la catégorie",
      error: error.message
    });
  }
});

// PUT /api/categories/:id/reorder - Reorder categories (admin only)
router.put("/:id/reorder", auth, requireRole("admin"), async (req, res) => {
  try {
    const { direction } = req.body; // 'up' or 'down'

    if (!['up', 'down'].includes(direction)) {
      return res.status(400).json({
        success: false,
        message: "Direction invalide. Utilisez 'up' ou 'down'"
      });
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Catégorie non trouvée"
      });
    }

    // Find sibling categories (same parent level)
    const siblings = await Category.find({
      parent_category: category.parent_category,
      is_active: true,
      _id: { $ne: category._id }
    }).sort({ order: 1 });

    if (siblings.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Aucune catégorie sœur trouvée pour le réordonnancement"
      });
    }

    // Find adjacent category to swap with
    let adjacentCategory;
    if (direction === 'up') {
      adjacentCategory = siblings.find(sibling => sibling.order < category.order) ||
                          siblings[siblings.length - 1];
    } else {
      adjacentCategory = siblings.find(sibling => sibling.order > category.order) ||
                          siblings[0];
    }

    if (!adjacentCategory) {
      return res.status(400).json({
        success: false,
        message: "Impossible de réordonner: aucune catégorie adjacente trouvée"
      });
    }

    // Swap orders
    const tempOrder = category.order;
    category.order = adjacentCategory.order;
    adjacentCategory.order = tempOrder;

    await category.save();
    await adjacentCategory.save();

    res.json({
      success: true,
      message: "Catégories réordonnées avec succès",
      data: {
        current: category,
        swapped: adjacentCategory
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors du réordonnancement des catégories",
      error: error.message
    });
  }
});

// GET /api/categories/stats - Get category statistics (admin only)
router.get("/stats", auth, requireRole("admin"), async (req, res) => {
  try {
    const overallStats = await Category.aggregate([
      {
        $group: {
          _id: null,
          total_categories: { $sum: 1 },
          active_categories: {
            $sum: { $cond: ["$is_active", 1, 0] }
          },
          root_categories: {
            $sum: { $cond: [{ $eq: ["$parent_category", null] }, 1, 0] }
          }
        }
      }
    ]);

    const equipmentByCategory = await Equipment.aggregate([
      {
        $group: {
          _id: "$category",
          total_equipment: { $sum: "$total_quantity" },
          available_equipment: { $sum: "$available_quantity" },
          utilization_rate: {
            $avg: {
              $multiply: [
                {
                  $divide: [
                    { $subtract: ["$total_quantity", "$available_quantity"] },
                    "$total_quantity"
                  ]
                },
                100
              ]
            }
          },
          total_rentals: { $sum: "$usage_stats.total_rentals" }
        }
      },
      { $sort: { total_equipment: -1 } }
    ]);

    const categoryGrowth = await Category.aggregate([
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

    res.json({
      success: true,
      data: {
        overview: overallStats[0] || {
          total_categories: 0,
          active_categories: 0,
          root_categories: 0
        },
        equipment_by_category: equipmentByCategory,
        growth_trends: categoryGrowth
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