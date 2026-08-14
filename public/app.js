/* =====================================================
   KALA VEDIKA – Main Application Logic
   ===================================================== */

let state = {
  founders: [],
  members: [],
  achievements: [],
  events: [],
  feedback: [],
  contact: {},
  isAdmin: false,
  adminEmail: null
};

// Elements
const navbar = document.getElementById('navbar');
const navLinks = document.getElementById('navLinks');
const hamburger = document.getElementById('hamburger');
const adminBtn = document.getElementById('adminBtn');
const adminModal = document.getElementById('adminModal');
const dashboardModal = document.getElementById('dashboardModal');
const itemModal = document.getElementById('itemModal');
const toastEl = document.getElementById('toast');

// API Base
const API = '/api';

/* --- INIT --- */
document.addEventListener('DOMContentLoaded', async () => {
  setupScrollEffects();
  setupIntersectionObservers();
  await checkAuthStatus();
  
  await Promise.all([
    fetchFounders(),
    fetchMembers(),
    fetchAchievements(),
    fetchEvents(),
    fetchContact()
  ]);
  
  updateStats();
  checkTodayEvent();
});

/* --- SCROLL & NAV --- */
function setupScrollEffects() {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    
    // Highlight nav links
    const sections = document.querySelectorAll('section');
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      if (window.scrollY >= sectionTop - 100) {
        current = section.getAttribute('id');
      }
    });
    
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('data-section') === current) {
        link.classList.add('active');
      }
    });
  });
}

function toggleMenu() {
  navLinks.classList.toggle('open');
}

function scrollTo(selector) {
  const el = document.querySelector(selector);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
    navLinks.classList.remove('open');
  }
}

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    scrollTo(link.getAttribute('href'));
  });
});

/* --- ANIMATIONS --- */
function setupIntersectionObservers() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.about-grid, .contact-grid, .section-header').forEach(el => {
    el.classList.add('reveal');
  });

  document.querySelectorAll('.reveal').forEach(el => {
    observer.observe(el);
  });
}

/* --- API CALLS --- */
async function fetchFounders() {
  try {
    const res = await fetch(`${API}/founders`);
    state.founders = await res.json();
    renderFounders(state.founders);
  } catch (err) {
    console.error('Error fetching founders:', err);
  }
}

async function fetchMembers() {
  try {
    const res = await fetch(`${API}/members`);
    state.members = await res.json();
    filterMembers('all'); // Renders all initially
  } catch (err) {
    console.error('Error fetching members:', err);
  }
}

async function fetchAchievements() {
  try {
    const res = await fetch(`${API}/achievements`);
    state.achievements = await res.json();
    filterAchievements('all');
  } catch (err) {
    console.error('Error fetching achievements:', err);
  }
}

async function fetchEvents() {
  try {
    const res = await fetch(`${API}/events`);
    state.events = await res.json();
    renderCalendar();
  } catch (err) {
    console.error('Error fetching events:', err);
  }
}

async function fetchContact() {
  try {
    const res = await fetch(`${API}/contact`);
    state.contact = await res.json();
    renderContact();
  } catch (err) {
    console.error('Error fetching contact:', err);
  }
}

function renderContact() {
  const loc = document.getElementById('contact-location-display');
  const email = document.getElementById('contact-email-display');
  const phone = document.getElementById('contact-phone-display');
  const hours = document.getElementById('contact-hours-display');
  
  if (loc && state.contact.location) loc.innerHTML = state.contact.location.replace(/\n/g, '<br>');
  if (email && state.contact.email) email.innerHTML = state.contact.email.replace(/\n/g, '<br>');
  if (phone && state.contact.phone) phone.innerHTML = state.contact.phone.replace(/\n/g, '<br>');
  if (hours && state.contact.hours) hours.innerHTML = state.contact.hours.replace(/\n/g, '<br>');
}

async function fetchFeedback() {
  if (!state.isAdmin) return;
  try {
    const res = await fetch(`${API}/feedback`);
    state.feedback = await res.json();
  } catch (err) {
    console.error('Error fetching feedback:', err);
  }
}

