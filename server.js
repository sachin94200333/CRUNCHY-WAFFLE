const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Sabse Zaroori: Isse aapka naya 'public' folder website dikhayega
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected... Crunchy Waffle is Live!  waffle"))
.catch(err => console.log("MongoDB Connection Error: ", err));

// --- DATA MODELS ---

// 1. Waffle Menu Schema
const waffleSchema = new mongoose.Schema({
    name: String,
    price: Number,
    description: String,
    image: String
});
const Waffle = mongoose.model('Waffle', waffleSchema);

// 2. Customer Message Schema (Aapka naya Inbox)
const messageSchema = new mongoose.Schema({
    name: String,
    email: String,
    message: String,
    date: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// --- API ROUTES ---

// 1. Get All Waffles (Customer Menu ke liye)
app.get('/api/waffles', async (req, res) => {
    try {
        const waffles = await Waffle.find();
        res.json(waffles);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. Add Waffle (Sirf Admin ke liye - Password protected)
app.post('/api/waffles', async (req, res) => {
    const { adminPassword, name, price, description, image } = req.body;
    
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: "Galat Password! Aap waffle add nahi kar sakte." });
    }

    const newWaffle = new Waffle({ name, price, description, image });
    try {
        await newWaffle.save();
        res.json(newWaffle);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// 3. Delete Waffle (Sirf Admin ke liye)
app.delete('/api/waffles/:id', async (req, res) => {
    const { adminPassword } = req.body;
    
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        await Waffle.findByIdAndDelete(req.params.id);
        res.json({ message: "Waffle Deleted Successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 4. Save Customer Message (Jab koi contact form bharega)
app.post('/api/messages', async (req, res) => {
    const { name, email, message } = req.body;
    const newMessage = new Message({ name, email, message });
    try {
        await newMessage.save();
        res.json({ message: "Aapka message mil gaya hai! Hum jald contact karenge." });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// 5. Get All Messages (Sirf Admin dekh sakega)
app.post('/api/admin/messages', async (req, res) => {
    const { adminPassword } = req.body;
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const messages = await Message.find().sort({ date: -1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Catch-all route to serve index.html for any other requests
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));