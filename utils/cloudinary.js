const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Check if environment variables are set
console.log('Cloudinary Config Check:');
console.log('CLOUDINARY_CLOUD_NAME exists:', !!process.env.CLOUDINARY_CLOUD_NAME);
console.log('CLOUDINARY_API_KEY exists:', !!process.env.CLOUDINARY_API_KEY);
console.log('CLOUDINARY_API_SECRET exists:', !!process.env.CLOUDINARY_API_SECRET);

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('ERROR: Missing Cloudinary environment variables!');
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Storage for audio files
const audioStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'audio_files',
        resource_type: 'video',
        format: async (req, file) => 'mp3',
        public_id: (req, file) => Date.now() + '-' + file.originalname
    }
});

// Storage for image files
const imageStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'image_files',
        resource_type: 'image',
        public_id: (req, file) => Date.now() + '-' + file.originalname
    }
});

// Default storage (audio)
const storage = audioStorage;

module.exports = { cloudinary, storage, audioStorage, imageStorage };
