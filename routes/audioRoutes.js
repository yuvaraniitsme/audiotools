const express = require("express");
const router = express.Router();
const multer = require("multer");
const { cloudinary, storage } = require("../utils/cloudinary");
const AudioFile = require("../models/AudioFile");
const OutputFile = require("../models/OutputFile");
const AudioProcessor = require("../utils/audioProcessor");
const path = require('path');
const fs = require('fs');

const upload = multer({ storage });

router.post("/upload", upload.array("audios"), async (req, res) => {
    try {
        console.log('Upload request received');
        console.log('Headers:', req.headers);
        console.log('Files:', req.files);
        
        const userKey = req.headers['user-key'];
        if (!userKey) {
            console.log('No user key provided');
            return res.status(401).json({ message: 'User key required' });
        }

        if (!req.files || req.files.length === 0) {
            console.log('No files uploaded');
            return res.status(400).json({ message: 'No files uploaded' });
        }

        console.log(`Processing ${req.files.length} files`);

        let uploaded = [];

        for (let file of req.files) {
            console.log('Processing file:', file.originalname);
            
            if (!file.path) {
                console.log('No file path for:', file.originalname);
                continue;
            }

            let result = await cloudinary.uploader.upload(file.path, {
                resource_type: "video",
                folder: `audio_files/${userKey}`
            });

            console.log('Cloudinary upload successful:', result.public_id);

            const duration = await AudioProcessor.getAudioDuration(result.secure_url);

            const audioFile = await AudioFile.create({
                userKey,
                originalName: file.originalname,
                cloudinaryUrl: result.secure_url,
                cloudinaryPublicId: result.public_id,
                duration,
                size: file.size,
                mimeType: file.mimetype
            });

            console.log('Database record created:', audioFile._id);

            uploaded.push({
                id: audioFile._id,
                url: audioFile.cloudinaryUrl,
                originalName: audioFile.originalName,
                duration: audioFile.duration,
                size: audioFile.size
            });

            // Clean up temporary file
            AudioProcessor.cleanup(file.path);
        }

        console.log('Upload completed successfully');
        res.json(uploaded);
    } catch (error) {
        console.error('Upload error details:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            message: 'Upload failed', 
            error: error.message,
            details: error.stack 
        });
    }
});

router.get("/files", async (req, res) => {
    try {
        const userKey = req.headers['user-key'];
        if (!userKey) {
            return res.status(401).json({ message: 'User key required' });
        }

        const files = await AudioFile.find({ userKey }).select('cloudinaryUrl originalName duration size uploadedAt');
        res.json(files);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch files', error: error.message });
    }
});

router.post("/cut", async (req, res) => {
    try {
        console.log('Cut request received');
        const userKey = req.headers['user-key'];
        if (!userKey) {
            console.log('No user key provided');
            return res.status(401).json({ message: 'User key required' });
        }

        const { url, start, end } = req.body;
        console.log('Cut params:', { url: url?.substring(0, 50) + '...', start, end });
        
        if (!url || start === undefined || end === undefined) {
            return res.status(400).json({ message: 'URL, start time, and end time required' });
        }

        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            console.log('Creating temp directory:', tempDir);
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const inputPath = path.join(tempDir, `input-${Date.now()}.mp3`);
        const outputPath = path.join(tempDir, `cut-${Date.now()}.mp3`);

        console.log('Starting audio cut...');
        await AudioProcessor.cutAudio(url, parseFloat(start), parseFloat(end), outputPath);
        console.log('Audio cut completed');

        const result = await cloudinary.uploader.upload(outputPath, {
            resource_type: "video",
            folder: `output_files/${userKey}`
        });

        const sourceFile = await AudioFile.findOne({ cloudinaryUrl: url, userKey });
        
        const outputFile = await OutputFile.create({
            userKey,
            originalName: `cut_${sourceFile?.originalName || 'audio'}.mp3`,
            cloudinaryUrl: result.secure_url,
            cloudinaryPublicId: result.public_id,
            operation: 'cut',
            sourceFiles: sourceFile ? [sourceFile._id] : [],
            cutStartTime: parseFloat(start),
            cutEndTime: parseFloat(end),
            duration: parseFloat(end) - parseFloat(start)
        });

        AudioProcessor.cleanup(inputPath);
        AudioProcessor.cleanup(outputPath);

        console.log('Cut operation completed successfully');
        res.json({
            id: outputFile._id,
            url: outputFile.cloudinaryUrl,
            originalName: outputFile.originalName,
            operation: outputFile.operation,
            duration: outputFile.duration
        });
    } catch (error) {
        console.error('Cut operation error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Cut failed', error: error.message, stack: error.stack });
    }
});

router.post("/merge", async (req, res) => {
    try {
        console.log('Merge request received');
        const userKey = req.headers['user-key'];
        if (!userKey) {
            console.log('No user key provided');
            return res.status(401).json({ message: 'User key required' });
        }

        const { urls } = req.body;
        console.log('Merge URLs count:', urls?.length);
        
        if (!urls || urls.length < 2) {
            return res.status(400).json({ message: 'At least 2 URLs required for merging' });
        }

        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            console.log('Creating temp directory:', tempDir);
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const outputPath = path.join(tempDir, `merged-${Date.now()}.mp3`);

        console.log('Starting audio merge...');
        await AudioProcessor.joinAudio(urls, outputPath);
        console.log('Audio merge completed');

        const result = await cloudinary.uploader.upload(outputPath, {
            resource_type: "video",
            folder: `output_files/${userKey}`
        });

        const sourceFiles = await AudioFile.find({ 
            cloudinaryUrl: { $in: urls }, 
            userKey 
        });

        const outputFile = await OutputFile.create({
            userKey,
            originalName: `merged_audio.mp3`,
            cloudinaryUrl: result.secure_url,
            cloudinaryPublicId: result.public_id,
            operation: 'join',
            sourceFiles: sourceFiles.map(f => f._id)
        });

        AudioProcessor.cleanup(outputPath);

        console.log('Merge operation completed successfully');
        res.json({
            id: outputFile._id,
            url: outputFile.cloudinaryUrl,
            originalName: outputFile.originalName,
            operation: outputFile.operation
        });
    } catch (error) {
        console.error('Merge operation error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Merge failed', error: error.message, stack: error.stack });
    }
});

router.get("/outputs", async (req, res) => {
    try {
        const userKey = req.headers['user-key'];
        if (!userKey) {
            return res.status(401).json({ message: 'User key required' });
        }

        const outputs = await OutputFile.find({ userKey })
            .populate('sourceFiles', 'originalName')
            .select('cloudinaryUrl originalName operation createdAt cutStartTime cutEndTime duration');

        res.json(outputs);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch outputs', error: error.message });
    }
});

router.get("/download/:fileId", async (req, res) => {
    try {
        const userKey = req.headers['user-key'];
        if (!userKey) {
            return res.status(401).json({ message: 'User key required' });
        }

        const { fileId } = req.params;
        
        let file = await OutputFile.findOne({ _id: fileId, userKey });
        if (!file) {
            file = await AudioFile.findOne({ _id: fileId, userKey });
        }

        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        res.json({ url: file.cloudinaryUrl, name: file.originalName });
    } catch (error) {
        res.status(500).json({ message: 'Download failed', error: error.message });
    }
});

module.exports = router;
