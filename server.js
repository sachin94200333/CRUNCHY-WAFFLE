const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// 1. Database Connection (Aapka wala link)
const dbURI = 'mongodb+srv://waffle:Waffle123@cluster0.gy0mylx.mongodb.net/crunchyWaffle?retryWrites=true&w=majority';

mongoose.connect(dbURI)
  .then(() => console.log("✅ FINALLY! Crunchy Waffle DB Connect Ho Gaya!"))
  .catch((err) => console.log("❌ Connection Error:", err.message));

// 2. Waffle Schema aur Model
const waffleSchema = new mongoose.Schema({
    name: String,
    price: Number,
    image: String
});
const Waffle = mongoose.model('Waffle', waffleSchema);

// 3. Pehla Waffle daalne ka function (Optional Testing)
const seedDB = async () => {
    const count = await Waffle.countDocuments();
    if(count === 0) {
        await Waffle.create({
            name: "Nutella Bliss",
            price: 149,
            image: "https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=800"
        });
        console.log("🍦 Pehla Waffle DB mein save ho gaya!");
    }
};
seedDB();

// 4. API Routes (Inhe delete mat karna)

// GET: Menu dikhane ke liye
app.get('/api/waffles', async (req, res) => {
    const waffles = await Waffle.find();
    res.json(waffles);
});

// POST: Naya Waffle add karne ke liye
app.post('/api/waffles', async (req, res) => {
    try {
        const newWaffle = new Waffle(req.body);
        await newWaffle.save();
        res.json({ message: "Waffle added!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Server Start
const PORT = 5000;
app.delete('/api/waffles/:id', async (req, res) => {
    await Waffle.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
});
app.listen(PORT, () => {
    console.log(`🚀 Server chalu hai: http://localhost:${PORT}`);
});