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

const waffleSchema = new mongoose.Schema({ 
    name: String, price: Number, description: String, image: String,
    addOns: { type: Array, default: [] } // List 4: Add-ons
});
const Waffle = mongoose.model('Waffle', waffleSchema);

const aboutSchema = new mongoose.Schema({
    ceoName: String, ceoPhoto: String,
    tm1Name: String, tm1Photo: String,
    tm2Name: String, tm2Photo: String,
    journey: String,
    phone: String, gmail: String // List 5: Contact Info
});
const About = mongoose.model('About', aboutSchema);

const LogoSettings = mongoose.model('LogoSettings', new mongoose.Schema({
    width: { type: String, default: "200px" }, x: { type: String, default: "0px" }, y: { type: String, default: "0px" }
}));

// List 6: Two-Way Chat (Reply added)
const Message = mongoose.model('Message', new mongoose.Schema({
    username: String, name: String, message: String, 
    reply: { type: String, default: "" }, 
    date: { type: Date, default: Date.now }
}));

// List 2: Offer of the Day Schema
const Offer = mongoose.model('Offer', new mongoose.Schema({
    text: { type: String, default: "Welcome to Crunchy Waffle!" },
    isActive: { type: Boolean, default: true }
}));

// List 1 & 3: Updated Order Schema
const OrderSchema = new mongoose.Schema({
    userId: String,
    username: String,
    items: Array,
    total: Number,
    walletDeducted: { type: Number, default: 0 },
    cashPaid: { type: Number, default: 0 },
    transactionId: { type: String, default: "N/A" },
    pointsEarned: { type: Number, default: 0 },
    status: { type: String, default: 'Pending' }, 
    date: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

const VoucherSchema = new mongoose.Schema({
    code: { type: String, unique: true },
    discount: Number,
    isActive: { type: Boolean, default: true }
});
const Voucher = mongoose.model('Voucher', VoucherSchema);

// List 3: User Model with Points
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    walletBalance: { type: Number, default: 0 },
    loyaltyPoints: { type: Number, default: 0 }, // List 3: Points
    role: { type: String, default: 'user' }
});
const User = mongoose.model('User', UserSchema);


// --- 2. API ROUTES ---

// AUTH & USER INFO
app.post('/api/register', async (req, res) => {
    try {
        const { username, phone, password } = req.body;
        const newUser = new User({ username, phone, password });
        await newUser.save();
        res.json({ success: true, message: "Account created!" });
    } catch (err) { res.status(400).json({ error: "Details already exist!" }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
        const user = await User.findOne({ $or: [{username: identifier}, {phone: identifier}], password });
        if (user) {
            res.json({ success: true, role: user.role, username: user.username, wallet: user.walletBalance, points: user.loyaltyPoints });
        } else { res.status(401).json({ error: "Galat Details!" }); }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// List 6: Protected User List for Admin
app.post('/api/admin/get-users', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
    const users = await User.find({}, 'username phone walletBalance loyaltyPoints');
    res.json(users);
});

// List 2: Offer Routes
app.get('/api/get-offer', async (req, res) => {
    const offer = await Offer.findOne() || { text: "Premium Waffles Await!" };
    res.json(offer);
});
app.post('/api/admin/update-offer', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
    let o = await Offer.findOne();
    if(o) o.text = req.body.text; else o = new Offer({ text: req.body.text });
    await o.save(); res.json({ success: true });
});

// List 1: Wallet Update
app.post('/api/admin/update-wallet', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
    try {
        const { phone, amount } = req.body;
        const user = await User.findOneAndUpdate({ phone }, { $inc: { walletBalance: amount } }, { new: true });
        res.json({ success: true, newBalance: user.walletBalance });
    } catch (err) { res.status(500).json({ error: "User nahi mila" }); }
});

// List 1 & 3: Order System with Points Calculation
app.post('/api/orders/create', async (req, res) => {
    try {
        const points = Math.floor(req.body.total * 0.1); // 10% Points
        const newOrder = new Order({ ...req.body, pointsEarned: points });
        await newOrder.save();
        res.json({ success: true, orderId: newOrder._id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// List 1 & 3: Admin approves order & deducts wallet/adds points
app.post('/api/admin/approve-order', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
    try {
        const order = await Order.findById(req.body.orderId);
        if (order.status === 'Pending') {
            // Deduct Wallet & Add Points
            await User.findOneAndUpdate(
                { username: order.username },
                { $inc: { walletBalance: -order.walletDeducted, loyaltyPoints: order.pointsEarned } }
            );
            order.status = 'Approved';
            await order.save();
            res.json({ success: true });
        } else {
            res.status(400).send("Already processed");
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Order History
app.get('/api/orders/user/:username', async (req, res) => {
    const orders = await Order.find({ username: req.params.username }).sort({ date: -1 });
    res.json(orders);
});

app.post('/api/admin/all-orders', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
    const orders = await Order.find().sort({ date: -1 });
    res.json(orders);
});

// MESSAGES & CHAT (List 6)
app.post('/api/messages', async (req, res) => {
    const n = new Message(req.body); await n.save(); res.json({ success: true });
});

app.post('/api/admin/get-messages', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
    res.json(await Message.find().sort({ date: -1 }));
});

app.post('/api/admin/reply-message', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
    await Message.findByIdAndUpdate(req.body.msgId, { reply: req.body.reply });
    res.json({ success: true });
});

app.get('/api/user-messages/:username', async (req, res) => {
    const msgs = await Message.find({ username: req.params.username }).sort({ date: -1 });
    res.json(msgs);
});

// BAAKI OLD ROUTES (Logo, Waffles, About)
app.get('/api/waffles', async (req, res) => { res.json(await Waffle.find()); });
app.get('/api/about', async (req, res) => { res.json(await About.findOne() || {}); });
app.get('/api/get-logo', async (req, res) => { res.json(await LogoSettings.findOne() || { width: "200px", x: "0px", y: "0px" }); });

// ... (Baaki Admin Update/Save routes jo aapke code mein the, wo sab yahan included hain) ...
app.post('/api/about', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
    let a = await About.findOne(); if (a) Object.assign(a, req.body); else a = new About(req.body);
    await a.save(); res.json({ success: true });
});
app.post('/api/save-logo', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
    let s = await LogoSettings.findOne(); if (s) Object.assign(s, req.body); else s = new LogoSettings(req.body);
    await s.save(); res.json({ success: true });
});

app.use(express.static(path.join(__dirname, 'public')));
app.get(/^\/(?!api).*/, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server live on ${PORT}`));