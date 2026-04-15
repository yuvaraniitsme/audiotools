const mongoose = require("mongoose");

const audioSchema = new mongoose.Schema({
    url: String,
    public_id: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Audio", audioSchema);