/* --- RENDER FUNCTIONS --- */
function renderFounders(data) {
  const container = document.getElementById('foundersGrid');
  if (!data || data.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🎭</div><p>No founders listed yet.</p></div>`;
    return;
  }
  
  container.innerHTML = data.map(f => `
    <div class="founder-card reveal">
      <div class="founder-photo">
        ${f.photo ? `<img src="${f.photo}" alt="${f.name}" loading="lazy">` : `<div class="founder-photo-placeholder">👤</div>`}
        <div class="founder-order-badge">${f.display_order}</div>
      </div>
      <div class="founder-info">
        <h3 class="founder-name">${f.name}</h3>
        <div class="founder-designation">${f.designation}</div>
        ${f.department ? `<div class="founder-dept">${f.department}</div>` : ''}
        ${f.bio ? `<div class="founder-bio">${f.bio}</div>` : ''}
        ${f.year ? `<div class="founder-year">Since ${f.year}</div>` : ''}
      </div>
    </div>
  `).join('');
  
  // Re-observe newly added elements
  setupIntersectionObservers();
}

function filterMembers(roleFilter) {
  // Update buttons
  document.querySelectorAll('#membersFilter .filter-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('onclick').includes(`'${roleFilter}'`)) btn.classList.add('active');
  });

  let filtered = state.members;
  if (roleFilter !== 'all') {
    if (roleFilter === 'Event Coordinator') {
      filtered = state.members.filter(m => m.role.toLowerCase().includes('coordinator'));
    } else {
      filtered = state.members.filter(m => m.role === roleFilter);
    }
  }

  const container = document.getElementById('membersGrid');
  if (!filtered || filtered.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No members found in this category.</p></div>`;
    return;
  }

  container.innerHTML = filtered.map(m => `
    <div class="member-card reveal" onclick="showMemberDetails(${m.id})">
      <div class="member-avatar">
        ${m.photo ? `<img src="${m.photo}" alt="${m.name}" loading="lazy">` : `<span>${m.name.charAt(0)}</span>`}
      </div>
      <h3 class="member-name">${m.name}</h3>
      <div class="member-role">${m.role}</div>
      <div class="member-dept">${m.department}</div>
      <div class="member-section">Year ${m.year || '?'} • Sec ${m.section} • ${m.gen || 'Gen X'}</div>
    </div>
  `).join('');
  
  setupIntersectionObservers();
}

function showMemberDetails(id) {
  const member = state.members.find(m => m.id === id);
  if (!member) return;
  
  const content = document.getElementById('itemModalContent');
  content.innerHTML = `
    <div style="text-align: center;">
      <div class="member-avatar" style="width:100%; height:250px; border-radius:12px; font-size:5rem; margin:0 auto 1.5rem;">
        ${member.photo ? `<img src="${member.photo}" alt="${member.name}">` : `<span>${member.name.charAt(0)}</span>`}
      </div>
      <h2 style="font-family:'Cinzel', serif; color:var(--gold); font-size:1.5rem; margin-bottom:0.5rem;">${member.name}</h2>
      <div style="color:var(--text-muted); font-weight:600; letter-spacing:0.1em; text-transform:uppercase; font-size:0.8rem; margin-bottom:1rem;">${member.role}</div>
      <div style="display:inline-block; border:1px solid rgba(212,168,67,0.3); padding:0.3rem 1rem; border-radius:50px; font-size:0.8rem; margin-bottom:1.5rem;">Year ${member.year || '?'} • ${member.department} • Sec ${member.section} • ${member.roll_no || 'N/A'} • ${member.gen || 'Gen X'}</div>
      ${member.bio ? `<p style="color:var(--text-muted); font-size:0.95rem; line-height:1.6; text-align:left; background:var(--surface); padding:1.5rem; border-radius:var(--radius-sm); border:1px solid var(--border);">${member.bio}</p>` : ''}
    </div>
  `;
  itemModal.classList.add('open');
}

