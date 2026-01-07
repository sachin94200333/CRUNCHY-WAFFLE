const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log("DB Error: ", err));

// Schemas
const waffleSchema = new mongoose.Schema({ name: String, price: Number, description: String, image: String });
const Waffle = mongoose.model('Waffle', waffleSchema);

const aboutSchema = new mongoose.Schema({
    ceoName: String, ceoPhoto: String,
    tm1Name: String, tm1Photo: String,
    tm2Name: String, tm2Photo: String,
    journey: String
});
const About = mongoose.model('About', aboutSchema);

// API Routes
app.get('/api/waffles', async (req, res) => { res.json(await Waffle.find()); });

app.post('/api/waffles', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
    const newWaffle = new Waffle(req.body);
    await newWaffle.save();
    res.json(newWaffle);
});

app.delete('/api/waffles/:id', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
    await Waffle.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
});

app.get('/api/about', async (req, res) => {
    const about = await About.findOne();
    res.json(about || {});
});

app.post('/api/about', async (req, res) => {
    try {
        // Purana about update logic
        res.json({ success: true });
    } catch (err) {
        res.status(500).send(err);
    }
});

// 1. Logo Schema (Database Model)
const LogoSchema = new mongoose.Schema({
    width: { type: String, default: "200px" },
    x: { type: String, default: "0px" },
    y: { type: String, default: "0px" }
});
const LogoSettings = mongoose.model('LogoSettings', LogoSchema);

// 2. Customer Message Schema
const MsgSchema = new mongoose.Schema({
    name: String,
    message: String,
    date: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MsgSchema);

// 3. Save Logo API (Database Sync)
app.post('/api/save-logo', async (req, res) => {
    try {
        let settings = await LogoSettings.findOne();
        if (settings) {
            Object.assign(settings, req.body);
            await settings.save();
        } else {
            settings = new LogoSettings(req.body);
            await settings.save();
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Get Logo API
app.get('/api/get-logo', async (req, res) => {
    try {
        const settings = await LogoSettings.findOne();
        res.json(settings || { width: "200px", x: "0px", y: "0px" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Customer Message Receive API
app.post('/api/messages', async (req, res) => {
    try {
        const newMsg = new Message(req.body);
        await newMsg.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Get Messages (For Admin Inbox)
app.get('/api/get-messages', async (req, res) => {
    try {
        const messages = await Message.find().sort({ date: -1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- NAYA LOGO CODE KHATAM ---

// --- STATICS & ROUTING FIX ---
app.use(express.static(path.join(__dirname, 'public')));

// Static files aur Listen wala part niche rahega
app.use(express.static(path.join(__dirname, 'public')));
// --- Yahan tak ---

// --- ISKE NICHE YE PEHLE SE LIKHA HOGA ---
// --- STATICS & ROUTING FIX ---

// --- STATICS & ROUTING FIX ---
// Path ko handle karne ka sahi tarika naye Express ke liye
app.use(express.static(path.join(__dirname, 'public')));

app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server live on ${PORT}`));