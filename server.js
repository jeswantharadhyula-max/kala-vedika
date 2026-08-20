require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Critical for Render/Cloud reverse proxies: trust first proxy so HTTPS cookies work properly
app.set('trust proxy', 1);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  console.warn('⚠️  WARNING: SESSION_SECRET is not set in .env. Using fallback secret.');
}

app.use(session({
  secret: SESSION_SECRET || 'kalavedika_secret_2026_CHANGE_ME',
  resave: false,
  saveUninitialized: false,
  proxy: true, // Tell express-session to trust the proxy
  // Persist sessions in MongoDB so they survive server restarts (critical for Render free tier)
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60 // 24 hours in seconds
  }),
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,                          // Prevent JS from accessing cookie
    secure: 'auto',                          // Automatically true on HTTPS (Render), false on HTTP (localhost)
    sameSite: 'lax'                          // CSRF protection
  }
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/members', require('./routes/members'));
app.use('/api/founders', require('./routes/founders'));
app.use('/api/achievements', require('./routes/achievements'));
app.use('/api/events', require('./routes/events'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/contact', require('./routes/contact'));

// Serve SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Seed admin users & clean all default sample data
async function seedData() {
  const Admin = require('./models/Admin');
  const Member = require('./models/Member');
  const Founder = require('./models/Founder');
  const Achievement = require('./models/Achievement');
  const Event = require('./models/Event');

  // Seed admins
  const admins = ['admin1@kits', 'admin2@kits', 'admin3@kits'];
  for (const email of admins) {
    const exists = await Admin.findOne({ email });
    if (!exists) {
      const hashed = bcrypt.hashSync('KV@kits', 10);
      await Admin.create({ email, password: hashed });
      console.log(`Admin created: ${email}`);
    }
  }

  // Clear default sample data so all sections are completely clean and empty as requested
  await Member.deleteMany({});
  await Founder.deleteMany({});
  await Achievement.deleteMany({});
  await Event.deleteMany({});
  console.log('All default members, founders, achievements, and events wiped. Ready for admin to add/manage.');
}

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB Atlas');
    await seedData();
    app.listen(PORT, () => {
      console.log(`\nKALA VEDIKA Server running at http://localhost:${PORT}\n`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });

