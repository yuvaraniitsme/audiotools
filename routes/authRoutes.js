const express = require('express');
const User = require('../models/User');
const router = express.Router();

router.post('/create-key', async (req, res) => {
    try {
        const { key } = req.body;
        console.log('Create key request received:', key);
        
        if (!key || key.length !== 5) {
            return res.status(400).json({ message: 'Key must be 5 digits' });
        }

        const existingUser = await User.findOne({ key });
        if (existingUser) {
            return res.status(400).json({ message: 'Key already exists' });
        }

        const user = new User({ key });
        await user.save();
        console.log('Key created successfully:', key);

        res.status(201).json({ message: 'Key created successfully', key });
    } catch (error) {
        console.error('Create key error:', error);
        res.status(500).json({ message: 'Server error', error: error.message, stack: error.stack });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { key } = req.body;
        
        if (!key) {
            return res.status(400).json({ message: 'Key is required' });
        }

        const user = await User.findOne({ key });
        if (!user) {
            return res.status(401).json({ message: 'Invalid key' });
        }

        res.status(200).json({ message: 'Login successful', key });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Admin routes
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Middleware to check admin password
function requireAdmin(req, res, next) {
    const adminPass = req.headers['admin-password'];
    if (adminPass !== ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Unauthorized - Invalid admin password' });
    }
    next();
}

// Get all keys (admin only)
router.get('/admin/keys', requireAdmin, async (req, res) => {
    try {
        const users = await User.find({}).select('key createdAt').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        console.error('Error fetching keys:', error);
        res.status(500).json({ message: 'Failed to fetch keys', error: error.message });
    }
});

// Delete a key (admin only)
router.delete('/admin/keys/:key', requireAdmin, async (req, res) => {
    try {
        const { key } = req.params;
        const result = await User.deleteOne({ key });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Key not found' });
        }
        
        res.json({ message: 'Key deleted successfully', key });
    } catch (error) {
        console.error('Error deleting key:', error);
        res.status(500).json({ message: 'Failed to delete key', error: error.message });
    }
});

module.exports = router;
