const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        length: 5
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);