function filterAchievements(category) {
  document.querySelectorAll('.achievements-filter .filter-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('onclick').includes(`'${category}'`)) btn.classList.add('active');
  });

  let filtered = state.achievements;
  if (category !== 'all') {
    filtered = state.achievements.filter(a => a.category === category);
  }

  const container = document.getElementById('achievementsGrid');
  if (!filtered || filtered.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No achievements found.</p></div>`;
    return;
  }

  container.innerHTML = filtered.map(a => `
    <div class="achievement-card reveal">
      ${a.photo ? `<img src="${a.photo}" style="width:100%; height:160px; object-fit:cover; border-radius:8px; margin-bottom:1rem;">` : `<div class="achievement-icon">🏆</div>`}
      <div class="achievement-category">${a.category}</div>
      <h3 class="achievement-title">${a.title}</h3>
      <p class="achievement-desc">${a.description}</p>
      ${a.date ? `<div class="achievement-date">${formatDate(a.date)}</div>` : ''}
    </div>
  `).join('');
  
  setupIntersectionObservers();
}

let currentDate = new Date();

function renderCalendar() {
  const container = document.getElementById('calendarGrid');
  const monthYearStr = document.getElementById('calendarMonthYear');
  
  if (!container || !monthYearStr) return;
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  monthYearStr.innerText = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  
  let html = '';
  
  // Empty slots for first week
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="calendar-day empty"></div>`;
  }
  
  const today = new Date();
  
  // Days
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
    const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    
    // Find events for this day
    const dayEvents = state.events.filter(e => e.event_date === cellDateStr);
    
    html += `
      <div class="calendar-day ${isToday ? 'today' : ''}" onclick="handleCalendarClick('${cellDateStr}')">
        <div class="calendar-day-num">${d}</div>
        ${dayEvents.map(e => `<div class="event-badge" onclick="event.stopPropagation(); showEventDetails(${e.id})">${e.title}</div>`).join('')}
      </div>
    `;
  }
  
  container.innerHTML = html;
}

function prevMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
}
function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
}

function handleCalendarClick(dateStr) {
  if (state.isAdmin) {
    openCreateModal('events', dateStr);
  }
}

function showEventDetails(id) {
  const e = state.events.find(ev => ev.id === id);
  if (!e) return;
  
  const content = document.getElementById('itemModalContent');
  content.innerHTML = `
    <div style="text-align: center;">
      ${e.photo ? `<img src="${e.photo}" style="width:100%; max-height:250px; object-fit:cover; border-radius:8px; margin-bottom:1.5rem;">` : ''}
      <div class="event-category-tag" style="display:inline-block; margin-bottom:1rem; padding: 0.3rem 1rem; border-radius: 50px; background: rgba(212,168,67,0.1); border: 1px solid var(--gold); color: var(--gold); font-weight: bold; font-size: 0.8rem; text-transform: uppercase;">${e.category}</div>
      <h2 style="font-family:'Cinzel', serif; color:var(--text); font-size:1.8rem; margin-bottom:0.5rem;">${e.title}</h2>
      <div style="display:inline-block; border:1px solid rgba(255,255,255,0.1); background: var(--surface2); padding:0.5rem 1rem; border-radius:8px; font-size:0.9rem; margin-bottom:1.5rem; color: var(--gold-light);">
        <span>📅 ${formatDate(e.event_date)}</span> | <span>🕐 ${e.event_time}</span> | <span>📍 ${e.venue}</span>
      </div>
      <p style="color:var(--text-muted); font-size:1rem; line-height:1.6; text-align:left; background:var(--surface); padding:1.5rem; border-radius:var(--radius-sm); border:1px solid var(--border);">${e.description}</p>
    </div>
  `;
  itemModal.classList.add('open');
}

