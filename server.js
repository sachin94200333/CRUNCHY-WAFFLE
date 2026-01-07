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

const waffleSchema = new mongoose.Schema({ name: String, price: Number, description: String, image: String });
const Waffle = mongoose.model('Waffle', waffleSchema);

const aboutSchema = new mongoose.Schema({
    ceoName: String, ceoPhoto: String,
    tm1Name: String, tm1Photo: String,
    tm2Name: String, tm2Photo: String,
    journey: String
});
const About = mongoose.model('About', aboutSchema);

const LogoSettings = mongoose.model('LogoSettings', new mongoose.Schema({
    width: { type: String, default: "200px" },
    x: { type: String, default: "0px" },
    y: { type: String, default: "0px" }
}));

const Message = mongoose.model('Message', new mongoose.Schema({
    name: String, message: String, date: { type: Date, default: Date.now }
}));

// --- UPDATED USER MODEL (Phone Number Added) ---
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true }, // Naya field mobile ke liye
    password: { type: String, required: true },
    role: { type: String, default: 'user' }
});
const User = mongoose.model('User', UserSchema);

// --- API ROUTES ---

// 1. REGISTER (Ab phone number bhi save hoga)
app.post('/api/register', async (req, res) => {
    try {
        const { username, phone, password } = req.body;
        const newUser = new User({ username, phone, password });
        await newUser.save();
        res.json({ success: true, message: "Account created!" });
    } catch (err) {
        res.status(400).json({ error: "Username ya Phone pehle se register hai!" });
    }
});

// 2. LOGIN (Username ya Phone dono se login chalega)
app.post('/api/login', async (req, res) => {
    try {
        const { identifier, password } = req.body; // identifier = username ya phone
        const user = await User.findOne({
            $or: [ { username: identifier }, { phone: identifier } ],
            password: password
        });
        
        if (user) {
            res.json({ success: true, role: user.role, username: user.username });
        } else {
            res.status(401).json({ error: "Galat Details! Username/Phone ya Password check karein." });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. GET USERS FOR ADMIN (Inki list admin panel mein dikhegi)
app.get('/api/get-users', async (req, res) => {
    try {
        const users = await User.find({}, 'username phone role');
        res.json(users);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- BAAKI PURANE ROUTES (NO CHANGES) ---

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
app.get('/api/about', async (req, res) => { res.json(await About.findOne() || {}); });
app.post('/api/about', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
    let about = await About.findOne();
    if (about) Object.assign(about, req.body); else about = new About(req.body);
    await about.save();
    res.json({ success: true });
});
app.get('/api/get-logo', async (req, res) => { res.json(await LogoSettings.findOne() || { width: "200px", x: "0px", y: "0px" }); });
app.post('/api/save-logo', async (req, res) => {
    let s = await LogoSettings.findOne();
    if (s) Object.assign(s, req.body); else s = new LogoSettings(req.body);
    await s.save();
    res.json({ success: true });
});
app.post('/api/messages', async (req, res) => {
    const newMsg = new Message(req.body);
    await newMsg.save();
    res.json({ success: true });
});
app.get('/api/get-messages', async (req, res) => { res.json(await Message.find().sort({ date: -1 })); });

app.use(express.static(path.join(__dirname, 'public')));
app.get(/^\/(?!api).*/, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server live on ${PORT}`));