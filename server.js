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

// Database Schemas
const waffleSchema = new mongoose.Schema({ 
    name: String, 
    price: Number, 
    description: String, 
    image: String 
});
const Waffle = mongoose.model('Waffle', waffleSchema);

const aboutSchema = new mongoose.Schema({
    ceoName: String, ceoPhoto: String,
    tm1Name: String, tm1Photo: String,
    tm2Name: String, tm2Photo: String,
    journey: String
});
const About = mongoose.model('About', aboutSchema);

// --- API ROUTES ---

// 1. Waffles (Get & Add)
app.get('/api/waffles', async (req, res) => { 
    res.json(await Waffle.find()); 
});

app.post('/api/waffles', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
    const newWaffle = new Waffle(req.body);
    await newWaffle.save();
    res.json(newWaffle);
});

// 2. Delete Waffle (Fixing logic)
app.delete('/api/waffles/:id', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
    await Waffle.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
});

// 3. About & Team (Get & Update)
app.get('/api/about', async (req, res) => {
    const about = await About.findOne();
    res.json(about || {});
});

app.post('/api/about', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
    let about = await About.findOne();
    if (about) {
        Object.assign(about, req.body);
        await about.save();
    } else {
        about = new About(req.body);
        await about.save();
    }
    res.json(about);
});

// --- FRONTEND SERVING (Corrected for Render) ---

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Path fix for new Express versions
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));