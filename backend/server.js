const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Load data
const produceData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'produce.json'), 'utf8'));
const farmsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'farms.json'), 'utf8'));
const faqData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'faqs.json'), 'utf8'));

// In-memory storage for applications and submissions (in production, use a database)
const farmApplicationsFile = path.join(__dirname, 'data', 'farm-applications.json');
const newsletterFile = path.join(__dirname, 'data', 'newsletter.json');
const waitlistFile = path.join(__dirname, 'data', 'waitlist.json');

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
      health: '/health'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
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
  const { email, name, businessType, location } = req.body;
  
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
    joinedAt: new Date().toISOString()
  };

  waitlist.push(entry);
  
  if (saveJSON(waitlistFile, waitlist)) {
    res.status(201).json({
      success: true,
      message: 'Successfully joined waitlist',
      position: waitlist.length
    });
  } else {
    res.status(500).json({ error: 'Failed to save waitlist entry' });
  }
});

// Get waitlist stats (admin endpoint)
app.get('/api/admin/stats', (req, res) => {
  const applications = loadJSON(farmApplicationsFile, []);
  const newsletter = loadJSON(newsletterFile, []);
  const waitlist = loadJSON(waitlistFile, []);

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
  });
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
  console.log(`📊 Serving ${produceData.categories.length} categories and ${farmsData.farms.length} farms`);
});
