require('dotenv').config(); // Load environment variables

const express = require('express');
const mongoose = require('mongoose');
const geoip = require('geoip-lite');
const ShortUrl = require('./models/shortUrl');

const app = express();

mongoose.set('strictQuery', true);
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch(err => console.error("❌ MongoDB connection error:", err));

app.set('view engine', 'ejs');
app.set('trust proxy', true);
app.use(express.urlencoded({ extended: true }));

app.get('/', async (req, res) => {
  try {
    const shortUrls = await ShortUrl.find().sort({ clicks: -1 });
    const labels = shortUrls.map(url => url.short);
    const data = shortUrls.map(url => url.clicks);
    const colors = [
      'rgb(255, 99, 132)', 'rgb(54, 162, 235)', 'rgb(255, 205, 86)',
      'rgb(225, 90, 32)', 'rgb(54, 12, 25)', 'rgb(55, 225, 6)',
      'rgb(215, 5, 86)', 'rgb(225, 90, 32)', 'rgb(54, 2, 25)'
    ];
    const backgroundcolor = labels.map(() => colors[Math.floor(Math.random() * colors.length)]);

    res.render('index', { shortUrls, labels, data, backgroundcolor });
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong.");
  }
});

app.post('/shortUrls', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const geo = geoip.lookup(ip);
  const region = geo ? geo.country : "Unknown";

  try {
    await ShortUrl.create({ full: req.body.fullUrl, region });
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send("Could not shorten URL.");
  }
});

app.get('/:shortUrl', async (req, res) => {
  try {
    const shortUrl = await ShortUrl.findOne({ short: req.params.shortUrl });
    if (!shortUrl) return res.sendStatus(404);
    shortUrl.clicks++;
    await shortUrl.save();
    res.redirect(shortUrl.full);
  } catch (err) {
    console.error(err);
    res.status(500).send("Redirect failed.");
  }
});

app.listen(process.env.PORT || 5000, () => {
  console.log("🚀 Server running on port 5000");
	console.log("🌐 Visit http://localhost:5000 to access the URL shortener");
});
