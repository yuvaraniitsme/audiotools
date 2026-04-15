const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

dotenv.config();

const app = express();

// Configure CORS to allow both localhost and production URL
const corsOptions = {
    origin: [
        'http://localhost:5000',
        'http://localhost:3000',
        'https://audiotoolsbygoogle.onrender.com',
        'https://audiotoolsbygoogle.onrender.com/'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'user-key'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static("public"));

// Log environment variables (without sensitive info)
console.log("Environment Check:");
console.log("PORT:", process.env.PORT);
console.log("MONGO_URI exists:", !!process.env.MONGO_URI);
console.log("CLOUDINARY_CLOUD_NAME exists:", !!process.env.CLOUDINARY_CLOUD_NAME);

// MongoDB Connection with better error handling
mongoose.connect(process.env.MONGO_URI)
.then(async () => {
    console.log("MongoDB Connected");
    
    // Drop old email index if it exists (from previous schema)
    try {
        const db = mongoose.connection.db;
        const collections = await db.listCollections({ name: 'users' }).toArray();
        if (collections.length > 0) {
            await db.collection('users').dropIndex('email_1');
            console.log('Dropped old email index');
        }
    } catch (err) {
        // Index might not exist, which is fine
        console.log('Email index cleanup:', err.message || 'No old index to drop');
    }
})
.catch(err => {
    console.error("MongoDB Connection Error:", err.message);
    process.exit(1);
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/audio", require("./routes/audioRoutes"));
app.use("/api/images", require("./routes/imageRoutes"));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(process.env.PORT, ()=>{
    console.log(`Server running on port ${process.env.PORT}`);
});
