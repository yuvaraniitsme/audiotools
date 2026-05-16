const { v2: cloudinaryLib } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Check if environment variables are set
console.log('Cloudinary Config Check:');
console.log('CLOUDINARY_CLOUD_NAME exists:', !!process.env.CLOUDINARY_CLOUD_NAME);
console.log('CLOUDINARY_API_KEY exists:', !!process.env.CLOUDINARY_API_KEY);
console.log('CLOUDINARY_API_SECRET exists:', !!process.env.CLOUDINARY_API_SECRET);

const hasCloudinary = !!process.env.CLOUDINARY_CLOUD_NAME && !!process.env.CLOUDINARY_API_KEY && !!process.env.CLOUDINARY_API_SECRET;
let cloudinary = null;
if (hasCloudinary) {
    cloudinary = cloudinaryLib;
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
} else {
    console.warn('Cloudinary environment variables not set - using local disk storage fallback.');
}

// Dynamic storage: choose folder and resource_type based on file mimetype
let storage;
if (hasCloudinary) {
    storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: (req, file) => {
            const mimetype = file.mimetype || '';
            const isImage = mimetype.startsWith('image/');
            const folder = isImage ? 'image_files' : 'audio_files';
            const resource_type = isImage ? 'image' : 'auto';
            return {
                folder,
                resource_type,
                public_id: Date.now() + '-' + file.originalname.replace(/\.[^/.]+$/, '')
            };
        }
    });
} else {
    // Local disk fallback - save files under public/uploads so they are web-accessible
    const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    storage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
    });

    // Provide a lightweight stubbed cloudinary uploader that returns a local URL
    cloudinary = {
        uploader: {
            upload: async (filePath, options = {}) => {
                // If filePath is already inside public/uploads, build URL
                try {
                    const name = path.basename(filePath);
                    const urlPath = `/uploads/${encodeURIComponent(name)}`;
                    return { secure_url: urlPath, public_id: name };
                } catch (e) {
                    throw e;
                }
            }
        }
    };
}

module.exports = { cloudinary, storage };
