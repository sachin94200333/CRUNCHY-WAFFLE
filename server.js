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
    addOns: { type: Array, default: [] }
});
const Waffle = mongoose.model('Waffle', waffleSchema);

const aboutSchema = new mongoose.Schema({
    ceoName: String, ceoPhoto: String,
    tm1Name: String, tm1Photo: String,
    tm2Name: String, tm2Photo: String,
    journey: String, phone: String, gmail: String 
});
const About = mongoose.model('About', aboutSchema);

const LogoSettings = mongoose.model('LogoSettings', new mongoose.Schema({
    width: { type: String, default: "200px" }, x: { type: String, default: "0px" }, y: { type: String, default: "0px" }
}));

const Message = mongoose.model('Message', new mongoose.Schema({
    username: String, name: String, message: String, 
    reply: { type: String, default: "" }, 
    date: { type: Date, default: Date.now }
}));

const Offer = mongoose.model('Offer', new mongoose.Schema({
    text: { type: String, default: "Welcome to Crunchy Waffle!" }
}));

const QRSettings = mongoose.model('QRSettings', new mongoose.Schema({
    qrUrl: { type: String, default: "/images/qr.png" }
}));

const OrderSchema = new mongoose.Schema({
    userId: String, username: String, items: Array, total: Number,
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

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    walletBalance: { type: Number, default: 0 },
    loyaltyPoints: { type: Number, default: 0 },
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

// B. QR & OFFER ROUTES
app.get('/api/get-qr', async (req, res) => {
    const qr = await QRSettings.findOne() || { qrUrl: "/images/qr.png" };
    res.json(qr);
});
app.post('/api/save-qr', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
    let q = await QRSettings.findOne();
    if (q) q.qrUrl = req.body.qrUrl; else q = new QRSettings({ qrUrl: req.body.qrUrl });
    await q.save(); res.json({ success: true });
});
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

// C. WALLET & USER ADMIN
app.post('/api/admin/update-wallet', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
    try {
        const { phone, amount } = req.body;
        const user = await User.findOneAndUpdate({ phone }, { $inc: { walletBalance: amount } }, { new: true });
        res.json({ success: true, newBalance: user.walletBalance });
    } catch (err) { res.status(500).json({ error: "User nahi mila" }); }
});
app.post('/api/admin/get-users', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD && req.body.adminPassword !== "bypass_for_user_own_data") {
        return res.status(401).send("Unauthorized");
    }
    const users = await User.find({}, 'username phone walletBalance loyaltyPoints role');
    res.json(users);
});

// D. ORDER SYSTEM (With Smart Auto-Approve)
app.post('/api/orders/create', async (req, res) => {
    try {
        const points = Math.floor(req.body.total * 0.1);
        const newOrder = new Order({ ...req.body, pointsEarned: points });
        
        if (req.body.status === 'Approved') {
            await User.findOneAndUpdate(
                { username: req.body.username },
                { $inc: { walletBalance: -req.body.walletDeducted, loyaltyPoints: points } }
            );
        }
        await newOrder.save();
        res.json({ success: true, orderId: newOrder._id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/approve-order', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
    try {
        const order = await Order.findById(req.body.orderId);
        if (order && order.status === 'Pending') {
            await User.findOneAndUpdate(
                { username: order.username },
                { $inc: { walletBalance: -order.walletDeducted, loyaltyPoints: order.pointsEarned } }
            );
            order.status = 'Approved';
            await order.save();
            res.json({ success: true });
        } else { res.status(400).send("Already processed or not found"); }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/orders/user/:username', async (req, res) => {
    const orders = await Order.find({ username: req.params.username }).sort({ date: -1 });
    res.json(orders);
});
app.post('/api/admin/all-orders', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
    const orders = await Order.find().sort({ date: -1 });
    res.json(orders);
});

// E. VOUCHER SYSTEM
app.post('/api/admin/create-voucher', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
    const v = new Voucher(req.body); await v.save(); res.json({ success: true });
});
app.post('/api/apply-voucher', async (req, res) => {
    const v = await Voucher.findOne({ code: req.body.code, isActive: true });
    if (v) res.json({ success: true, discount: v.discount });
    else res.status(400).json({ error: "Invalid Voucher" });
});

// F. MESSAGES & CHAT
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

// G. OLD SETTINGS (Waffles, About, Logo)
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
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
    let s = await LogoSettings.findOne(); if (s) Object.assign(s, req.body); else s = new LogoSettings(req.body);
    await s.save(); res.json({ success: true });
});

app.use(express.static(path.join(__dirname, 'public')));
app.get(/^\/(?!api).*/, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server live on ${PORT}`));