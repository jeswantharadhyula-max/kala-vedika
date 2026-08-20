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
  console.warn('⚠️  WARNING: SESSION_SECRET is not set in .env. Using insecure default. Set a strong secret before deploying!');
}
app.use(session({
  secret: SESSION_SECRET || 'kalavedika_secret_2026_CHANGE_ME',
  resave: false,
  saveUninitialized: false,
  // Persist sessions in MongoDB so they survive server restarts (critical for Render free tier)
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60 // 24 hours in seconds
  }),
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,                          // Prevent JS from accessing cookie
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
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

// TEMPORARY ROUTE TO WIPE DATA
app.get('/api/wipe-data', async (req, res) => {
  try {
    await require('./models/Member').deleteMany({});
    await require('./models/Founder').deleteMany({});
    await require('./models/Achievement').deleteMany({});
    await require('./models/Event').deleteMany({});
    res.send('Successfully emptied Members, Founders, Achievements, and Events data! You can go back to the website now.');
  } catch (err) {
    res.status(500).send('Error wiping data: ' + err.message);
  }
});

// Serve SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Seed function
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

  // Seed members
  if (await Member.countDocuments() === 0) {
    await Member.insertMany([
      { name: 'Arjun Reddy', roll_no: 'B22CS001', department: 'Computer Science', section: 'A', gen: 'Gen 3', year: '2022', role: 'Secretary', bio: 'Passionate about classical dance and music.' },
      { name: 'Priya Sharma', roll_no: 'B22EC015', department: 'Electronics', section: 'B', gen: 'Gen 3', year: '2022', role: 'Cultural Head', bio: 'Classical Bharatanatyam dancer with 10 years experience.' },
      { name: 'Rohit Kumar', roll_no: 'B23ME042', department: 'Mechanical', section: 'A', gen: 'Gen 4', year: '2023', role: 'Member', bio: 'Enthusiastic about folk arts and drama.' },
    ]);
    console.log('Sample members seeded');
  }

  // Seed founders
  if (await Founder.countDocuments() === 0) {
    await Founder.insertMany([
      { name: 'Dr. Venkata Rao', designation: 'Chief Patron', department: 'Principal', bio: 'Visionary leader who inspired the formation of Kala Vedika.', year: '2010', display_order: 1 },
      { name: 'Prof. Madhavi Devi', designation: 'Founding Director', department: 'Cultural Studies', bio: 'Dedicated her life to promoting classical arts among youth.', year: '2010', display_order: 2 },
      { name: 'Sri. Ramesh Babu', designation: 'Co-Founder', department: 'Alumni', bio: 'Alumni who provided initial funding for Kala Vedika.', year: '2010', display_order: 3 },
    ]);
    console.log('Sample founders seeded');
  }

  // Seed achievements
  if (await Achievement.countDocuments() === 0) {
    await Achievement.insertMany([
      { title: 'State Level Kuchipudi Championship', description: 'Won 1st place at the State Level Kuchipudi Dance Competition held in Hyderabad.', category: 'Dance', date: '2024-03-15' },
      { title: 'National Cultural Fest Winner', description: 'Our drama team secured the top position at the National Level Cultural Festival.', category: 'Drama', date: '2024-01-20' },
      { title: 'Best Cultural Club Award', description: 'Recognized as the Best Cultural Club by the University for 3 consecutive years.', category: 'Award', date: '2023-12-10' },
    ]);
    console.log('Sample achievements seeded');
  }

  // Seed events
  if (await Event.countDocuments() === 0) {
    await Event.insertMany([
      { title: 'Annual Cultural Fest 2026', description: 'Grand annual celebration featuring dance, music, drama, and art competitions.', event_date: '2026-09-15', event_time: '09:00 AM', venue: 'College Auditorium', category: 'Cultural', status: 'upcoming' },
      { title: 'Classical Dance Workshop', description: 'Hands-on workshop on Bharatanatyam and Kuchipudi by renowned artists.', event_date: '2026-08-25', event_time: '10:00 AM', venue: 'Activity Hall', category: 'Workshop', status: 'upcoming' },
    ]);
    console.log('Sample events seeded');
  }
}

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('? Connected to MongoDB Atlas');
    await seedData();
    app.listen(PORT, () => {
      console.log(`\n?? KALA VEDIKA Server running at http://localhost:${PORT}\n`);
    });
  })
  .catch(err => {
    console.error('? MongoDB connection failed:', err.message);
    process.exit(1);
  });
