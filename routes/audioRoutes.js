const express = require("express");
const router = express.Router();
const multer = require("multer");
const { cloudinary, storage } = require("../utils/cloudinary");
const AudioFile = require("../models/AudioFile");
const OutputFile = require("../models/OutputFile");
const AudioProcessor = require("../utils/audioProcessor");
const path = require('path');
const fs = require('fs');

// Multer configuration to accept any file type (audio, video, images, documents, etc.)
const upload = multer({ 
    storage,
    // Accept any file type - no file filter restrictions
});

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

        // Reject image files at the audio endpoint
        for (let file of req.files) {
            if (file.mimetype && file.mimetype.startsWith('image/')) {
                console.log('Image file rejected at audio endpoint:', file.originalname);
                return res.status(400).json({ message: `Image files are not allowed here. Please use the Upload Images section. File: ${file.originalname}` });
            }
        }

        console.log(`Processing ${req.files.length} files`);

        let uploaded = [];

        for (let file of req.files) {
            console.log('Processing file:', file.originalname, 'Path:', file.path, 'Filename:', file.filename);
            
            // Auto-add .mp3 extension if file doesn't have an extension
            let originalName = file.originalname;
            if (!path.extname(originalName)) {
                originalName = originalName + '.mp3';
                console.log('Auto-added .mp3 extension:', originalName);
            }

            // When using storage: CloudinaryStorage -> file.path is Cloudinary URL
            // For diskStorage fallback, file.path is the local path; convert to web-accessible URL
            const rawPath = file.path;
            const publicId = file.filename;
            let cloudinaryUrl = rawPath;
            try {
                const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
                if (rawPath && rawPath.startsWith(uploadsDir)) {
                    cloudinaryUrl = '/uploads/' + path.basename(rawPath);
                }
            } catch (e) {
                cloudinaryUrl = rawPath;
            }

            if (!cloudinaryUrl) {
                console.log('No Cloudinary URL for:', file.originalname);
                // Store failed upload
                const failedFile = await AudioFile.create({
                    userKey,
                    originalName: originalName,
                    cloudinaryUrl: null,
                    cloudinaryPublicId: null,
                    duration: null,
                    size: file.size,
                    mimeType: file.mimetype,
                    uploadError: 'Cloudinary upload failed - no URL returned',
                    storedLocally: true
                });

                uploaded.push({
                    id: failedFile._id,
                    url: null,
                    originalName: failedFile.originalName,
                    duration: null,
                    size: failedFile.size,
                    isAudio: false,
                    uploadError: 'Cloudinary upload failed',
                    storedLocally: true
                });
                continue;
            }

            let isAudio = false;
            let duration = null;
            let finalUrl = cloudinaryUrl;
            let finalPublicId = publicId;
            let isConverted = false;

            // Try to get audio duration - if this fails, it's not a valid audio file
            try {
                duration = await AudioProcessor.getAudioDuration(cloudinaryUrl);
                isAudio = true;
                console.log('Valid audio file, duration:', duration);
            } catch (audioErr) {
                console.log('File uploaded but not a valid audio file:', audioErr.message);
                console.log('Attempting to convert to MP3...');
                isAudio = false;

                // Try to convert non-audio or unsupported audio files to MP3
                try {
                    const tempDir = path.join(__dirname, '../temp');
                    if (!fs.existsSync(tempDir)) {
                        fs.mkdirSync(tempDir, { recursive: true });
                    }

                    const convertedPath = path.join(tempDir, `converted-${Date.now()}.mp3`);
                    console.log('Converting file to MP3:', convertedPath);

                    await AudioProcessor.convertToMp3(cloudinaryUrl, convertedPath);

                    // Upload converted MP3 to Cloudinary
                    const convertedResult = await cloudinary.uploader.upload(convertedPath, {
                        resource_type: "auto",
                        folder: `audio_files/${userKey}`
                    });

                    // Get duration of converted MP3
                    try {
                        duration = await AudioProcessor.getAudioDuration(convertedResult.secure_url);
                    } catch (durErr) {
                        console.log('Could not get duration of converted file');
                        duration = null;
                    }

                    // Use the converted file as the final file
                    finalUrl = convertedResult.secure_url;
                    finalPublicId = convertedResult.public_id;
                    isAudio = true;
                    isConverted = true;

                    console.log('File auto-converted to MP3 successfully');

                    // Cleanup temp file
                    AudioProcessor.cleanup(convertedPath);
                } catch (convErr) {
                    console.error('MP3 auto-conversion failed:', convErr.message);
                    // Store the original file even though conversion failed
                    isAudio = false;
                }
            }

            // Store file in database (use null for invalid duration)
            const audioFile = await AudioFile.create({
                userKey,
                originalName: originalName,
                cloudinaryUrl: finalUrl,
                cloudinaryPublicId: finalPublicId,
                duration: duration || null,
                size: file.size,
                mimeType: file.mimetype,
                isAudio: isAudio,
                isConverted: isConverted
            });

            console.log('Database record created:', audioFile._id, 'isAudio:', isAudio, 'isConverted:', isConverted);

            uploaded.push({
                id: audioFile._id,
                url: audioFile.cloudinaryUrl,
                originalName: audioFile.originalName,
                duration: audioFile.duration,
                size: audioFile.size,
                isAudio: isAudio,
                isConverted: isConverted,
                conversionStatus: isConverted ? 'Auto-converted to MP3' : (isAudio ? 'Original audio' : 'Not audio')
            });
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

        let processUrl = url;
        let cleanupPaths = [];

        // Check if the file is valid audio, if not convert it
        try {
            console.log('Checking if file is valid audio...');
            await AudioProcessor.getAudioDuration(url);
            console.log('File is valid audio, proceeding with cut');
        } catch (audioErr) {
            console.log('File is not valid audio or unsupported format, converting to MP3...');
            const convertPath = path.join(tempDir, `convert-${Date.now()}.mp3`);
            try {
                await AudioProcessor.convertToMp3(url, convertPath);
                processUrl = convertPath;
                cleanupPaths.push(convertPath);
                console.log('File converted to MP3 successfully');
            } catch (convErr) {
                console.error('Failed to convert file to MP3:', convErr.message);
                return res.status(400).json({ message: 'File format not supported and conversion failed', error: convErr.message });
            }
        }

        const supportedExts = ['.aac', '.m4a', '.amr', '.wav', '.mp3'];
        const origExt = path.extname(url.split('?')[0]).toLowerCase() || '.mp3';
        const outExt = supportedExts.includes(origExt) ? origExt : '.mp3';
        const outputPath = path.join(tempDir, `cut-${Date.now()}${outExt}`);
        cleanupPaths.push(outputPath);

        console.log('Starting audio cut...');
        await AudioProcessor.cutAudio(processUrl, parseFloat(start), parseFloat(end), outputPath);
        console.log('Audio cut completed');

        const result = await cloudinary.uploader.upload(outputPath, {
            resource_type: "video",
            folder: `output_files/${userKey}`
        });

        const sourceFile = await AudioFile.findOne({ cloudinaryUrl: url, userKey });
        
        const baseName = sourceFile?.originalName ? path.parse(sourceFile.originalName).name : 'audio';
        const outputFile = await OutputFile.create({
            userKey,
            originalName: `cut_${baseName}${outExt}`,
            cloudinaryUrl: result.secure_url,
            cloudinaryPublicId: result.public_id,
            operation: 'cut',
            sourceFiles: sourceFile ? [sourceFile._id] : [],
            cutStartTime: parseFloat(start),
            cutEndTime: parseFloat(end),
            duration: parseFloat(end) - parseFloat(start)
        });

        // Cleanup all temporary files
        cleanupPaths.forEach(cleanPath => {
            AudioProcessor.cleanup(cleanPath);
        });

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

        // Convert all files to MP3 if needed
        let processUrls = [];
        let cleanupPaths = [];

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            let processUrl = url;

            try {
                console.log(`Checking file ${i + 1}/${urls.length} - is it valid audio?`);
                await AudioProcessor.getAudioDuration(url);
                console.log(`File ${i + 1} is valid audio`);
            } catch (audioErr) {
                console.log(`File ${i + 1} is not valid audio or unsupported format, converting to MP3...`);
                const convertPath = path.join(tempDir, `convert-${Date.now()}-${i}.mp3`);
                try {
                    await AudioProcessor.convertToMp3(url, convertPath);
                    processUrl = convertPath;
                    cleanupPaths.push(convertPath);
                    console.log(`File ${i + 1} converted to MP3 successfully`);
                } catch (convErr) {
                    console.error(`Failed to convert file ${i + 1} to MP3:`, convErr.message);
                    // Cleanup already converted files before responding with error
                    cleanupPaths.forEach(cleanPath => {
                        AudioProcessor.cleanup(cleanPath);
                    });
                    return res.status(400).json({ message: `File ${i + 1} format not supported and conversion failed`, error: convErr.message });
                }
            }

            processUrls.push(processUrl);
        }

        const supportedExts = ['.aac', '.m4a', '.amr', '.wav', '.mp3'];
        const exts = urls.map(u => path.extname(u.split('?')[0]).toLowerCase() || '.mp3');
        const allSame = exts.every(e => e === exts[0]);
        const mergeExtCandidate = allSame && supportedExts.includes(exts[0]) ? exts[0] : '.mp3';
        const mergeExt = mergeExtCandidate;
        const outputPath = path.join(tempDir, `merged-${Date.now()}${mergeExt}`);
        cleanupPaths.push(outputPath);

        console.log('Starting audio merge...');
        await AudioProcessor.joinAudio(processUrls, outputPath);
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
            originalName: `merged_audio${mergeExt}`,
            cloudinaryUrl: result.secure_url,
            cloudinaryPublicId: result.public_id,
            operation: 'join',
            sourceFiles: sourceFiles.map(f => f._id)
        });

        // Cleanup all temporary files
        cleanupPaths.forEach(cleanPath => {
            AudioProcessor.cleanup(cleanPath);
        });

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
