/* =====================================================
   KALA VEDIKA – Main Application Logic
   ===================================================== */

/* --- SECURITY: HTML SANITIZER --- */
function sanitizeText(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

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

let currentMemberFilter = 'all';
let currentAchievementFilter = 'all';

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

/* --- AUTH HELPERS --- */
function getAuthHeaders(additionalHeaders = {}) {
  const token = localStorage.getItem('kv_admin_token');
  const headers = { ...additionalHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-admin-token'] = token;
  }
  return headers;
}

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

function scrollToSection(selector) {
  if (!selector) return;
  const targetId = selector.startsWith('#') ? selector.slice(1) : selector;
  const el = document.getElementById(targetId) || document.querySelector(selector);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (navLinks) navLinks.classList.remove('open');
  }
}
window.scrollToSection = scrollToSection;

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    scrollToSection(link.getAttribute('href'));
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
    const res = await fetch(`${API}/founders?_t=${Date.now()}`, { credentials: 'include' });
    state.founders = await res.json();
    renderFounders(state.founders);
    updateStats();
  } catch (err) {
    console.error('Error fetching founders:', err);
  }
}

async function fetchMembers() {
  try {
    const res = await fetch(`${API}/members?_t=${Date.now()}`, { credentials: 'include' });
    state.members = await res.json();
    filterMembers(currentMemberFilter);
  } catch (err) {
    console.error('Error fetching members:', err);
  }
}

async function fetchAchievements() {
  try {
    const res = await fetch(`${API}/achievements?_t=${Date.now()}`, { credentials: 'include' });
    state.achievements = await res.json();
    filterAchievements(currentAchievementFilter);
  } catch (err) {
    console.error('Error fetching achievements:', err);
  }
}

async function fetchEvents() {
  try {
    const res = await fetch(`${API}/events?_t=${Date.now()}`, { credentials: 'include' });
    state.events = await res.json();
    renderCalendar();
  } catch (err) {
    console.error('Error fetching events:', err);
  }
}

