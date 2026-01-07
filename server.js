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

// --- 1. SCHEMAS (MODELS) ---

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
    width: { type: String, default: "200px" }, x: { type: String, default: "0px" }, y: { type: String, default: "0px" }
}));

const Message = mongoose.model('Message', new mongoose.Schema({
    name: String, message: String, date: { type: Date, default: Date.now }
}));

// --- NAYA ORDER MODEL ---
const OrderSchema = new mongoose.Schema({
    userId: String,
    username: String,
    items: Array,
    total: Number,
    status: { type: String, default: 'Pending' }, // Pending, Approved, Cancelled
    paymentMode: { type: String, default: 'WhatsApp' }, // WhatsApp ya Wallet
    date: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

// --- NAYA VOUCHER MODEL ---
const VoucherSchema = new mongoose.Schema({
    code: { type: String, unique: true },
    discount: Number, // Percentage ya Fixed Amount
    isActive: { type: Boolean, default: true }
});
const Voucher = mongoose.model('Voucher', VoucherSchema);

// --- UPDATED USER MODEL (Wallet Added) ---
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    walletBalance: { type: Number, default: 0 }, // Naya Wallet field
    role: { type: String, default: 'user' }
});
const User = mongoose.model('User', UserSchema);


// --- 2. API ROUTES ---

// A. AUTH ROUTES
app.post('/api/register', async (req, res) => {
    try {
        const { username, phone, password } = req.body;
        const newUser = new User({ username, phone, password });
        await newUser.save();
        res.json({ success: true, message: "Account created!" });
    } catch (err) { res.status(400).json({ error: "Details pehle se register hain!" }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
        const user = await User.findOne({ $or: [{username: identifier}, {phone: identifier}], password });
        if (user) {
            res.json({ success: true, role: user.role, username: user.username, wallet: user.walletBalance });
        } else { res.status(401).json({ error: "Galat Details!" }); }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// B. WALLET & ADMIN CONTROL (Paisa bhejne ke liye)
app.post('/api/admin/update-wallet', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
    try {
        const { phone, amount } = req.body;
        const user = await User.findOneAndUpdate({ phone }, { $inc: { walletBalance: amount } }, { new: true });
        res.json({ success: true, newBalance: user.walletBalance });
    } catch (err) { res.status(500).json({ error: "User nahi mila" }); }
});

// C. ORDER SYSTEM
app.post('/api/orders/create', async (req, res) => {
    try {
        const newOrder = new Order(req.body);
        await newOrder.save();
        res.json({ success: true, orderId: newOrder._id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin approves order
app.post('/api/admin/approve-order', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
    try {
        const order = await Order.findByIdAndUpdate(req.body.orderId, { status: 'Approved' }, { new: true });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// User gets their history
app.get('/api/orders/user/:username', async (req, res) => {
    const orders = await Order.find({ username: req.params.username }).sort({ date: -1 });
    res.json(orders);
});

// Admin gets all orders
app.get('/api/admin/all-orders', async (req, res) => {
    const orders = await Order.find().sort({ date: -1 });
    res.json(orders);
});

// D. VOUCHER SYSTEM
app.post('/api/admin/create-voucher', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
    const v = new Voucher(req.body);
    await v.save();
    res.json({ success: true });
});

app.post('/api/apply-voucher', async (req, res) => {
    const v = await Voucher.findOne({ code: req.body.code, isActive: true });
    if (v) res.json({ success: true, discount: v.discount });
    else res.status(400).json({ error: "Invalid Voucher" });
});

// --- E. BAAKI OLD ROUTES (STILL WORKING) ---

app.get('/api/get-users', async (req, res) => {
    const users = await User.find({}, 'username phone walletBalance role');
    res.json(users);
});
app.get('/api/waffles', async (req, res) => { res.json(await Waffle.find()); });
app.post('/api/waffles', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
    const newW = new Waffle(req.body); await newW.save(); res.json(newW);
});
app.delete('/api/waffles/:id', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
    await Waffle.findByIdAndDelete(req.params.id); res.json({ message: "Deleted" });
});
app.get('/api/about', async (req, res) => { res.json(await About.findOne() || {}); });
app.post('/api/about', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
    let a = await About.findOne(); if (a) Object.assign(a, req.body); else a = new About(req.body);
    await a.save(); res.json({ success: true });
});
app.get('/api/get-logo', async (req, res) => { res.json(await LogoSettings.findOne() || { width: "200px", x: "0px", y: "0px" }); });
app.post('/api/save-logo', async (req, res) => {
    let s = await LogoSettings.findOne(); if (s) Object.assign(s, req.body); else s = new LogoSettings(req.body);
    await s.save(); res.json({ success: true });
});
app.post('/api/messages', async (req, res) => {
    const n = new Message(req.body); await n.save(); res.json({ success: true });
});
app.get('/api/get-messages', async (req, res) => { res.json(await Message.find().sort({ date: -1 })); });

app.use(express.static(path.join(__dirname, 'public')));
app.get(/^\/(?!api).*/, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server live on ${PORT}`));