const mongoose = require('mongoose');

const imageFileSchema = new mongoose.Schema({
    userKey: {
        type: String,
        required: true,
        ref: 'User'
    },
    originalName: {
        type: String,
        required: true
    },
    cloudinaryUrl: {
        type: String,
        required: true
    },
    cloudinaryPublicId: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    width: {
        type: Number
    },
    height: {
        type: Number
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ImageFile', imageFileSchema);
