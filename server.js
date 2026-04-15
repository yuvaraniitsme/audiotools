const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Log environment variables (without sensitive info)
console.log("Environment Check:");
console.log("PORT:", process.env.PORT);
console.log("MONGO_URI exists:", !!process.env.MONGO_URI);
console.log("CLOUDINARY_CLOUD_NAME exists:", !!process.env.CLOUDINARY_CLOUD_NAME);

// MongoDB Connection with better error handling
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
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
