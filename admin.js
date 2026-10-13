const isLocal = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
const API = isLocal ? 'http://127.0.0.1:4000/api' : '/api';

let adminToken = null;
let adminUser = null;
let currentConcert = null;

function getToken() { return adminToken || localStorage.getItem('admin_token'); }
function saveAdmin(user, token) {
  adminToken = token;
  adminUser = user;
  localStorage.setItem('admin_token', token);
  localStorage.setItem('admin_user', JSON.stringify(user));
}
function clearAdmin() {
  adminToken = null;
  adminUser = null;
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
}
function loadStoredAdmin() {
  const t = localStorage.getItem('admin_token');
  const u = localStorage.getItem('admin_user');
  if (t && u) { adminToken = t; adminUser = JSON.parse(u); return true; }
  return false;
}

async function api(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(API + path, { ...options, headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Request failed');
  return json.data;
}

function showToast(message, type) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast toast--' + (type || 'success');
  requestAnimationFrame(function() {
    requestAnimationFrame(function() { toast.classList.add('toast--visible'); });
  });
  clearTimeout(toast._t);
  toast._t = setTimeout(function() { toast.classList.remove('toast--visible'); }, 3000);
}

function showTab(name) {
  document.querySelectorAll('.admin-tab').forEach(function(el) { el.classList.remove('active'); });
  document.querySelectorAll('.sidebar-btn').forEach(function(btn) { btn.classList.remove('active'); });
  document.getElementById('tab-' + name).classList.add('active');
  document.querySelector('[data-tab="' + name + '"]').classList.add('active');
  const titles = { dashboard: 'Dashboard', lookup: 'Verify & Issue', tickets: 'All Tickets' };
  const topbar = document.getElementById('topbar-title');
  if (topbar) topbar.textContent = titles[name] || name;
  closeSidebar();
  if (name === 'dashboard') loadStats();
  if (name === 'tickets') loadAllTickets();
}

async function loadStats() {
  try {
    const stats = await api('/admin/stats');
    document.getElementById('stat-users').textContent = stats.totalUsers;
    document.getElementById('stat-tickets').textContent = stats.totalTickets;
    document.getElementById('stat-admin').textContent = stats.adminIssued;
    document.getElementById('stat-spots').textContent = stats.spotsLeft + ' / ' + stats.totalCapacity;
  } catch(e) {
    showToast(e.message, 'error');
  }
}
async function loadConcert() {
  try {
    const concerts = await api('/concerts');
    currentConcert = concerts?.[0] || null;
  } catch {}
}

async function loadAllTickets() {
  const container = document.getElementById('tickets-list');
  container.innerHTML = '<p class="empty-msg">Loading…</p>';
  try {
    const tickets = await api('/admin/tickets');
    if (!tickets || tickets.length === 0) {
      container.innerHTML = '<p class="empty-msg">No tickets issued yet.</p>';
      return;
    }

    const table = document.createElement('table');
    table.className = 'ticket-table';
    table.innerHTML =
      '<thead><tr>' +
        '<th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Interest</th>' +
        '<th>Seat</th><th>Meal</th><th>Source</th><th></th>' +
      '</tr></thead>';

    const tbody = document.createElement('tbody');
    tickets.forEach(function(t, i) {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + (i + 1) + '</td>' +
        '<td><strong>' + (t.user?.name || '—') + '</strong></td>' +
        '<td>' + (t.user?.email || '—') + '</td>' +
        '<td>' + (t.user?.phone || '—') + '</td>' +
        '<td>' + (t.user?.interest || '—') + '</td>' +
        '<td>' + (t.seat_number || '—') + '</td>' +
        '<td>' + (t.meal_option || '—') + '</td>' +
        '<td>' + (t.issued_by_admin ? 'Admin' : 'Self') + '</td>' +
        '<td><button class="btn-secondary btn-sm view-ticket-btn" data-id="' + t.id + '">View</button></td>';
      tr.querySelector('.view-ticket-btn').onclick = function() {
        openTicketModal(t);
      };
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    wrap.appendChild(table);
    container.appendChild(wrap);
  } catch(e) {
    container.innerHTML = '<p class="empty-msg">Failed to load tickets.</p>';
    showToast(e.message, 'error');
  }
}

function bindLookup() {
  const btn = document.getElementById('lookup-btn');
  const input = document.getElementById('lookup-input');
  const errEl = document.getElementById('lookup-error');
  const results = document.getElementById('lookup-results');

  btn.onclick = runLookup;
  input.onkeydown = function(e) { if (e.key === 'Enter') runLookup(); };

  async function runLookup() {
    const q = input.value.trim();
    if (!q) { errEl.textContent = 'Enter a name, email, or phone number.'; return; }
    errEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Searching…';
    results.innerHTML = '';

    try {
      const users = await api('/admin/lookup?query=' + encodeURIComponent(q));

      if (!users || users.length === 0) {
        results.innerHTML = '<p class="empty-msg">No users found for "' + q + '".</p>';
        return;
      }

      users.forEach(function(user) {
        results.appendChild(buildResultCard(user));
      });
    } catch(e) {
      errEl.textContent = e.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Search';
    }
  }
}

function buildResultCard(user) {
  const hasTicket = user.tickets && user.tickets.some(function(t) { return t.status === 'CONFIRMED'; });
  const hasRegistered = user.hasRegistered;

  const card = document.createElement('div');
  card.className = 'result-card ' + (hasRegistered ? 'result-card--registered' : 'result-card--not-registered');

  const info = document.createElement('div');
  info.className = 'result-info';
  info.innerHTML =
    '<span class="result-name">' + user.name + '</span>' +
    '<span class="result-meta">' + user.email + ' · ' + (user.phone || 'No phone') + '</span>' +
    '<span class="result-meta">Interest: ' + (user.interest || '—') + '</span>';

  const actions = document.createElement('div');
  actions.className = 'result-actions';

  const badge = document.createElement('span');
  if (hasTicket) {
    badge.className = 'result-badge result-badge--has-ticket';
    badge.textContent = '✓ Ticket Issued';
  } else if (hasRegistered) {
    badge.className = 'result-badge result-badge--yes';
    badge.textContent = '✓ Registered';
  } else {
    badge.className = 'result-badge result-badge--no';
    badge.textContent = 'Not Registered';
  }
  actions.appendChild(badge);

  if (!hasTicket) {
    const issueBtn = document.createElement('button');
    issueBtn.className = 'btn-primary btn-sm';
    issueBtn.textContent = 'Issue Ticket';
    issueBtn.onclick = function() { openIssueModal(user); };
    actions.appendChild(issueBtn);
  } else {
    const confirmedTicket = user.tickets.find(function(t) { return t.status === 'CONFIRMED'; });
    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn-secondary btn-sm';
    viewBtn.textContent = 'View Ticket';
    viewBtn.onclick = function() { openTicketModal({ ...confirmedTicket, user: user, concert: currentConcert }); };
    actions.appendChild(viewBtn);
  }

  card.appendChild(info);
  card.appendChild(actions);
  return card;
}

function openIssueModal(user) {
  document.getElementById('issue-modal-title').textContent = 'Issue Ticket — ' + user.name;
  document.getElementById('issue-user-info').textContent =
    user.email + ' · ' + (user.phone || 'No phone') + ' · ' + (user.interest || '—');
  document.getElementById('issue-user-id').value = user.id;
  document.getElementById('issue-concert-id').value = currentConcert?.id || '';
  document.getElementById('issue-seat').value = '';
  document.getElementById('issue-meal').value = '';
  document.getElementById('issue-error').textContent = '';
  document.getElementById('issue-modal').style.display = 'flex';
}

function openTicketModal(ticket) {
  const content = document.getElementById('ticket-modal-content');
  const user = ticket.user || {};
  const concert = ticket.concert || currentConcert || {};

  const d = concert.date_time ? new Date(concert.date_time) : null;
  const dateStr = d ? d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '—';
  const timeStr = d ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';

  content.innerHTML =
    '<div class="printable-ticket">' +
      '<div class="printable-ticket__header">' +
        '<p class="printable-ticket__brand">NO JESUS NO SWAG</p>' +
        '<p class="printable-ticket__event">' + (concert.title || 'Free Rap Showcase') + '</p>' +
      '</div>' +
      '<div class="printable-ticket__qr" id="modal-qr-wrap"></div>' +
      '<div class="printable-ticket__details">' +
        '<div class="ticket-detail-item"><span class="ticket-detail-label">Name</span><span class="ticket-detail-value">' + (user.name || '—') + '</span></div>' +
        '<div class="ticket-detail-item"><span class="ticket-detail-label">Seat</span><span class="ticket-detail-value">' + (ticket.seat_number || '—') + '</span></div>' +
        '<div class="ticket-detail-item"><span class="ticket-detail-label">Meal</span><span class="ticket-detail-value">' + (ticket.meal_option || '—') + '</span></div>' +
        '<div class="ticket-detail-item"><span class="ticket-detail-label">Date</span><span class="ticket-detail-value">' + dateStr + '</span></div>' +
        '<div class="ticket-detail-item"><span class="ticket-detail-label">Time</span><span class="ticket-detail-value">' + timeStr + '</span></div>' +
        '<div class="ticket-detail-item"><span class="ticket-detail-label">Venue</span><span class="ticket-detail-value">' + (concert.venue_name || '—') + '</span></div>' +
      '</div>' +
      '<div class="printable-ticket__code">' + ticket.qr_code_data + '</div>' +
      '<button class="print-btn" onclick="window.print()">Print Ticket</button>' +
    '</div>';

  document.getElementById('ticket-modal').style.display = 'flex';
  generateQR(document.getElementById('modal-qr-wrap'), ticket.qr_code_data);
}

function generateQR(container, data) {
  container.innerHTML = '';
  function render() {
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    QRCode.toCanvas(canvas, data, { width: 180, margin: 2, color: { dark: '#18181b', light: '#ffffff' } });
  }
  if (typeof QRCode === 'undefined') {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
    s.onload = render;
    document.head.appendChild(s);
  } else {
    render();
  }
}

function bindIssueForm() {
  document.getElementById('issue-form').onsubmit = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('issue-submit');
    const errEl = document.getElementById('issue-error');
    errEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Generating…';

    try {
      const result = await api('/admin/generate-ticket', {
        method: 'POST',
        body: JSON.stringify({
          userId: document.getElementById('issue-user-id').value,
          concertId: document.getElementById('issue-concert-id').value,
          seatNumber: document.getElementById('issue-seat').value.trim(),
          mealOption: document.getElementById('issue-meal').value,
        }),
      });

      document.getElementById('issue-modal').style.display = 'none';
      showToast('Ticket issued for ' + result.user.name + ' — Seat ' + result.ticket.seat_number);
      openTicketModal({ ...result.ticket, user: result.user, concert: result.concert });
      document.getElementById('lookup-results').innerHTML = '';
      document.getElementById('lookup-input').value = '';
    } catch(e) {
      errEl.textContent = e.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Generate Ticket';
    }
  };
}

function bindModals() {
  document.getElementById('ticket-modal-close').onclick = function() {
    document.getElementById('ticket-modal').style.display = 'none';
  };
  document.getElementById('issue-modal-close').onclick = function() {
    document.getElementById('issue-modal').style.display = 'none';
  };
  document.querySelectorAll('.modal-overlay').forEach(function(m) {
    m.onclick = function(e) { if (e.target === m) m.style.display = 'none'; };
  });
}

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('visible');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  const overlay = document.getElementById('sidebar-overlay');
  if (overlay) overlay.classList.remove('visible');
}

function bindSidebar() {
  document.querySelectorAll('.sidebar-btn').forEach(function(btn) {
    btn.onclick = function() { showTab(btn.dataset.tab); };
  });

  document.getElementById('admin-signout').onclick = function() {
    clearAdmin();
    document.getElementById('admin-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
  };

  const hamburger = document.getElementById('hamburger');
  if (hamburger) hamburger.onclick = openSidebar;

  const sidebarClose = document.getElementById('sidebar-close');
  if (sidebarClose) sidebarClose.onclick = closeSidebar;
}

function bindLogin() {
  document.getElementById('admin-login-form').onsubmit = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const errEl = document.getElementById('login-error');
    errEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Signing in…';

    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: document.getElementById('admin-email').value.trim(),
          password: document.getElementById('admin-password').value,
        }),
      });

      if (data.user.role !== 'ADMIN') {
        throw new Error('Access denied. Admin accounts only.');
      }

      saveAdmin(data.user, data.token);
      bootAdminScreen();
    } catch(e) {
      errEl.textContent = e.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  };
}

async function bootAdminScreen() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-screen').style.display = 'flex';

  const overlay = document.createElement('div');
  overlay.id = 'sidebar-overlay';
  overlay.className = 'sidebar-overlay';
  overlay.onclick = closeSidebar;
  document.body.appendChild(overlay);

  await loadConcert();
  showTab('dashboard');
  bindLookup();
  bindIssueForm();
  bindModals();
  bindSidebar();

  const refreshBtn = document.getElementById('refresh-stats-btn');
  if (refreshBtn) refreshBtn.onclick = loadStats;

  const goLookup = document.getElementById('go-lookup-btn');
  if (goLookup) goLookup.onclick = function() { showTab('lookup'); };

  const goTickets = document.getElementById('go-tickets-btn');
  if (goTickets) goTickets.onclick = function() { showTab('tickets'); };
}

async function init() {
  bindLogin();
  if (loadStoredAdmin()) {
    try {
      await api('/admin/stats');
      await bootAdminScreen();
    } catch {
      clearAdmin();
    }
  }
}

init();
