const express = require("express");
const router = express.Router();
const multer = require("multer");
const { cloudinary, imageStorage } = require("../utils/cloudinary");
const ImageFile = require("../models/ImageFile");
const path = require('path');

const upload = multer({ storage: imageStorage });

router.post("/upload", upload.array("images"), async (req, res) => {
    try {
        console.log('Image upload request received');
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

        console.log(`Processing ${req.files.length} image files`);

        let uploaded = [];

        for (let file of req.files) {
            console.log('Processing image:', file.originalname);
            
            if (!file.path) {
                console.log('No file path for:', file.originalname);
                continue;
            }

            let result = await cloudinary.uploader.upload(file.path, {
                resource_type: "image",
                folder: `image_files/${userKey}`
            });

            console.log('Cloudinary upload successful:', result.public_id);

            const imageFile = await ImageFile.create({
                userKey,
                originalName: file.originalname,
                cloudinaryUrl: result.secure_url,
                cloudinaryPublicId: result.public_id,
                size: file.size,
                mimeType: file.mimetype,
                width: result.width,
                height: result.height
            });

            console.log('Database record created:', imageFile._id);

            uploaded.push({
                id: imageFile._id,
                url: imageFile.cloudinaryUrl,
                originalName: imageFile.originalName,
                size: imageFile.size,
                width: imageFile.width,
                height: imageFile.height
            });
        }

        console.log('Image upload completed successfully');
        res.json(uploaded);
    } catch (error) {
        console.error('Image upload error details:', error);
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

        const files = await ImageFile.find({ userKey }).select('cloudinaryUrl originalName size width height uploadedAt');
        res.json(files);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch images', error: error.message });
    }
});

router.delete("/delete/:imageId", async (req, res) => {
    try {
        const userKey = req.headers['user-key'];
        if (!userKey) {
            return res.status(401).json({ message: 'User key required' });
        }

        const { imageId } = req.params;
        
        const imageFile = await ImageFile.findOne({ _id: imageId, userKey });
        if (!imageFile) {
            return res.status(404).json({ message: 'Image not found' });
        }

        // Delete from Cloudinary
        await cloudinary.uploader.destroy(imageFile.cloudinaryPublicId, {
            resource_type: "image"
        });

        // Delete from database
        await ImageFile.deleteOne({ _id: imageId });

        res.json({ message: 'Image deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Delete failed', error: error.message });
    }
});

module.exports = router;