async function fetchContact() {
  try {
    const res = await fetch(`${API}/contact?_t=${Date.now()}`, { credentials: 'include' });
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
  
  if (loc && state.contact.location) loc.innerHTML = sanitizeText(state.contact.location).replace(/\n/g, '<br>');
  if (email && state.contact.email) email.innerHTML = sanitizeText(state.contact.email).replace(/\n/g, '<br>');
  if (phone && state.contact.phone) phone.innerHTML = sanitizeText(state.contact.phone).replace(/\n/g, '<br>');
  if (hours && state.contact.hours) hours.innerHTML = sanitizeText(state.contact.hours).replace(/\n/g, '<br>');
}

async function fetchFeedback() {
  if (!state.isAdmin) return;
  try {
    const res = await fetch(`${API}/feedback?_t=${Date.now()}`, {
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    state.feedback = await res.json();
  } catch (err) {
    console.error('Error fetching feedback:', err);
  }
}

function renderAllPublicSections() {
  renderFounders(state.founders);
  filterMembers(currentMemberFilter);
  filterAchievements(currentAchievementFilter);
  renderCalendar();
}

/* --- RENDER FUNCTIONS --- */
function renderFounders(data) {
  const container = document.getElementById('foundersGrid');
  if (!data || data.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🎭</div><p>No founders listed yet.</p></div>`;
    return;
  }
  
  container.innerHTML = data.map(f => `
    <div class="founder-card reveal" style="position:relative;">
      ${state.isAdmin ? `
        <button class="card-admin-del" onclick="event.stopPropagation(); deleteItem('founders', '${f._id}')" title="Delete Founder">🗑️</button>
      ` : ''}
      <div class="founder-photo">
        ${f.photo ? `<img src="${sanitizeText(f.photo)}" alt="${sanitizeText(f.name)}" loading="lazy">` : `<div class="founder-photo-placeholder">👤</div>`}
        <div class="founder-order-badge">${sanitizeText(String(f.display_order))}</div>
      </div>
      <div class="founder-info">
        <h3 class="founder-name">${sanitizeText(f.name)}</h3>
        <div class="founder-designation">${sanitizeText(f.designation)}</div>
        ${f.department ? `<div class="founder-dept">${sanitizeText(f.department)}</div>` : ''}
        ${f.bio ? `<div class="founder-bio">${sanitizeText(f.bio)}</div>` : ''}
        ${f.year ? `<div class="founder-year">Since ${sanitizeText(f.year)}</div>` : ''}
      </div>
    </div>
  `).join('');
  
  setupIntersectionObservers();
}

function filterMembers(roleFilter) {
  currentMemberFilter = roleFilter || 'all';
  
  document.querySelectorAll('#membersFilter .filter-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${currentMemberFilter}'`)) btn.classList.add('active');
  });

  let filtered = state.members;
  if (currentMemberFilter !== 'all') {
    if (currentMemberFilter === 'Event Coordinator') {
      filtered = state.members.filter(m => m.role && m.role.toLowerCase().includes('coordinator'));
    } else {
      filtered = state.members.filter(m => m.role === currentMemberFilter);
    }
  }

  const container = document.getElementById('membersGrid');
  if (!filtered || filtered.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No members found in this category.</p></div>`;
    return;
  }

  container.innerHTML = filtered.map(m => `
    <div class="member-card reveal" style="position:relative;" onclick="showMemberDetails('${m._id}')">
      ${state.isAdmin ? `
        <button class="card-admin-del" onclick="event.stopPropagation(); deleteItem('members', '${m._id}')" title="Delete Member">🗑️</button>
      ` : ''}
      <div class="member-avatar">
        ${m.photo ? `<img src="${sanitizeText(m.photo)}" alt="${sanitizeText(m.name)}" loading="lazy">` : `<span>${sanitizeText(m.name.charAt(0))}</span>`}
      </div>
      <h3 class="member-name">${sanitizeText(m.name)}</h3>
      <div class="member-role">${sanitizeText(m.role)}</div>
      <div class="member-dept">${sanitizeText(m.department)}</div>
      <div class="member-section">Year ${sanitizeText(String(m.year || '?'))} • Sec ${sanitizeText(m.section)} • ${sanitizeText(m.gen || 'Gen X')}</div>
    </div>
  `).join('');
  
  setupIntersectionObservers();
}

function showMemberDetails(id) {
  const member = state.members.find(m => String(m._id) === String(id));
  if (!member) return;
  
  const content = document.getElementById('itemModalContent');
  content.innerHTML = `
    <div style="text-align: center;">
      <div class="member-avatar" style="width:100%; height:250px; border-radius:12px; font-size:5rem; margin:0 auto 1.5rem;">
        ${member.photo ? `<img src="${sanitizeText(member.photo)}" alt="${sanitizeText(member.name)}">` : `<span>${sanitizeText(member.name.charAt(0))}</span>`}
      </div>
      <h2 style="font-family:'Cinzel', serif; color:var(--gold); font-size:1.5rem; margin-bottom:0.5rem;">${sanitizeText(member.name)}</h2>
      <div style="color:var(--text-muted); font-weight:600; letter-spacing:0.1em; text-transform:uppercase; font-size:0.8rem; margin-bottom:1rem;">${sanitizeText(member.role)}</div>
      <div style="display:inline-block; border:1px solid rgba(212,168,67,0.3); padding:0.3rem 1rem; border-radius:50px; font-size:0.8rem; margin-bottom:1.5rem;">Year ${sanitizeText(String(member.year || '?'))} • ${sanitizeText(member.department)} • Sec ${sanitizeText(member.section)} • ${sanitizeText(member.roll_no || 'N/A')} • ${sanitizeText(member.gen || 'Gen X')}</div>
      ${member.bio ? `<p style="color:var(--text-muted); font-size:0.95rem; line-height:1.6; text-align:left; background:var(--surface); padding:1.5rem; border-radius:var(--radius-sm); border:1px solid var(--border);">${sanitizeText(member.bio)}</p>` : ''}
      ${state.isAdmin ? `
        <button class="btn-danger" style="margin-top:1.5rem; width:100%; display:flex; align-items:center; justify-content:center; gap:0.5rem; padding:0.75rem 1rem; font-size:0.9rem;" onclick="deleteItem('members', '${member._id}')">
          🗑️ Delete Member
        </button>
      ` : ''}
    </div>
  `;
  itemModal.classList.add('open');
}

function filterAchievements(category) {
  currentAchievementFilter = category || 'all';
  
  document.querySelectorAll('.achievements-filter .filter-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${currentAchievementFilter}'`)) btn.classList.add('active');
  });

  let filtered = state.achievements;
  if (currentAchievementFilter !== 'all') {
    filtered = state.achievements.filter(a => a.category === currentAchievementFilter);
  }

  const container = document.getElementById('achievementsGrid');
  if (!filtered || filtered.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No achievements found.</p></div>`;
    return;
  }

  container.innerHTML = filtered.map(a => `
    <div class="achievement-card reveal" style="position:relative;">
      ${state.isAdmin ? `
        <button class="card-admin-del" onclick="event.stopPropagation(); deleteItem('achievements', '${a._id}')" title="Delete Achievement">🗑️</button>
      ` : ''}
      ${a.photo ? `<img src="${sanitizeText(a.photo)}" style="width:100%; height:160px; object-fit:cover; border-radius:8px; margin-bottom:1rem;">` : `<div class="achievement-icon">🏆</div>`}
      <div class="achievement-category">${sanitizeText(a.category)}</div>
      <h3 class="achievement-title">${sanitizeText(a.title)}</h3>
      <p class="achievement-desc">${sanitizeText(a.description)}</p>
      ${a.date ? `<div class="achievement-date">${sanitizeText(formatDate(a.date))}</div>` : ''}
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
  
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="calendar-day empty"></div>`;
  }
  
  const today = new Date();
  
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
    const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    
    const dayEvents = state.events.filter(e => e.event_date === cellDateStr);
    
    html += `
      <div class="calendar-day ${isToday ? 'today' : ''}" onclick="handleCalendarClick('${sanitizeText(cellDateStr)}')">
        <div class="calendar-day-num">${d}</div>
        ${dayEvents.map(e => `<div class="event-badge" onclick="event.stopPropagation(); showEventDetails('${e._id}')"> ${sanitizeText(e.title)}</div>`).join('')}
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
  const e = state.events.find(ev => String(ev._id) === String(id));
  if (!e) return;
  
  const content = document.getElementById('itemModalContent');
  content.innerHTML = `
    <div style="text-align: center;">
      ${e.photo ? `<img src="${sanitizeText(e.photo)}" style="width:100%; max-height:250px; object-fit:cover; border-radius:8px; margin-bottom:1.5rem;">` : ''}
      <div class="event-category-tag" style="display:inline-block; margin-bottom:1rem; padding: 0.3rem 1rem; border-radius: 50px; background: rgba(212,168,67,0.1); border: 1px solid var(--gold); color: var(--gold); font-weight: bold; font-size: 0.8rem; text-transform: uppercase;">${sanitizeText(e.category)}</div>
      <h2 style="font-family:'Cinzel', serif; color:var(--text); font-size:1.8rem; margin-bottom:0.5rem;">${sanitizeText(e.title)}</h2>
      <div style="display:inline-block; border:1px solid rgba(255,255,255,0.1); background: var(--surface2); padding:0.5rem 1rem; border-radius:8px; font-size:0.9rem; margin-bottom:1.5rem; color: var(--gold-light);">
        <span>📅 ${sanitizeText(formatDate(e.event_date))}</span> | <span>🕐 ${sanitizeText(e.event_time)}</span> | <span>📍 ${sanitizeText(e.venue)}</span>
      </div>
      <p style="color:var(--text-muted); font-size:1rem; line-height:1.6; text-align:left; background:var(--surface); padding:1.5rem; border-radius:var(--radius-sm); border:1px solid var(--border);">${sanitizeText(e.description)}</p>
      ${state.isAdmin ? `
        <button class="btn-danger" style="margin-top:1.5rem; width:100%; display:flex; align-items:center; justify-content:center; gap:0.5rem; padding:0.75rem 1rem; font-size:0.9rem;" onclick="deleteItem('events', '${e._id}')">
          🗑️ Delete Event
        </button>
      ` : ''}
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
      ${e.photo ? `<img src="${sanitizeText(e.photo)}" style="width:100%; max-height:250px; object-fit:cover; border-radius:8px; margin-bottom:1.5rem;">` : ''}
      <h2 style="font-family:'Cinzel', serif; color:var(--text); font-size:1.8rem; margin-bottom:0.5rem;">${sanitizeText(e.title)}</h2>
      <div style="display:inline-block; border:1px solid var(--border); background: var(--surface2); padding:0.5rem 1rem; border-radius:8px; font-size:0.9rem; margin-bottom:1.5rem; color: var(--gold);">
        <span>🕐 ${sanitizeText(e.event_time || 'All Day')}</span> | <span>📍 ${sanitizeText(e.venue || 'TBA')}</span>
      </div>
      <p style="color:var(--text-muted); font-size:1rem; line-height:1.6; background:var(--surface); padding:1rem; border-radius:var(--radius-sm); border:1px solid var(--border);">${sanitizeText(e.description)}</p>
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
  const memEl = document.getElementById('statMembers');
  const fndEl = document.getElementById('statFounders');
  const achEl = document.getElementById('statAchievements');
  const evEl = document.getElementById('statEvents');
  
  if (memEl) memEl.innerText = state.members ? state.members.length : 0;
  if (fndEl) fndEl.innerText = state.founders ? state.founders.length : 0;
  if (achEl) achEl.innerText = state.achievements ? state.achievements.length : 0;
  if (evEl) evEl.innerText = state.events ? state.events.length : 0;
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
    const res = await fetch(`${API}/auth/me?_t=${Date.now()}`, {
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    state.isAdmin = !!data.loggedIn;
    if (state.isAdmin) {
      state.adminEmail = data.email;
      adminBtn.innerText = 'Dashboard';
    } else {
      localStorage.removeItem('kv_admin_token');
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
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });
    
    const data = await res.json();
    
    if (res.ok && data.success) {
      if (data.token) {
        localStorage.setItem('kv_admin_token', data.token);
      }
      state.isAdmin = true;
      state.adminEmail = data.email;
      adminBtn.innerText = 'Dashboard';
      showToast('Logged in successfully', 'success');
      closeAdminModal();
      renderAllPublicSections();
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
    await fetch(`${API}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
  } catch (err) {
    console.error('Logout failed', err);
  }
  localStorage.removeItem('kv_admin_token');
  state.isAdmin = false;
  state.adminEmail = null;
  adminBtn.innerText = 'Admin Login';
  closeDashboard();
  renderAllPublicSections();
  showToast('Logged out successfully', 'success');
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
    if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${tab}'`)) btn.classList.add('active');
  });
  renderDashboardContent();
}

