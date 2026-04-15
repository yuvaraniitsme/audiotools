# Audio Processing Application

A full-stack audio processing application with user authentication, file upload, and audio manipulation capabilities.

## Features

- **User Authentication**: 5-digit key-based login system
- **Individual Dashboards**: Each user has their own private dashboard
- **Audio Upload**: Support for all audio file types
- **Cloud Storage**: Files stored in Cloudinary cloud storage
- **Audio Cutting**: Cut audio files with precise timing
- **Audio Joining**: Merge multiple audio files
- **Live Preview**: Play audio with countdown during cutting/joining
- **Download Management**: Download both input and processed files
- **Database Storage**: All file metadata stored in MongoDB

## Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose
- **Cloudinary** for cloud storage
- **FFmpeg** for audio processing
- **Multer** for file uploads

### Frontend
- **HTML5** with vanilla JavaScript
- **CSS3** for styling
- **Fetch API** for backend communication

## Setup Instructions

### 1. Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Cloudinary account

### 2. Environment Setup
1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### 3. Cloudinary Setup
1. Sign up for a Cloudinary account
2. Get your cloud name, API key, and API secret from the dashboard
3. Add these credentials to your `.env` file

### 4. MongoDB Setup
1. Set up a MongoDB instance (local or cloud)
2. Get the connection string
3. Add it to your `.env` file

### 5. FFmpeg Installation
**Windows:**
```bash
# Download FFmpeg from https://ffmpeg.org/download.html
# Add FFmpeg to your system PATH
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt-get install ffmpeg
```

### 6. Running the Application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

The application will be available at `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/create-key` - Create a new user key
- `POST /api/auth/login` - Login with existing key

### Audio Operations
- `POST /api/audio/upload` - Upload audio files
- `GET /api/audio/files` - Get user's uploaded files
- `POST /api/audio/cut` - Cut an audio file
- `POST /api/audio/merge` - Merge multiple audio files
- `GET /api/audio/outputs` - Get user's processed files
- `GET /api/audio/download/:fileId` - Download a file

## Usage Guide

### 1. Creating a User Key
1. Open the application
2. Click "CREATE KEY +"
3. Enter a 5-digit key
4. Click "OK"

### 2. Logging In
1. Click "LOGIN"
2. Enter your 5-digit key
3. Click "SUBMIT"

### 3. Uploading Audio Files
1. From the dashboard, select audio files
2. Click "Upload Files"
3. Files will be uploaded to Cloudinary and stored in the database

### 4. Cutting Audio
1. From the dashboard, click "AUDIO CUTTER"
2. Select an uploaded file
3. Enter start and end times (in seconds)
4. Click "Cut & Download"
5. The processed file will appear in the output files section

### 5. Joining Audio
1. From the dashboard, click "AUDIO JOINER"
2. Select 2 or more uploaded files
3. Click "Merge & Download"
4. The merged file will appear in the output files section

### 6. Downloading Files
- Input files can be downloaded from the file list
- Output files have dedicated download buttons

## Database Schema

### Users Collection
```javascript
{
  key: String (5 digits, unique),
  createdAt: Date
}
```

### Audio Files Collection
```javascript
{
  userKey: String,
  originalName: String,
  cloudinaryUrl: String,
  cloudinaryPublicId: String,
  duration: Number,
  size: Number,
  mimeType: String,
  uploadedAt: Date
}
```

### Output Files Collection
```javascript
{
  userKey: String,
  originalName: String,
  cloudinaryUrl: String,
  cloudinaryPublicId: String,
  operation: String ('cut' or 'join'),
  sourceFiles: [ObjectId],
  cutStartTime: Number,
  cutEndTime: Number,
  duration: Number,
  createdAt: Date
}
```

## Security Features

- User key-based authentication (no encryption as requested)
- File isolation by user key
- Cloudinary secure URLs
- Input validation and sanitization
- Error handling and logging

## Troubleshooting

### Common Issues

1. **FFmpeg not found**: Ensure FFmpeg is installed and in your system PATH
2. **Cloudinary upload fails**: Check your Cloudinary credentials
3. **MongoDB connection fails**: Verify your MongoDB connection string
4. **File upload size limit**: Check Cloudinary and server limits

### Error Messages
- "Key already exists": Choose a different 5-digit key
- "Invalid key": Check if you entered the correct key
- "Upload failed": Check file format and size
- "Cut failed": Ensure start time is less than end time and within file duration

## Project Structure

```
audio/
|-- models/
|   |-- User.js
|   |-- AudioFile.js
|   |-- OutputFile.js
|-- routes/
|   |-- authRoutes.js
|   |-- audioRoutes.js
|-- utils/
|   |-- cloudinary.js
|   |-- audioProcessor.js
|-- public/
|   |-- index.html
|-- .env
|-- package.json
|-- server.js
|-- README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
