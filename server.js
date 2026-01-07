const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected... Crunchy Waffle is Live!"))
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

// 2. Customer Message Schema
const messageSchema = new mongoose.Schema({
    name: String,
    email: String,
    message: String,
    date: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// 3. Team & About Schema
const aboutSchema = new mongoose.Schema({
    ceoName: String,
    ceoPhoto: String,
    tm1Name: String,
    tm1Photo: String,
    tm2Name: String,
    tm2Photo: String,
    journey: String
});
const About = mongoose.model('About', aboutSchema);

// --- API ROUTES ---

// Get All Waffles
app.get('/api/waffles', async (req, res) => {
    try {
        const waffles = await Waffle.find();
        res.json(waffles);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add Waffle (Admin)
app.post('/api/waffles', async (req, res) => {
    const { adminPassword, name, price, description, image } = req.body;
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const newWaffle = new Waffle({ name, price, description, image });
    try {
        await newWaffle.save();
        res.json(newWaffle);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get About/Team Info
app.get('/api/about', async (req, res) => {
    try {
        const about = await About.findOne();
        res.json(about || { ceoName: "Sachin", journey: "Hamari Shuruat..." });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update About/Team Info (Admin)
app.post('/api/about', async (req, res) => {
    const { adminPassword, ceoName, ceoPhoto, tm1Name, tm1Photo, tm2Name, tm2Photo, journey } = req.body;
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        let about = await About.findOne();
        if (about) {
            about.ceoName = ceoName; about.ceoPhoto = ceoPhoto;
            about.tm1Name = tm1Name; about.tm1Photo = tm1Photo;
            about.tm2Name = tm2Name; about.tm2Photo = tm2Photo;
            about.journey = journey;
            await about.save();
        } else {
            about = new About({ ceoName, ceoPhoto, tm1Name, tm1Photo, tm2Name, tm2Photo, journey });
            await about.save();
        }
        res.json(about);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Save Customer Message
app.post('/api/messages', async (req, res) => {
    const { name, email, message } = req.body;
    const newMessage = new Message({ name, email, message });
    try {
        await newMessage.save();
        res.json({ message: "Sent!" });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get All Messages (Admin)
app.post('/api/admin/messages', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const messages = await Message.find().sort({ date: -1 });
    res.json(messages);
});

// Serve Frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));