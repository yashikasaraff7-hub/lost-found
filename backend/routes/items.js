const express = require("express");
const router = express.Router();
const Item = require("../models/Item");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");

// POST /api/items — Create a new item listing (with image upload)
router.post("/", auth, upload.single("image"), async (req, res) => {
  try {
    const { type, category, description } = req.body;

    if (!type || !category || !description) {
      return res.status(400).json({ message: "Type, category, and description are required" });
    }

    // Convert uploaded image buffer to Base64 data URL for MongoDB storage
    let imagePath = null;
    if (req.file) {
      const base64 = req.file.buffer.toString("base64");
      imagePath = `data:${req.file.mimetype};base64,${base64}`;
    }

    const item = await Item.create({
      type,
      category,
      description,
      imagePath,
      owner: req.user._id,
    });

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/items — Get all items with optional filtering by category and status
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;

    const items = await Item.find(filter)
      .populate("owner", "name email")
      .sort({ createdAt: -1 });

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/items/:id — Get a single item by ID
router.get("/:id", async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate("owner", "name email");
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/items/:id — Update an item (owner only)
router.put("/:id", auth, upload.single("image"), async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    if (item.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized — you are not the owner" });
    }

    const { type, category, description } = req.body;
    if (type) item.type = type;
    if (category) item.category = category;
    if (description) item.description = description;
    if (req.file) {
      const base64 = req.file.buffer.toString("base64");
      item.imagePath = `data:${req.file.mimetype};base64,${base64}`;
    }

    await item.save();
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/items/admin/stats — Get dashboard summary stats (admin or portal)
router.get("/admin/stats", async (req, res) => {
  try {
    const totalItems = await Item.countDocuments();
    const lostItems = await Item.countDocuments({ type: "lost" });
    const foundItems = await Item.countDocuments({ type: "found" });
    const activeItems = await Item.countDocuments({ status: "active" });
    const resolvedItems = await Item.countDocuments({ status: "resolved" });

    res.json({
      total: totalItems,
      lost: lostItems,
      found: foundItems,
      active: activeItems,
      resolved: resolvedItems,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/items/:id/resolve — Mark item as resolved / toggle status (owner or admin)
router.patch("/:id/resolve", auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    const isOwner = item.owner && req.user._id && item.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized — you are not the owner or an admin" });
    }

    // Toggle or set specified status
    if (req.body && req.body.status) {
      item.status = req.body.status;
    } else {
      item.status = item.status === "resolved" ? "active" : "resolved";
    }

    await item.save();
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/items/bulk-delete — Delete multiple items (admin only)
router.post("/bulk-delete", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Array of item IDs is required" });
    }

    const result = await Item.deleteMany({ _id: { $in: ids } });
    res.json({ message: `${result.deletedCount} items deleted successfully`, deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/items/:id — Delete an item (owner or admin)
router.delete("/:id", auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    const isOwner = item.owner && req.user._id && item.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized — you are not the owner or an admin" });
    }

    await item.deleteOne();
    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
