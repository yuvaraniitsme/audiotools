const mongoose = require('mongoose');

const outputFileSchema = new mongoose.Schema({
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
    operation: {
        type: String,
        enum: ['cut', 'join'],
        required: true
    },
    sourceFiles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AudioFile'
    }],
    cutStartTime: {
        type: Number
    },
    cutEndTime: {
        type: Number
    },
    duration: {
        type: Number
    },
    size: {
        type: Number
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('OutputFile', outputFileSchema);
