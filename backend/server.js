require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Middleware
// Security headers
app.use(helmet());

// Basic request logging
app.use(morgan('dev'));

// JSON parsing
app.use(express.json());
app.use(cookieParser());

// CORS allowlist
const defaultOrigins = ['http://localhost:4173'];
const envOrigins = (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

app.use(cors({
  origin: (origin, cb) => {
    // Allow non-browser clients or same-origin
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS: Origin not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: false
}));

// Rate limiting for API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', apiLimiter);

// Load data (safe)
function safeLoadJSON(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error(`Failed to parse JSON: ${filePath}`, e.message);
  }
  return fallback;
}

const produceData = safeLoadJSON(path.join(__dirname, 'data', 'produce.json'), { categories: [] });
const farmsData = safeLoadJSON(path.join(__dirname, 'data', 'farms.json'), { farms: [] });
const faqData = safeLoadJSON(path.join(__dirname, 'data', 'faqs.json'), { categories: [], faqs: [] });

// In-memory storage for applications and submissions (in production, use a database)
const farmApplicationsFile = path.join(__dirname, 'data', 'farm-applications.json');
const newsletterFile = path.join(__dirname, 'data', 'newsletter.json');
const waitlistFile = path.join(__dirname, 'data', 'waitlist.json');
const earlyAccessFile = path.join(__dirname, 'data', 'early-access.json');

// Helper functions for data persistence
function loadJSON(filePath, defaultValue = []) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
  }
  return defaultValue;
}

function saveJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error saving ${filePath}:`, error);
    return false;
  }
}

// Email notifications
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'tiekujason@gmail.com';
let mailTransporter = null;

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true';

  if (!host || !user || !pass) {
    console.warn('Email notifications disabled: SMTP credentials not set.');
    return null;
  }

  try {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass }
    });
  } catch (err) {
    console.error('Failed to create mail transporter:', err);
    return null;
  }
}

async function sendEmail({ subject, text, html }) {
  if (!mailTransporter) {
    mailTransporter = createTransporter();
  }

  if (!mailTransporter) return;

  const fromAddress = process.env.FROM_EMAIL || process.env.SMTP_USER || 'no-reply@cropcartgh.local';

  try {
    await mailTransporter.sendMail({
      from: fromAddress,
      to: NOTIFY_EMAIL,
      subject,
      text,
      html: html || undefined
    });
  } catch (err) {
    console.error('Failed to send notification email:', err);
  }
}

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'CropCart GH API - Ghana Produce Platform',
    version: '1.0.0',
    endpoints: {
      produce: '/api/produce',
      categories: '/api/categories',
      farms: '/api/farms',
      faqs: '/api/faqs',
      farmApplications: '/api/farm-applications',
      newsletter: '/api/newsletter',
      waitlist: '/api/waitlist',
      earlyAccess: '/api/early-access',
      cookieDemo: '/api/cookie-demo',
      health: '/health'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    categories: produceData.categories?.length || 0,
    farms: farmsData.farms?.length || 0
  });
});

// Cookie demo: sets a signed, HttpOnly cookie and echoes visible cookies
app.get('/api/cookie-demo', (req, res) => {
  // Basic demo cookie (HttpOnly so JS can't read it)
  res.cookie('cc_demo', 'early-bird', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // set true when behind HTTPS
    sameSite: 'Lax',
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  });

  // Non-HttpOnly cookie for client-side reads (example only)
  res.cookie('cc_pref', 'newsletter-optin', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 1000 * 60 * 60 * 24 * 30 // 30 days
  });

  res.json({
    success: true,
    message: 'Cookies set. Check browser devtools > Application > Cookies.',
    visibleCookies: req.cookies || {}
  });
});

// Get all produce categories
app.get('/api/categories', (req, res) => {
  const categories = produceData.categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    itemCount: cat.items.length
  }));
  res.json({ categories });
});

// Get all produce items
app.get('/api/produce', (req, res) => {
  const { category, season } = req.query;
  
  let items = [];
  produceData.categories.forEach(cat => {
    if (!category || cat.id === category) {
      items.push(...cat.items.map(item => ({
        ...item,
        category: cat.name,
        categoryId: cat.id
      })));
    }
  });

  if (season) {
    items = items.filter(item => 
      item.season.toLowerCase().includes(season.toLowerCase()) || 
      item.season.toLowerCase() === 'year-round'
    );
  }

  res.json({ 
    count: items.length,
    items 
  });
});

// Get produce by category
app.get('/api/produce/category/:categoryId', (req, res) => {
  const category = produceData.categories.find(cat => cat.id === req.params.categoryId);
  
  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }

  res.json(category);
});

// Get specific produce item
app.get('/api/produce/:id', (req, res) => {
  let foundItem = null;
  let foundCategory = null;

  for (const category of produceData.categories) {
    const item = category.items.find(i => i.id === req.params.id);
    if (item) {
      foundItem = item;
      foundCategory = category;
      break;
    }
  }

  if (!foundItem) {
    return res.status(404).json({ error: 'Produce item not found' });
  }

  res.json({
    ...foundItem,
    category: foundCategory.name,
    categoryId: foundCategory.id
  });
});

// Get all farms
app.get('/api/farms', (req, res) => {
  const { location } = req.query;
  
  let farms = farmsData.farms;
  
  if (location) {
    farms = farms.filter(farm => 
      farm.location.toLowerCase().includes(location.toLowerCase())
    );
  }

  res.json({ 
    count: farms.length,
    farms 
  });
});

// Get specific farm
app.get('/api/farms/:id', (req, res) => {
  const farm = farmsData.farms.find(f => f.id === req.params.id);
  
  if (!farm) {
    return res.status(404).json({ error: 'Farm not found' });
  }

  res.json(farm);
});

// Search produce
app.get('/api/search', (req, res) => {
  const { q } = req.query;
  
  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }

  const query = q.toLowerCase();
  const results = {
    produce: [],
    farms: []
  };

  // Search produce
  produceData.categories.forEach(cat => {
    cat.items.forEach(item => {
      if (item.name.toLowerCase().includes(query) || 
          cat.name.toLowerCase().includes(query)) {
        results.produce.push({
          ...item,
          category: cat.name,
          categoryId: cat.id
        });
      }
    });
  });

  // Search farms
  farmsData.farms.forEach(farm => {
    if (farm.name.toLowerCase().includes(query) || 
        farm.location.toLowerCase().includes(query) ||
        farm.specialties.some(s => s.toLowerCase().includes(query))) {
      results.farms.push(farm);
    }
  });

  res.json({
    query: q,
    count: results.produce.length + results.farms.length,
    results
  });
});

// Get all FAQs
app.get('/api/faqs', (req, res) => {
  const { category } = req.query;
  
  let faqs = faqData.faqs;
  
  if (category && category !== 'all') {
    faqs = faqs.filter(faq => faq.category === category);
  }

  res.json({ 
    count: faqs.length,
    categories: faqData.categories,
    faqs 
  });
});

// Submit farm partnership application
app.post('/api/farm-applications', (req, res) => {
  const { farmName, location, farmSize, specialties, certifications, contactName, phone, email, experience, message } = req.body;
  
  // Validation
  if (!farmName || !location || !farmSize || !specialties || !contactName || !phone || !email || !experience) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const application = {
    id: `app_${Date.now()}`,
    farmName,
    location,
    farmSize: parseInt(farmSize),
    specialties,
    certifications: certifications || '',
    contactName,
    phone,
    email,
    experience,
    message: message || '',
    status: 'pending',
    submittedAt: new Date().toISOString()
  };

  const applications = loadJSON(farmApplicationsFile, []);
  applications.push(application);
  
  if (saveJSON(farmApplicationsFile, applications)) {
    sendEmail({
      subject: `New farm application: ${farmName}`,
      text: `Farm: ${farmName}\nLocation: ${location}\nSize: ${farmSize} acres\nSpecialties: ${specialties}\nCertifications: ${certifications || 'N/A'}\nContact: ${contactName}\nPhone: ${phone}\nEmail: ${email}\nExperience: ${experience}\nMessage: ${message || ''}`
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      applicationId: application.id
    });
  } else {
    res.status(500).json({ error: 'Failed to save application' });
  }
});

// Newsletter signup
app.post('/api/newsletter', (req, res) => {
  const { email, name } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const subscribers = loadJSON(newsletterFile, []);
  
  // Check for duplicates
  if (subscribers.some(sub => sub.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'Email already subscribed' });
  }

  const subscriber = {
    id: `sub_${Date.now()}`,
    email,
    name: name || '',
    subscribedAt: new Date().toISOString()
  };

  subscribers.push(subscriber);
  
  if (saveJSON(newsletterFile, subscribers)) {
    sendEmail({
      subject: `New newsletter signup: ${email}`,
      text: `Email: ${email}\nName: ${name || 'N/A'}`
    });

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to newsletter'
    });
  } else {
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// Waitlist signup
app.post('/api/waitlist', (req, res) => {
  const { email, name, businessType, location, newsletterConsent } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const waitlist = loadJSON(waitlistFile, []);
  
  // Check for duplicates
  if (waitlist.some(entry => entry.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'Email already on waitlist' });
  }

  const entry = {
    id: `wait_${Date.now()}`,
    email,
    name: name || '',
    businessType: businessType || '',
    location: location || '',
    newsletterConsent: Boolean(newsletterConsent),
    joinedAt: new Date().toISOString()
  };

  waitlist.push(entry);
  
  if (saveJSON(waitlistFile, waitlist)) {
    sendEmail({
      subject: `New waitlist signup: ${name || 'Someone new'}`,
      text: `Name: ${name || 'N/A'}\nEmail: ${email}\nBusiness Type: ${businessType || 'N/A'}\nLocation: ${location || 'N/A'}\nPosition: ${waitlist.length}\nNewsletter consent: ${entry.newsletterConsent ? 'Yes' : 'No'}`
    });

    res.status(201).json({
      success: true,
      message: 'Successfully joined waitlist',
      position: waitlist.length
    });
  } else {
    res.status(500).json({ error: 'Failed to save waitlist entry' });
  }
});

// Early access signup
app.post('/api/early-access', (req, res) => {
  const { email, name, businessType, location, phone, notes } = req.body;

  if (!email || !name || !businessType || !location) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const entries = loadJSON(earlyAccessFile, []);

  if (entries.some(e => e.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'Email already requested early access' });
  }

  const entry = {
    id: `ea_${Date.now()}`,
    email,
    name,
    businessType,
    location,
    phone: phone || '',
    notes: notes || '',
    requestedAt: new Date().toISOString()
  };

  entries.push(entry);

  if (saveJSON(earlyAccessFile, entries)) {
    sendEmail({
      subject: `New early access request: ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nBusiness Type: ${businessType}\nLocation: ${location}\nPhone: ${phone || 'N/A'}\nNotes: ${notes || 'N/A'}\nPosition: ${entries.length}`
    });

    res.status(201).json({
      success: true,
      message: 'Early access requested successfully',
      position: entries.length
    });
  } else {
    res.status(500).json({ error: 'Failed to save early access request' });
  }
});

// Get waitlist stats (admin endpoint)
app.get('/api/admin/stats', (req, res) => {
  const applications = loadJSON(farmApplicationsFile, []);
  const newsletter = loadJSON(newsletterFile, []);
  const waitlist = loadJSON(waitlistFile, []);
  const earlyAccess = loadJSON(earlyAccessFile, []);

  res.json({
    farmApplications: {
      total: applications.length,
      pending: applications.filter(a => a.status === 'pending').length,
      approved: applications.filter(a => a.status === 'approved').length,
      rejected: applications.filter(a => a.status === 'rejected').length
    },
    newsletter: {
      total: newsletter.length
    },
    waitlist: {
      total: waitlist.length
    }
    ,
    earlyAccess: {
      total: earlyAccess.length
    }
  });
});

// Simple CSV export for admin use
app.get('/api/admin/export/:type', (req, res) => {
  const { type } = req.params;
  const sources = {
    waitlist: { file: waitlistFile, headers: ['id', 'name', 'email', 'businessType', 'location', 'phone', 'notes', 'newsletterConsent', 'position', 'createdAt'] },
    early: { file: earlyAccessFile, headers: ['id', 'name', 'email', 'businessType', 'location', 'phone', 'notes', 'requestedAt'] },
    newsletter: { file: newsletterFile, headers: ['id', 'email', 'createdAt'] }
  };

  const source = sources[type];
  if (!source) return res.status(400).json({ error: 'Unsupported export type. Use waitlist, early, or newsletter.' });

  const rows = loadJSON(source.file, []);
  const { headers } = source;

  const escape = (val) => {
    if (val === undefined || val === null) return '';
    const str = String(val).replace(/"/g, '""');
    return str.includes(',') || str.includes('\n') ? `"${str}"` : str;
  };

  const csv = [headers.join(',')]
    .concat(rows.map(r => headers.map(h => escape(r[h])).join(',')))
    .join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=${type}-export.csv`);
  res.send(csv);
});

