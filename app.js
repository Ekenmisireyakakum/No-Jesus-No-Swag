import { request, getUser, saveSession, clearSession } from './client-api.js';

let countdownInterval = null;

function showToast(message, type) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast toast--' + (type || 'success');
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      toast.classList.add('toast--visible');
    });
  });
  clearTimeout(toast._timer);
  toast._timer = setTimeout(function() {
    toast.classList.remove('toast--visible');
  }, 3000);
}

function openModal() {
  document.getElementById('modal-overlay').style.display = 'flex';
  document.getElementById('reg-name').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

function startCountdown(concertDate) {
  stopCountdown();

  function tick() {
    var el = document.getElementById('countdown-timer');
    if (!el) { stopCountdown(); return; }

    var diff = new Date(concertDate) - new Date();

    if (diff <= 0) {
      el.innerHTML = '<span class="countdown-live">The concert is happening now!</span>';
      stopCountdown();
      return;
    }

    var days    = Math.floor(diff / (1000 * 60 * 60 * 24));
    var hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((diff % (1000 * 60)) / 1000);

    function pad(n) { return String(n).padStart(2, '0'); }

    el.innerHTML =
      '<div class="countdown-unit"><span class="countdown-num">' + pad(days) + '</span><span class="countdown-label">Days</span></div>' +
      '<span class="countdown-sep">:</span>' +
      '<div class="countdown-unit"><span class="countdown-num">' + pad(hours) + '</span><span class="countdown-label">Hours</span></div>' +
      '<span class="countdown-sep">:</span>' +
      '<div class="countdown-unit"><span class="countdown-num">' + pad(minutes) + '</span><span class="countdown-label">Mins</span></div>' +
      '<span class="countdown-sep">:</span>' +
      '<div class="countdown-unit"><span class="countdown-num">' + pad(seconds) + '</span><span class="countdown-label">Secs</span></div>';
  }

  tick();
  countdownInterval = setInterval(tick, 1000);
}

function updateNav() {
  var user = getUser();
  var btn = document.getElementById('nav-auth-btn');
  var nameEl = document.getElementById('nav-user-name');

  if (user) {
    nameEl.textContent = user.name;
    nameEl.style.display = 'inline';
    btn.textContent = 'Registered';
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.style.cursor = 'default';
  } else {
    nameEl.style.display = 'none';
    btn.textContent = 'Register';
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
    btn.onclick = openModal;
  }
}

async function loadConcert() {
  try {
    var concerts = await request('/concerts');
    if (!concerts || concerts.length === 0) return null;
    var concert = concerts[0];
    var d = new Date(concert.date_time);

    document.getElementById('event-title').textContent = concert.title;
    document.getElementById('event-month').textContent = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'Africa/Lagos' }).toUpperCase();
    document.getElementById('event-day').textContent = d.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'Africa/Lagos' });
    document.getElementById('event-date-main').textContent = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'Africa/Lagos' });
    document.getElementById('event-location').textContent = concert.venue_name + ', ' + concert.venue_address;
    if (concert.image_url) document.getElementById('event-poster').src = concert.image_url;
    if (concert.description) document.getElementById('event-description').textContent = concert.description;

    return concert;
  } catch (e) {
    console.error(e);
    return null;
  }
}

async function checkIfRegistered(concertId) {
  try {
    var tickets = await request('/tickets/my-tickets');
    return tickets.find(function(t) {
      return t.concert_id === concertId && (t.status === 'CONFIRMED' || t.status === 'PENDING');
    }) || null;
  } catch {
    return null;
  }
}

