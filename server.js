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

// --- YAHAN SE NAYA LOGO CODE SHURU ---
let savedLayout = { width: "200px", x: "0px", y: "0px" };

app.post('/api/save-logo', (req, res) => {
    savedLayout = req.body;
    res.json({ success: true });
});

app.get('/api/get-logo', (req, res) => {
    res.json(savedLayout);
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