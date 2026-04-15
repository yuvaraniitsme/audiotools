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

module.exports = router;