async function renderRegistrationCard(concert) {
  var card = document.getElementById('registration-card');
  var user = getUser();
  stopCountdown();

  if (!concert) {
    card.innerHTML = '<p style="color:#71717a;font-size:0.9rem">No upcoming events found.</p>';
    return;
  }

  if (!user) {
    card.innerHTML =
      '<p class="reg-card__title">Free Entry</p>' +
      '<p class="reg-card__sub">' + concert.available_slots + ' of ' + concert.total_capacity + ' spots available</p>' +
      '<button class="btn-primary btn-full" id="open-register-btn">Register for Free</button>';
    document.getElementById('open-register-btn').onclick = openModal;
    return;
  }

  var ticket = await checkIfRegistered(concert.id);
  var initial = user.name ? user.name[0].toUpperCase() : '?';

  if (ticket && ticket.status === 'PENDING') {
    card.innerHTML =
      '<div class="reg-card__avatar">' + initial + '</div>' +
      '<div class="reg-card__body">' +
        '<p class="reg-card__title">Registration Received</p>' +
        '<p class="reg-card__sub">Your seat and meal will be assigned by the admin. Check back soon.</p>' +
      '</div>' +
      '<div class="reg-card__actions">' +
        '<button class="reg-btn" id="cancel-reg-btn">Cancel Registration</button>' +
      '</div>';

    document.getElementById('cancel-reg-btn').onclick = async function() {
      if (!confirm('Cancel your registration?')) return;
      try {
        await request('/tickets/' + ticket.id, { method: 'DELETE' });
        showToast('Registration cancelled');
        renderRegistrationCard(concert);
      } catch (err) {
        showToast(err.message, 'error');
      }
    };

  } else if (ticket && ticket.status === 'CONFIRMED') {
    card.innerHTML =
      '<div class="reg-card__avatar">' + initial + '</div>' +
      '<div class="reg-card__body">' +
        '<p class="reg-card__title">You\'re In</p>' +
        '<p class="reg-card__sub">Registered as <strong>' + (user.interest || 'Attendee') + '</strong>' +
        (ticket.seat_number ? ' &nbsp;·&nbsp; Seat <strong>' + ticket.seat_number + '</strong>' : '') +
        (ticket.meal_option && ticket.meal_option !== 'none' ? ' &nbsp;·&nbsp; Meal: <strong>' + ticket.meal_option + '</strong>' : '') +
        '</p>' +
      '</div>' +
      '<div class="countdown-wrap">' +
        '<p class="countdown-heading">Concert starts in</p>' +
        '<div class="countdown-timer" id="countdown-timer"></div>' +
      '</div>' +
      '<div class="reg-card__actions">' +
        '<button class="reg-btn" id="calendar-btn">' +
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
          ' Add to Calendar' +
        '</button>' +
        '<button class="reg-btn" id="share-btn">' +
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>' +
          ' Invite a Friend' +
        '</button>' +
      '</div>';

    startCountdown(concert.date_time);

    document.getElementById('calendar-btn').onclick = function() {
      var d = new Date(concert.date_time);
      var start = d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      var end = new Date(d.getTime() + 3 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      window.open('https://calendar.google.com/calendar/render?action=TEMPLATE&text=' +
        encodeURIComponent(concert.title) + '&dates=' + start + '/' + end +
        '&location=' + encodeURIComponent(concert.venue_name), '_blank');
    };

    document.getElementById('share-btn').onclick = function() {
      if (navigator.share) {
        navigator.share({ title: concert.title, url: location.href });
      } else {
        navigator.clipboard.writeText(location.href);
        showToast('Link copied!');
      }
    };

  } else {
    var spotsLeft = concert.available_slots;
    var full = spotsLeft <= 0;

    card.innerHTML =
      '<p class="reg-card__title">' + (full ? 'Event Full' : 'Free Entry') + '</p>' +
      '<p class="reg-card__sub">' + (full ? 'This event has reached capacity.' : spotsLeft + ' of ' + concert.total_capacity + ' spots available') + '</p>' +
      '<button class="btn-primary btn-full" id="book-btn"' + (full ? ' disabled' : '') + '>' + (full ? 'Fully Booked' : 'Register for Free') + '</button>';

    if (!full) {
      document.getElementById('book-btn').onclick = function() { openModal(); };
    }
  }
}

function bindModal() {
  document.getElementById('modal-close').onclick = closeModal;

  document.getElementById('modal-overlay').onclick = function(e) {
    if (e.target === e.currentTarget) closeModal();
  };

  document.getElementById('register-form').onsubmit = async function(e) {
    e.preventDefault();
    var btn = document.getElementById('register-submit');
    var errEl = document.getElementById('register-error');
    errEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Registering…';

    try {
      var data = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: document.getElementById('reg-name').value.trim(),
          email: document.getElementById('reg-email').value.trim(),
          phone: document.getElementById('reg-phone').value.trim(),
          interest: document.getElementById('reg-interest').value,
          password: document.getElementById('reg-password').value,
        }),
      });

      saveSession(data.user, data.token);
      closeModal();
      updateNav();

      var concert = await loadConcert();

      if (concert) {
        await request('/tickets', {
          method: 'POST',
          body: JSON.stringify({ concertId: concert.id }),
        });
        showToast('Welcome, ' + data.user.name + '! Registration received — your seat will be assigned soon.');
      } else {
        showToast('Welcome, ' + data.user.name + '!');
      }

      renderRegistrationCard(concert);
    } catch (err) {
      errEl.textContent = err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Get My Free Ticket';
    }
  };
}

async function init() {
  updateNav();
  bindModal();
  var concert = await loadConcert();
  renderRegistrationCard(concert);
}

init();
