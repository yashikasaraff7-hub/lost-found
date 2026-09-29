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

    const item = await Item.create({
      type,
      category,
      description,
      imagePath: req.file ? `/uploads/${req.file.filename}` : null,
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
    if (req.file) item.imagePath = `/uploads/${req.file.filename}`;

    await item.save();
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/items/:id/resolve — Mark item as resolved (owner only)
router.patch("/:id/resolve", auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    if (item.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized — you are not the owner" });
    }

    item.status = "resolved";
    await item.save();
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/items/:id — Delete an item (owner only)
router.delete("/:id", auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    if (item.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized — you are not the owner" });
    }

    await item.deleteOne();
    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
