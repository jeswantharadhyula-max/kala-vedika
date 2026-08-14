const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

let db = {
  admin: [],
  members: [],
  founders: [],
  achievements: [],
  events: [],
  feedback: [],
  contact: {}
};

// Load existing DB
if (fs.existsSync(DB_PATH)) {
  try {
    const loadedData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    db = { ...db, ...loadedData };
    // Ensure all keys exist
    Object.keys(db).forEach(key => {
      if (!db[key]) db[key] = [];
    });
  } catch (e) {
    console.error('Error reading db.json, starting fresh');
  }
}

function saveDb() {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// Seed admins
const adminPassword = 'KV@kits';
const adminsToSeed = ['admin1@kits', 'admin2@kits', 'admin3@kits'];
let adminChanged = false;

adminsToSeed.forEach((email, index) => {
  if (!db.admin.find(a => a.email === email)) {
    const hashed = bcrypt.hashSync(adminPassword, 10);
    // Use an id starting from 1
    const id = db.admin.length > 0 ? Math.max(...db.admin.map(a => a.id)) + 1 : index + 1;
    db.admin.push({ id, email, password: hashed });
    console.log(`✅ Admin created: ${email} / KV@kits`);
    adminChanged = true;
  }
});

if (adminChanged) saveDb();

// Seed sample data
if (db.members.length === 0) {
  let id = 1;
  const membersData = [
    { name: 'Arjun Reddy', roll_no: 'B22CS001', department: 'Computer Science', section: 'A', gen: 'Gen 3', role: 'Secretary', bio: 'Passionate about classical dance and music.' },
    { name: 'Priya Sharma', roll_no: 'B22EC015', department: 'Electronics', section: 'B', gen: 'Gen 3', role: 'Cultural Head', bio: 'Classical Bharatanatyam dancer with 10 years experience.' },
    { name: 'Rohit Kumar', roll_no: 'B23ME042', department: 'Mechanical', section: 'A', gen: 'Gen 4', role: 'Member', bio: 'Enthusiastic about folk arts and drama.' },
    { name: 'Sneha Patel', roll_no: 'B23CE011', department: 'Civil', section: 'C', gen: 'Gen 4', role: 'Member', bio: 'Singer and classical music enthusiast.' },
    { name: 'Karthik Nair', roll_no: 'B21IT023', department: 'IT', section: 'B', gen: 'Gen 2', role: 'Event Coordinator', bio: 'Organizes cultural events and workshops.' },
    { name: 'Divya Lakshmi', roll_no: 'B24CS101', department: 'CSE', section: 'A', gen: 'Gen 5', role: 'Member', bio: 'Passionate about classical literature and poetry.' }
  ];
  membersData.forEach(m => db.members.push({ id: id++, ...m, photo: null, created_at: new Date().toISOString() }));
  saveDb();
}

if (db.founders.length === 0) {
  let id = 1;
  const foundersData = [
    { name: 'Dr. Venkata Rao', designation: 'Chief Patron', department: 'Principal', bio: 'Visionary leader who inspired the formation of Kala Vedika to nurture cultural talents.', year: '2010', display_order: 1 },
    { name: 'Prof. Madhavi Devi', designation: 'Founding Director', department: 'Cultural Studies', bio: 'Dedicated her life to promoting classical arts and indigenous culture among youth.', year: '2010', display_order: 2 },
    { name: 'Sri. Ramesh Babu', designation: 'Co-Founder', department: 'Alumni', bio: 'Alumni who provided initial funding and guidance for establishing Kala Vedika.', year: '2010', display_order: 3 }
  ];
  foundersData.forEach(f => db.founders.push({ id: id++, ...f, photo: null, created_at: new Date().toISOString() }));
  saveDb();
}

if (db.achievements.length === 0) {
  let id = 1;
  const achievementsData = [
    { title: 'State Level Kuchipudi Championship', description: 'Won 1st place at the State Level Kuchipudi Dance Competition held in Hyderabad.', category: 'Dance', date: '2024-03-15' },
    { title: 'National Cultural Fest Winner', description: 'Our drama team secured the top position at the National Level Cultural Festival.', category: 'Drama', date: '2024-01-20' },
    { title: 'Best Cultural Club Award', description: 'Recognized as the Best Cultural Club by the University for 3 consecutive years.', category: 'Award', date: '2023-12-10' },
    { title: 'Music Olympiad Gold Medal', description: 'Secured gold medal in Classical Carnatic Music at the Andhra Pradesh Music Olympiad.', category: 'Music', date: '2023-08-05' }
  ];
  achievementsData.forEach(a => db.achievements.push({ id: id++, ...a, photo: null, created_at: new Date().toISOString() }));
  saveDb();
}

if (db.events.length === 0) {
  let id = 1;
  const eventsData = [
    { title: 'Annual Cultural Fest 2026', description: 'Grand annual celebration featuring dance, music, drama, and art competitions.', event_date: '2026-09-15', event_time: '09:00 AM', venue: 'College Auditorium', category: 'Cultural', status: 'upcoming' },
    { title: 'Classical Dance Workshop', description: 'Hands-on workshop on Bharatanatyam and Kuchipudi by renowned artists.', event_date: '2026-08-25', event_time: '10:00 AM', venue: 'Activity Hall', category: 'Workshop', status: 'upcoming' },
    { title: 'Freshers Welcome Ceremony', description: 'Cultural program to welcome new students to Kala Vedika.', event_date: '2026-09-01', event_time: '05:00 PM', venue: 'Open Air Theatre', category: 'Cultural', status: 'upcoming' },
    { title: 'Kala Vedika Foundation Day', description: 'Celebration of 16 years of Kala Vedika with performances and awards.', event_date: '2026-10-10', event_time: '06:00 PM', venue: 'Main Auditorium', category: 'Cultural', status: 'upcoming' }
  ];
  eventsData.forEach(e => db.events.push({ id: id++, ...e, photo: null, created_at: new Date().toISOString() }));
  saveDb();
}

if (Object.keys(db.contact).length === 0) {
  db.contact = {
    location: "KITS College Campus\nCultural Activities Block\nAndhra Pradesh, India",
    email: "kalavedika@kits.ac.in\ncultural@kits.ac.in",
    phone: "+91 98765 43210\n+91 87654 32109",
    hours: "Mon – Fri: 4 PM – 7 PM\nWeekends: 10 AM – 1 PM"
  };
  saveDb();
}

module.exports = {
  data: db,
  save: saveDb,
  getNextId: (table) => {
    if (!db[table] || db[table].length === 0) return 1;
    return Math.max(...db[table].map(item => item.id)) + 1;
  }
};