function checkTodayEvent() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const d = today.getDate();
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  
  const todayEvents = state.events.filter(e => e.event_date === dateStr);
  
  if (todayEvents.length > 0) {
    const e = todayEvents[0];
    const content = document.getElementById('todayEventContent');
    content.innerHTML = `
      ${e.photo ? `<img src="${e.photo}" style="width:100%; max-height:250px; object-fit:cover; border-radius:8px; margin-bottom:1.5rem;">` : ''}
      <h2 style="font-family:'Cinzel', serif; color:var(--text); font-size:1.8rem; margin-bottom:0.5rem;">${e.title}</h2>
      <div style="display:inline-block; border:1px solid var(--border); background: var(--surface2); padding:0.5rem 1rem; border-radius:8px; font-size:0.9rem; margin-bottom:1.5rem; color: var(--gold);">
        <span>🕐 ${e.event_time || 'All Day'}</span> | <span>📍 ${e.venue || 'TBA'}</span>
      </div>
      <p style="color:var(--text-muted); font-size:1rem; line-height:1.6; background:var(--surface); padding:1rem; border-radius:var(--radius-sm); border:1px solid var(--border);">${e.description}</p>
      <button class="btn-primary" style="margin-top: 1.5rem;" onclick="closeTodayEvent()">Awesome!</button>
    `;
    setTimeout(() => {
      document.getElementById('todayEventModal').classList.add('open');
    }, 1500);
  }
}

function closeTodayEvent(e) {
  const modal = document.getElementById('todayEventModal');
  if (e && e.target !== modal) return;
  modal.classList.remove('open');
}

// Live Clock setup
function updateLiveClock() {
  const clockEl = document.getElementById('liveClock');
  const dateEl = document.getElementById('liveDate');
  if (!clockEl || !dateEl) return;
  
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  const dateString = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  clockEl.innerText = timeString;
  dateEl.innerText = dateString;
}
setInterval(updateLiveClock, 1000);
updateLiveClock();

function updateStats() {
  document.getElementById('statMembers').innerText = state.members.length;
  document.getElementById('statAchievements').innerText = state.achievements.length;
  document.getElementById('statEvents').innerText = state.events.length;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/* --- ADMIN AUTH --- */
async function checkAuthStatus() {
  try {
    const res = await fetch(`${API}/auth/me`);
    const data = await res.json();
    state.isAdmin = data.loggedIn;
    if (state.isAdmin) {
      state.adminEmail = data.email;
      adminBtn.innerText = 'Dashboard';
    } else {
      adminBtn.innerText = 'Admin Login';
    }
  } catch (err) {
    console.error('Auth check failed', err);
  }
}

function openAdminModal() {
  if (state.isAdmin) {
    openDashboard();
  } else {
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginError').innerText = '';
    adminModal.classList.add('open');
  }
}

function closeAdminModal(e) {
  if (e && e.target !== adminModal) return;
  adminModal.classList.remove('open');
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');
  
  btn.innerText = 'Logging in...';
  btn.disabled = true;
  errorEl.innerText = '';
  
  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    
    if (res.ok && data.success) {
      state.isAdmin = true;
      state.adminEmail = data.email;
      adminBtn.innerText = 'Dashboard';
      showToast('Logged in successfully', 'success');
      closeAdminModal();
      openDashboard();
    } else {
      errorEl.innerText = data.error || 'Login failed';
    }
  } catch (err) {
    errorEl.innerText = 'Network error. Try again.';
  } finally {
    btn.innerText = 'Login';
    btn.disabled = false;
  }
}

async function handleLogout() {
  try {
    await fetch(`${API}/auth/logout`, { method: 'POST' });
    state.isAdmin = false;
    state.adminEmail = null;
    adminBtn.innerText = 'Admin Login';
    closeDashboard();
    showToast('Logged out successfully', 'success');
  } catch (err) {
    console.error('Logout failed', err);
  }
}

/* --- ADMIN DASHBOARD --- */
let currentAdminTab = 'members';

function openDashboard() {
  if (!state.isAdmin) return;
  document.getElementById('adminEmailDisplay').innerText = state.adminEmail;
  dashboardModal.classList.add('open');
  switchTab(currentAdminTab);
}

function closeDashboard(e) {
  if (e && e.target !== dashboardModal) return;
  dashboardModal.classList.remove('open');
}

function switchTab(tab) {
  currentAdminTab = tab;
  document.querySelectorAll('.dashboard-tabs .tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('onclick').includes(`'${tab}'`)) btn.classList.add('active');
  });
  renderDashboardContent();
}