// Store chat messages
const chatMessagesFile = path.join(__dirname, 'data', 'chat-messages.json');

app.post('/api/chat/messages', (req, res) => {
  const { sessionId, userMessage, botResponse, timestamp } = req.body;
  
  if (!sessionId || !userMessage) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const chatMessages = loadJSON(chatMessagesFile, []);
  
  const message = {
    id: `msg_${Date.now()}`,
    sessionId,
    userMessage,
    botResponse: botResponse || '',
    timestamp: timestamp || new Date().toISOString()
  };

  chatMessages.push(message);
  
  if (saveJSON(chatMessagesFile, chatMessages)) {
    res.status(201).json({
      success: true,
      messageId: message.id
    });
  } else {
    res.status(500).json({ error: 'Failed to save chat message' });
  }
});

// Get chat history by session
app.get('/api/chat/messages/:sessionId', (req, res) => {
  const chatMessages = loadJSON(chatMessagesFile, []);
  const sessionMessages = chatMessages.filter(msg => msg.sessionId === req.params.sessionId);
  
  res.json({
    count: sessionMessages.length,
    messages: sessionMessages
  });
});

// Error handling
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🌱 CropCart GH API running on http://localhost:${PORT}`);
  console.log(`📊 Serving ${(produceData.categories || []).length} categories and ${(farmsData.farms || []).length} farms`);
  console.log(`🔐 CORS allowlist: ${allowedOrigins.join(', ')}`);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
