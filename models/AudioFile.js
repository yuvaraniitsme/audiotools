const mongoose = require('mongoose');

const audioFileSchema = new mongoose.Schema({
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
    duration: {
        type: Number
    },
    size: {
        type: Number
    },
    mimeType: {
        type: String,
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('AudioFile', audioFileSchema);
