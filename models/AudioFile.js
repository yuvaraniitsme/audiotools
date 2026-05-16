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
        required: false
    },
    cloudinaryPublicId: {
        type: String,
        required: false
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
    isAudio: {
        type: Boolean,
        default: false
    },
    uploadError: {
        type: String
    },
    storedLocally: {
        type: Boolean,
        default: false
    },
    isConverted: {
        type: Boolean,
        default: false
    },
    originalFileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AudioFile'
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('AudioFile', audioFileSchema);
