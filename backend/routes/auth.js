const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    const user = await User.create({ name: name.trim(), email: normalizedEmail, password });

    const token = jwt.sign({ id: user._id, role: user.role || "user" }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role || "user" },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id, role: user.role || "user" }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role || "user" },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/auth/admin-login - Admin authentication via passkey or admin account
router.post("/admin-login", async (req, res) => {
  try {
    const { passcode, email, password } = req.body;

    const configuredSecret = process.env.ADMIN_SECRET || "admin123";

    // 1. If passcode is provided, check against ADMIN_SECRET
    if (passcode && passcode.trim() === configuredSecret) {
      const token = jwt.sign(
        { role: "admin", name: "System Administrator", email: "admin@portal.local" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        token,
        user: {
          id: "admin",
          name: "System Administrator",
          email: "admin@portal.local",
          role: "admin",
        },
      });
    }

    // 2. If email & password are provided, check if user exists and has admin role
    if (email && password) {
      const normalizedEmail = email.toLowerCase().trim();
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(401).json({ message: "Invalid admin credentials" });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid admin credentials" });
      }

      if (user.role !== "admin") {
        return res.status(403).json({ message: "Access denied. User does not have admin privileges." });
      }

      const token = jwt.sign({ id: user._id, role: "admin" }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      return res.json({
        token,
        user: { id: user._id, name: user.name, email: user.email, role: "admin" },
      });
    }

    return res.status(400).json({ message: "Invalid admin passcode or credentials" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/auth/me - Verify current session
router.get("/me", auth, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