function renderDashboardContent() {
  const content = document.getElementById('dashboardContent');
  
  let headerHtml = `
    <div class="admin-section-header">
      <h3>Manage ${currentAdminTab.charAt(0).toUpperCase() + currentAdminTab.slice(1)}</h3>
      <div style="display:flex; gap:0.6rem; align-items:center;">
        ${currentAdminTab !== 'feedback' && currentAdminTab !== 'contact' ? `<button class="btn-success" onclick="openCreateModal('${currentAdminTab}')">+ Add New</button>` : ''}
        ${currentAdminTab !== 'contact' ? `<button class="btn-danger" onclick="clearAllItems('${currentAdminTab}')">🗑️ Clear All</button>` : ''}
      </div>
    </div>
  `;
  
  let tableHtml = '';
  
  if (currentAdminTab === 'members') {
    tableHtml = `
      <table class="admin-table">
        <thead><tr><th>Name</th><th>Dept</th><th>Role</th><th>Actions</th></tr></thead>
        <tbody>
          ${state.members.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--text-muted);">No members found.</td></tr>' : ''}
          ${state.members.map(m => `
            <tr>
              <td><strong>${sanitizeText(m.name)}</strong></td>
              <td>${sanitizeText(m.department)} (${sanitizeText(m.section)})</td>
              <td>${sanitizeText(m.role)}</td>
              <td class="actions">
                <button class="btn-icon btn-del" onclick="deleteItem('members', '${m._id}')" title="Delete">🗑️ Delete</button>
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
          ${state.founders.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--text-muted);">No founders found.</td></tr>' : ''}
          ${state.founders.map(f => `
            <tr>
              <td>${sanitizeText(String(f.display_order))}</td>
              <td><strong>${sanitizeText(f.name)}</strong></td>
              <td>${sanitizeText(f.designation)}</td>
              <td class="actions">
                <button class="btn-icon btn-del" onclick="deleteItem('founders', '${f._id}')" title="Delete">🗑️ Delete</button>
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
          ${state.achievements.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--text-muted);">No achievements found.</td></tr>' : ''}
          ${state.achievements.map(a => `
            <tr>
              <td><strong>${sanitizeText(a.title)}</strong></td>
              <td>${sanitizeText(a.category)}</td>
              <td>${sanitizeText(a.date)}</td>
              <td class="actions">
                <button class="btn-icon btn-del" onclick="deleteItem('achievements', '${a._id}')" title="Delete">🗑️ Delete</button>
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
          ${state.events.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--text-muted);">No events found.</td></tr>' : ''}
          ${state.events.map(e => `
            <tr>
              <td><strong>${sanitizeText(e.title)}</strong></td>
              <td>${sanitizeText(e.event_date)}</td>
              <td><span class="event-status ${sanitizeText(e.status)}">${sanitizeText(e.status)}</span></td>
              <td class="actions">
                <button class="btn-icon btn-del" onclick="deleteItem('events', '${e._id}')" title="Delete">🗑️ Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else if (currentAdminTab === 'feedback') {
    tableHtml = `
      <div style="display:flex; flex-direction:column; gap:1rem;">
        ${state.feedback.length === 0 ? '<p style="color:var(--text-muted); text-align:center; padding:2rem;">No feedback received yet.</p>' : ''}
        ${state.feedback.map(f => `
          <div style="background:var(--surface); padding:1rem; border-radius:var(--radius-sm); border:1px solid var(--border);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
              <div>
                <strong>${sanitizeText(f.name)}</strong> &lt;${sanitizeText(f.email)}&gt;
                <div style="font-size:0.8rem; color:var(--text-muted);">${sanitizeText(formatDate(f.created_at))}</div>
              </div>
              <button class="btn-icon btn-del" onclick="deleteItem('feedback', '${f._id}')" title="Delete">🗑️ Delete</button>
            </div>
            <p style="color:var(--text-light);">${sanitizeText(f.message)}</p>
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
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
      credentials: 'include'
    });
    
    if (res.ok) {
      showToast('Contact info updated successfully', 'success');
      await fetchContact();
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
  if (!id || id === 'undefined') {
    showToast('Invalid item ID — cannot delete', 'error');
    return;
  }
  if (!confirm(`Are you sure you want to delete this item?`)) return;
  
  try {
    const res = await fetch(`${API}/${type}/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    
    if (res.ok) {
      showToast('Item deleted successfully', 'success');
      closeItemModal();
      
      // Refresh data
      if (type === 'members') { await fetchMembers(); updateStats(); }
      if (type === 'founders') { await fetchFounders(); updateStats(); }
      if (type === 'achievements') { await fetchAchievements(); updateStats(); }
      if (type === 'events') { await fetchEvents(); updateStats(); }
      if (type === 'feedback') await fetchFeedback();
      
      if (dashboardModal.classList.contains('open')) renderDashboardContent();
    } else if (res.status === 401) {
      localStorage.removeItem('kv_admin_token');
      state.isAdmin = false;
      state.adminEmail = null;
      adminBtn.innerText = 'Admin Login';
      dashboardModal.classList.remove('open');
      closeItemModal();
      renderAllPublicSections();
      showToast('Session expired. Please log in again.', 'error');
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || 'Failed to delete', 'error');
    }
  } catch (err) {
    showToast('Network error — please try again', 'error');
  }
}

async function clearAllItems(type) {
  if (!confirm(`Are you sure you want to delete ALL ${type}? This cannot be undone.`)) return;
  
  try {
    const res = await fetch(`${API}/${type}/all`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    
    if (res.ok) {
      showToast(`All ${type} deleted successfully`, 'success');
      closeItemModal();
      
      // Refresh data
      if (type === 'members') { await fetchMembers(); updateStats(); }
      if (type === 'founders') { await fetchFounders(); updateStats(); }
      if (type === 'achievements') { await fetchAchievements(); updateStats(); }
      if (type === 'events') { await fetchEvents(); updateStats(); }
      if (type === 'feedback') await fetchFeedback();
      
      if (dashboardModal.classList.contains('open')) renderDashboardContent();
    } else if (res.status === 401) {
      localStorage.removeItem('kv_admin_token');
      state.isAdmin = false;
      state.adminEmail = null;
      adminBtn.innerText = 'Admin Login';
      dashboardModal.classList.remove('open');
      closeItemModal();
      renderAllPublicSections();
      showToast('Session expired. Please log in again.', 'error');
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || 'Failed to clear items', 'error');
    }
  } catch (err) {
    showToast('Network error — please try again', 'error');
  }
}

function openCreateModal(type, prefillDate = '') {
  const content = document.getElementById('itemModalContent');
  let formHtml = '';
  
  if (type === 'members') {
    let genOptions = '<option value="" disabled selected>-- Select Generation --</option>';
    for(let i=1; i<=100; i++) genOptions += `<option value="Gen ${i}">Gen ${i}</option>`;
    
    let yearOptions = '<option value="" disabled selected>-- Select Year --</option>';
    for(let i=1; i<=4; i++) yearOptions += `<option value="${i}">Year ${i}</option>`;
    
    formHtml = `
      <h2 class="item-modal-title">Add New Member</h2>
      <form onsubmit="handleFormSubmit(event, 'members')">
        <div class="form-group"><label>Name</label><input type="text" name="name" required></div>
        <div class="form-group"><label>Roll No</label><input type="text" name="roll_no" required></div>
        <div class="form-group"><label>Department</label><input type="text" name="department" required></div>
        <div class="form-group"><label>Section</label><input type="text" name="section" required></div>
        <div class="form-group"><label>Year</label><select name="year" required>${yearOptions}</select></div>
        <div class="form-group"><label>Generation</label><select name="gen" required>${genOptions}</select></div>
        <div class="form-group"><label>Role</label><input type="text" name="role" placeholder="e.g. Member, Secretary, Cultural Head" required></div>
        <div class="form-group"><label>Bio</label><textarea name="bio"></textarea></div>
        <div class="form-group"><label>Photo</label><input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/gif"></div>
        <button type="submit" class="btn-primary btn-full">Save Member</button>
      </form>
    `;
  } else if (type === 'events') {
    formHtml = `
      <h2 class="item-modal-title">Add New Event</h2>
      <form onsubmit="handleFormSubmit(event, 'events')">
        <div class="form-group"><label>Title</label><input type="text" name="title" required></div>
        <div class="form-group"><label>Date (YYYY-MM-DD)</label><input type="date" name="event_date" value="${sanitizeText(prefillDate)}" required></div>
        <div class="form-group"><label>Time (e.g. 10:00 AM)</label><input type="text" name="event_time" placeholder="e.g. 10:00 AM"></div>
        <div class="form-group"><label>Venue</label><input type="text" name="venue" required></div>
        <div class="form-group"><label>Category</label><input type="text" name="category" placeholder="e.g. Cultural, Workshop, Competition" required></div>
        <div class="form-group"><label>Status</label>
          <select name="status" required>
            <option value="" disabled selected>-- Select Status --</option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div class="form-group"><label>Description</label><textarea name="description" required></textarea></div>
        <div class="form-group"><label>Photo</label><input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/gif"></div>
        <button type="submit" class="btn-primary btn-full">Save Event</button>
      </form>
    `;
  } else if (type === 'achievements') {
    formHtml = `
      <h2 class="item-modal-title">Add New Achievement</h2>
      <form onsubmit="handleFormSubmit(event, 'achievements')">
        <div class="form-group"><label>Title</label><input type="text" name="title" required></div>
        <div class="form-group"><label>Category</label><input type="text" name="category" placeholder="e.g. Dance, Music, Drama, Award" required></div>
        <div class="form-group"><label>Date (YYYY-MM-DD)</label><input type="date" name="date" required></div>
        <div class="form-group"><label>Description</label><textarea name="description" required></textarea></div>
        <div class="form-group"><label>Photo</label><input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/gif"></div>
        <button type="submit" class="btn-primary btn-full">Save Achievement</button>
      </form>
    `;
  } else if (type === 'founders') {
    formHtml = `
      <h2 class="item-modal-title">Add New Founder</h2>
      <form onsubmit="handleFormSubmit(event, 'founders')">
        <div class="form-group"><label>Name</label><input type="text" name="name" required></div>
        <div class="form-group"><label>Designation</label><input type="text" name="designation" required placeholder="e.g. Chief Patron, Founding Director"></div>
        <div class="form-group"><label>Department</label><input type="text" name="department" placeholder="e.g. Principal, Cultural Studies"></div>
        <div class="form-group"><label>Year</label><input type="text" name="year" placeholder="e.g. 2025" required></div>
        <div class="form-group"><label>Display Order</label><input type="number" name="display_order" placeholder="e.g. 1" min="1" required></div>
        <div class="form-group"><label>Bio</label><textarea name="bio"></textarea></div>
        <div class="form-group"><label>Photo</label><input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/gif"></div>
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
      headers: getAuthHeaders(),
      body: formData,
      credentials: 'include'
    });
    
    if (res.ok) {
      showToast('Successfully added', 'success');
      closeItemModal();
      
      // Refresh data
      if (type === 'members') { await fetchMembers(); updateStats(); }
      if (type === 'founders') { await fetchFounders(); updateStats(); }
      if (type === 'achievements') { await fetchAchievements(); updateStats(); }
      if (type === 'events') { await fetchEvents(); updateStats(); }
      
      if (dashboardModal.classList.contains('open')) renderDashboardContent();
    } else if (res.status === 401) {
      localStorage.removeItem('kv_admin_token');
      state.isAdmin = false;
      state.adminEmail = null;
      adminBtn.innerText = 'Admin Login';
      dashboardModal.classList.remove('open');
      closeItemModal();
      renderAllPublicSections();
      showToast('Unauthorized: Please log in as Admin first.', 'error');
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || 'Failed to save', 'error');
    }
  } catch (err) {
    showToast('Network error — please try again', 'error');
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
      body: JSON.stringify(payload),
      credentials: 'include'
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
