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

// --- SCHEMAS (MODELS) ---

// 1. Waffle Menu Model
const waffleSchema = new mongoose.Schema({ name: String, price: Number, description: String, image: String });
const Waffle = mongoose.model('Waffle', waffleSchema);

// 2. About/Team Model (CEO & Manager)
const aboutSchema = new mongoose.Schema({
    ceoName: String, ceoPhoto: String,
    tm1Name: String, tm1Photo: String,
    tm2Name: String, tm2Photo: String,
    journey: String
});
const About = mongoose.model('About', aboutSchema);

// 3. Logo Settings Model
const LogoSchema = new mongoose.Schema({
    width: { type: String, default: "200px" },
    x: { type: String, default: "0px" },
    y: { type: String, default: "0px" }
});
const LogoSettings = mongoose.model('LogoSettings', LogoSchema);

// 4. Customer Message Model (Inbox)
const MsgSchema = new mongoose.Schema({
    name: String,
    message: String,
    date: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MsgSchema);

// 5. Naya User Model (Login/Register ke liye)
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' }
});
const User = mongoose.model('User', UserSchema);

// --- API ROUTES ---

// A. AUTH ROUTES (Register & Login)
app.post('/api/register', async (req, res) => {
    try {
        const newUser = new User(req.body);
        await newUser.save();
        res.json({ success: true, message: "Account created!" });
    } catch (err) {
        res.status(400).json({ error: "Username already exists!" });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, password });
        if (user) {
            res.json({ success: true, role: user.role, username: user.username });
        } else {
            res.status(401).json({ error: "Invalid credentials!" });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// B. WAFFLE MENU ROUTES
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

// C. ABOUT & TEAM ROUTES (Fixed)
app.get('/api/about', async (req, res) => {
    const about = await About.findOne();
    res.json(about || {});
});

app.post('/api/about', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
    try {
        let about = await About.findOne();
        if (about) {
            Object.assign(about, req.body);
            await about.save();
        } else {
            about = new About(req.body);
            await about.save();
        }
        res.json({ success: true });
    } catch (err) { res.status(500).send(err); }
});

// D. LOGO ROUTES (Database Sync)
app.get('/api/get-logo', async (req, res) => {
    const settings = await LogoSettings.findOne();
    res.json(settings || { width: "200px", x: "0px", y: "0px" });
});

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
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// E. MESSAGE ROUTES (Inbox)
app.post('/api/messages', async (req, res) => {
    try {
        const newMsg = new Message(req.body);
        await newMsg.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/get-messages', async (req, res) => {
    const messages = await Message.find().sort({ date: -1 });
    res.json(messages);
});

// --- STATICS & ROUTING FIX ---
app.use(express.static(path.join(__dirname, 'public')));

// Path handle for SPA (index.html)
app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server live on ${PORT}`));