function renderDashboardContent() {
  const content = document.getElementById('dashboardContent');
  
  let headerHtml = `
    <div class="admin-section-header">
      <h3>Manage ${currentAdminTab.charAt(0).toUpperCase() + currentAdminTab.slice(1)}</h3>
      ${currentAdminTab !== 'feedback' ? `<button class="btn-success" onclick="openCreateModal('${currentAdminTab}')">+ Add New</button>` : ''}
    </div>
  `;
  
  let tableHtml = '';
  
  if (currentAdminTab === 'members') {
    tableHtml = `
      <table class="admin-table">
        <thead><tr><th>Name</th><th>Dept</th><th>Role</th><th>Actions</th></tr></thead>
        <tbody>
          ${state.members.map(m => `
            <tr>
              <td><strong>${m.name}</strong></td>
              <td>${m.department} (${m.section})</td>
              <td>${m.role}</td>
              <td class="actions">
                <button class="btn-icon btn-del" onclick="deleteItem('members', ${m.id})">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else if (currentAdminTab === 'founders') {
    tableHtml = `
      <table class="admin-table">
        <thead><tr><th>Order</th><th>Name</th><th>Designation</th><th>Actions</th></tr></thead>
        <tbody>
          ${state.founders.map(f => `
            <tr>
              <td>${f.display_order}</td>
              <td><strong>${f.name}</strong></td>
              <td>${f.designation}</td>
              <td class="actions">
                <button class="btn-icon btn-del" onclick="deleteItem('founders', ${f.id})">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else if (currentAdminTab === 'achievements') {
    tableHtml = `
      <table class="admin-table">
        <thead><tr><th>Title</th><th>Category</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody>
          ${state.achievements.map(a => `
            <tr>
              <td><strong>${a.title}</strong></td>
              <td>${a.category}</td>
              <td>${a.date}</td>
              <td class="actions">
                <button class="btn-icon btn-del" onclick="deleteItem('achievements', ${a.id})">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else if (currentAdminTab === 'events') {
    tableHtml = `
      <table class="admin-table">
        <thead><tr><th>Title</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          ${state.events.map(e => `
            <tr>
              <td><strong>${e.title}</strong></td>
              <td>${e.event_date}</td>
              <td><span class="event-status ${e.status}">${e.status}</span></td>
              <td class="actions">
                <button class="btn-icon btn-del" onclick="deleteItem('events', ${e.id})">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else if (currentAdminTab === 'feedback') {
    tableHtml = `
      <div style="display:flex; flex-direction:column; gap:1rem;">
        ${state.feedback.length === 0 ? '<p>No feedback received yet.</p>' : ''}
        ${state.feedback.map(f => `
          <div style="background:var(--surface); padding:1rem; border-radius:var(--radius-sm); border:1px solid var(--border);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
              <div>
                <strong>${f.name}</strong> &lt;${f.email}&gt;
                <div style="font-size:0.8rem; color:var(--text-muted);">${formatDate(f.created_at)}</div>
              </div>
              <button class="btn-icon btn-del" onclick="deleteItem('feedback', ${f.id})">🗑️</button>
            </div>
            <p style="color:var(--text-light);">${f.message}</p>
          </div>
        `).join('')}
      </div>
    `;
  } else if (currentAdminTab === 'contact') {
    headerHtml = `<div class="admin-section-header"><h3>Update Contact Information</h3></div>`;
    tableHtml = `
      <div style="background:var(--surface); padding:2rem; border-radius:var(--radius-md); border:1px solid var(--border);">
        <form onsubmit="updateContactInfo(event)" style="display:flex; flex-direction:column; gap:1.5rem;">
          <div class="form-group">
            <label>Location</label>
            <textarea id="adminContactLocation" rows="3" required>${state.contact.location || ''}</textarea>
          </div>
          <div class="form-group">
            <label>Email</label>
            <textarea id="adminContactEmail" rows="3" required>${state.contact.email || ''}</textarea>
          </div>
          <div class="form-group">
            <label>Phone</label>
            <textarea id="adminContactPhone" rows="3" required>${state.contact.phone || ''}</textarea>
          </div>
          <div class="form-group">
            <label>Club Hours</label>
            <textarea id="adminContactHours" rows="3" required>${state.contact.hours || ''}</textarea>
          </div>
          <button type="submit" class="btn-success" style="align-self:flex-start;">Save Contact Info</button>
        </form>
      </div>
    `;
  }
  
  content.innerHTML = headerHtml + tableHtml;
}

/* --- CRUD OPERATIONS --- */
async function updateContactInfo(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.innerText;
  btn.innerText = 'Saving...';
  btn.disabled = true;

  const data = {
    location: document.getElementById('adminContactLocation').value,
    email: document.getElementById('adminContactEmail').value,
    phone: document.getElementById('adminContactPhone').value,
    hours: document.getElementById('adminContactHours').value
  };

  try {
    const res = await fetch(`${API}/contact`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (res.ok) {
      showToast('Contact info updated successfully', 'success');
      await fetchContact(); // Refresh state and UI
    } else {
      showToast('Failed to update contact info', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  } finally {
    btn.innerText = originalText;
    btn.disabled = false;
  }
}

async function deleteItem(type, id) {
  if (!confirm(`Are you sure you want to delete this item?`)) return;
  
  try {
    const res = await fetch(`${API}/${type}/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Item deleted successfully', 'success');
      // Refresh data
      if (type === 'members') { await fetchMembers(); updateStats(); }
      if (type === 'founders') await fetchFounders();
      if (type === 'achievements') { await fetchAchievements(); updateStats(); }
      if (type === 'events') { await fetchEvents(); updateStats(); }
      if (type === 'feedback') await fetchFeedback();
      
      if (dashboardModal.classList.contains('open')) renderDashboardContent();
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to delete', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  }
}

function openCreateModal(type, prefillDate = '') {
  const content = document.getElementById('itemModalContent');
  let formHtml = '';
  
  if (type === 'members') {
    let genOptions = '';
    for(let i=1; i<=100; i++) genOptions += `<option value="Gen ${i}">Gen ${i}</option>`;
    
    let yearOptions = '';
    for(let i=1; i<=4; i++) yearOptions += `<option value="${i}">Year ${i}</option>`;
    
    formHtml = `
      <h2 class="item-modal-title">Add New Member</h2>
      <form onsubmit="handleFormSubmit(event, 'members')">
        <div class="form-group"><label>Name</label><input type="text" name="name" required></div>
        <div class="form-group"><label>Roll No</label><input type="text" name="roll_no" required></div>
        <div class="form-group"><label>Department</label><input type="text" name="department" required></div>
        <div class="form-group"><label>Section</label><input type="text" name="section" required></div>
        <div class="form-group"><label>Year</label><select name="year">${yearOptions}</select></div>
        <div class="form-group"><label>Generation</label><select name="gen">${genOptions}</select></div>
        <div class="form-group"><label>Role</label><input type="text" name="role" value="Member"></div>
        <div class="form-group"><label>Bio</label><textarea name="bio"></textarea></div>
        <div class="form-group"><label>Photo</label><input type="file" name="photo" accept="image/*"></div>
        <button type="submit" class="btn-primary btn-full">Save Member</button>
      </form>
    `;
  } else if (type === 'events') {
    formHtml = `
      <h2 class="item-modal-title">Add New Event</h2>
      <form onsubmit="handleFormSubmit(event, 'events')">
        <div class="form-group"><label>Title</label><input type="text" name="title" required></div>
        <div class="form-group"><label>Date (YYYY-MM-DD)</label><input type="date" name="event_date" value="${prefillDate}" required></div>
        <div class="form-group"><label>Time (e.g. 10:00 AM)</label><input type="text" name="event_time"></div>
        <div class="form-group"><label>Venue</label><input type="text" name="venue" required></div>
        <div class="form-group"><label>Category</label><input type="text" name="category" value="Cultural"></div>
        <div class="form-group"><label>Status</label>
          <select name="status">
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div class="form-group"><label>Description</label><textarea name="description" required></textarea></div>
        <div class="form-group"><label>Photo</label><input type="file" name="photo" accept="image/*"></div>
        <button type="submit" class="btn-primary btn-full">Save Event</button>
      </form>
    `;
  } else if (type === 'achievements') {
    formHtml = `
      <h2 class="item-modal-title">Add New Achievement</h2>
      <form onsubmit="handleFormSubmit(event, 'achievements')">
        <div class="form-group"><label>Title</label><input type="text" name="title" required></div>
        <div class="form-group"><label>Category</label><input type="text" name="category" value="General"></div>
        <div class="form-group"><label>Date (YYYY-MM-DD)</label><input type="date" name="date"></div>
        <div class="form-group"><label>Description</label><textarea name="description" required></textarea></div>
        <div class="form-group"><label>Photo</label><input type="file" name="photo" accept="image/*"></div>
        <button type="submit" class="btn-primary btn-full">Save Achievement</button>
      </form>
    `;
  } else if (type === 'founders') {
    formHtml = `
      <h2 class="item-modal-title">Add New Founder</h2>
      <form onsubmit="handleFormSubmit(event, 'founders')">
        <div class="form-group"><label>Name</label><input type="text" name="name" required></div>
        <div class="form-group"><label>Designation</label><input type="text" name="designation" required></div>
        <div class="form-group"><label>Department</label><input type="text" name="department"></div>
        <div class="form-group"><label>Year</label><input type="text" name="year" value="2025"></div>
        <div class="form-group"><label>Display Order</label><input type="number" name="display_order" value="0"></div>
        <div class="form-group"><label>Bio</label><textarea name="bio"></textarea></div>
        <div class="form-group"><label>Photo</label><input type="file" name="photo" accept="image/*"></div>
        <button type="submit" class="btn-primary btn-full">Save Founder</button>
      </form>
    `;
  }
  
  content.innerHTML = formHtml;
  itemModal.classList.add('open');
}

async function handleFormSubmit(e, type) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  btn.innerText = 'Saving...';
  btn.disabled = true;
  
  const formData = new FormData(form);
  
  try {
    const res = await fetch(`${API}/${type}`, {
      method: 'POST',
      body: formData
    });
    
    if (res.ok) {
      showToast('Successfully added', 'success');
      closeItemModal();
      
      // Refresh data
      if (type === 'members') { await fetchMembers(); updateStats(); }
      if (type === 'founders') await fetchFounders();
      if (type === 'achievements') { await fetchAchievements(); updateStats(); }
      if (type === 'events') { await fetchEvents(); updateStats(); }
      
      if (dashboardModal.classList.contains('open')) renderDashboardContent();
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to save', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  } finally {
    btn.innerText = 'Save';
    btn.disabled = false;
  }
}

function closeItemModal(e) {
  if (e && e.target !== itemModal) return;
  itemModal.classList.remove('open');
}

/* --- TOAST --- */
function showToast(message, type = 'success') {
  toastEl.innerText = message;
  toastEl.className = `toast show ${type}`;
  setTimeout(() => {
    toastEl.className = 'toast';
  }, 3000);
}

async function submitFeedbackForm(e) {
  e.preventDefault();
  const btn = document.getElementById('fbSubmitBtn');
  btn.innerText = 'Sending...';
  btn.disabled = true;
  
  const payload = {
    name: document.getElementById('fbName').value,
    email: document.getElementById('fbEmail').value,
    message: document.getElementById('fbMessage').value
  };
  
  try {
    const res = await fetch(`${API}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      showToast('Feedback sent successfully!', 'success');
      document.getElementById('fbName').value = '';
      document.getElementById('fbEmail').value = '';
      document.getElementById('fbMessage').value = '';
    } else {
      showToast('Failed to send feedback', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  } finally {
    btn.innerText = 'Send Feedback';
    btn.disabled = false;
  }
}

let isMusicPlaying = false;
function toggleMusic() {
  const bgMusic = document.getElementById('bgMusic');
  const musicBtn = document.getElementById('musicBtn');
  if (isMusicPlaying) {
    bgMusic.pause();
    isMusicPlaying = false;
    musicBtn.innerText = '🎵';
  } else {
    bgMusic.play();
    isMusicPlaying = true;
    musicBtn.innerText = '⏸️';
  }
}
