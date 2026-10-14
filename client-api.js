const isLocal = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
const API = isLocal ? 'http://127.0.0.1:4000/api' : 'https://no-jesus-no-swag-api.vercel.app/api';

function getToken() {
  return localStorage.getItem('njns_token');
}

function saveSession(user, token) {
  localStorage.setItem('njns_token', token);
  localStorage.setItem('njns_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('njns_token');
  localStorage.removeItem('njns_user');
}

function getUser() {
  const raw = localStorage.getItem('njns_user');
  return raw ? JSON.parse(raw) : null;
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  const json = await res.json();

  if (!res.ok) throw new Error(json.message || 'Request failed');
  return json.data;
}

export { request, getToken, getUser, saveSession, clearSession };
