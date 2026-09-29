const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["lost", "found"],
    required: [true, "Type (lost/found) is required"],
  },
  category: {
    type: String,
    required: [true, "Category is required"],
    trim: true,
  },
  description: {
    type: String,
    required: [true, "Description is required"],
    trim: true,
  },
  imagePath: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ["active", "resolved"],
    default: "active",
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model("Item", itemSchema);
