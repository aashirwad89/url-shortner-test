const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const Url = require('./models/url');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes

// Home Page - Display all URLs
app.get('/', async (req, res) => {
  try {
    const urls = await Url.find().sort({ createdAt: -1 });
    res.render('index', { 
      urls, 
      error: null, 
      success: null,
      baseUrl: `${req.protocol}://${req.get('host')}`
    });
  } catch (err) {
    res.status(500).render('index', { 
      urls: [], 
      error: 'Error loading URLs',
      success: null,
      baseUrl: `${req.protocol}://${req.get('host')}`
    });
  }
});

// Create Short URL
app.post('/shorten', async (req, res) => {
  const { originalUrl, customCode } = req.body;
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  try {
    // Validate URL
    if (!originalUrl || !isValidUrl(originalUrl)) {
      const urls = await Url.find().sort({ createdAt: -1 });
      return res.render('index', { 
        urls, 
        error: 'Please enter a valid URL',
        success: null,
        baseUrl
      });
    }

    // Check if custom code is already taken
    if (customCode) {
      const existing = await Url.findOne({ shortCode: customCode });
      if (existing) {
        const urls = await Url.find().sort({ createdAt: -1 });
        return res.render('index', { 
          urls, 
          error: 'Custom code already taken',
          success: null,
          baseUrl
        });
      }
    }

    // Check if URL already exists
    let url = await Url.findOne({ originalUrl });
    
    if (url) {
      const urls = await Url.find().sort({ createdAt: -1 });
      return res.render('index', { 
        urls, 
        error: null,
        success: `URL already shortened: ${baseUrl}/${url.shortCode}`,
        baseUrl
      });
    }

    // Create new short URL
    url = new Url({
      originalUrl,
      shortCode: customCode || undefined // Will auto-generate if undefined
    });

    await url.save();

    const urls = await Url.find().sort({ createdAt: -1 });
    res.render('index', { 
      urls, 
      error: null,
      success: `Short URL created: ${baseUrl}/${url.shortCode}`,
      baseUrl
    });
  } catch (err) {
    console.error(err);
    const urls = await Url.find().sort({ createdAt: -1 });
    res.render('index', { 
      urls, 
      error: 'Server error',
      success: null,
      baseUrl
    });
  }
});

// Redirect to Original URL
app.get('/:code', async (req, res) => {
  try {
    const url = await Url.findOne({ shortCode: req.params.code });

    if (url) {
      url.clicks++;
      url.lastAccessed = new Date();
      await url.save();
      return res.redirect(url.originalUrl);
    } else {
      return res.status(404).send('URL not found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Delete URL
app.post('/delete/:id', async (req, res) => {
  try {
    await Url.findByIdAndDelete(req.params.id);
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Helper function to validate URL
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (err) {
    return false;
  }
}

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
