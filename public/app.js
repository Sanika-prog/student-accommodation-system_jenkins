const state = {
  token: localStorage.getItem('kh_token') || null,
  user: JSON.parse(localStorage.getItem('kh_user') || 'null'),
  rooms: [],
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ---------- helpers ----------

async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
}

function toast(msg, isError = false) {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast' + (isError ? ' error' : '');
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.hidden = true), 3200);
}

function fmtMoney(n) {
  return `$${Number(n).toLocaleString()}`;
}

// ---------- session / gate ----------

function refreshSessionUI() {
  const loggedIn = !!state.token;
  $('#topbar').hidden = !loggedIn;
  $('#gate').hidden = loggedIn;
  $$('.view').forEach((v) => (v.hidden = true));
  $('#who').textContent = loggedIn ? `${state.user.name} · ${state.user.role}` : '';
  $('#adminTab').hidden = !(loggedIn && state.user.role === 'admin');
  $('#addRoomBtn').hidden = !(loggedIn && state.user.role === 'admin');

  if (loggedIn) {
    showView('rooms');
    loadRooms();
  }
}

function setSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('kh_token', token);
  localStorage.setItem('kh_user', JSON.stringify(user));
  refreshSessionUI();
}

function clearSession() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('kh_token');
  localStorage.removeItem('kh_user');
  refreshSessionUI();
}

// ---------- view switching ----------

function showView(name) {
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === name));
  $$('.view').forEach((v) => (v.hidden = v.id !== `view-${name}`));
  if (name === 'applications') loadMyApplications();
  if (name === 'admin') loadAdminApplications();
}

$('#tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (btn) showView(btn.dataset.view);
});

$$('.gate-tab').forEach((btn) =>
  btn.addEventListener('click', () => {
    $$('.gate-tab').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const form = btn.dataset.form;
    $('#loginForm').hidden = form !== 'login';
    $('#registerForm').hidden = form !== 'register';
  })
);

// ---------- auth forms ----------

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const note = $('#loginNote');
  note.textContent = '';
  note.className = 'form-note';
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: { email: fd.get('email'), password: fd.get('password') },
    });
    setSession(data.token, data.user);
    toast(`Welcome back, ${data.user.name.split(' ')[0]}`);
  } catch (err) {
    note.textContent = err.message;
  }
});

$('#registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const note = $('#registerNote');
  note.textContent = '';
  note.className = 'form-note';
  try {
    const data = await api('/auth/register', {
      method: 'POST',
      body: {
        name: fd.get('name'),
        email: fd.get('email'),
        password: fd.get('password'),
        role: fd.get('role'),
      },
    });
    setSession(data.token, data.user);
    toast(`Account created — welcome, ${data.user.name.split(' ')[0]}`);
  } catch (err) {
    note.textContent = err.message;
  }
});

$('#logoutBtn').addEventListener('click', () => {
  clearSession();
  toast('Signed out');
});

// ---------- rooms ----------

async function loadRooms() {
  try {
    state.rooms = await api('/rooms');
    renderRooms();
  } catch (err) {
    toast(err.message, true);
  }
}

function renderRooms() {
  const grid = $('#roomGrid');
  if (!state.rooms.length) {
    grid.innerHTML = `<p class="empty-note">No rooms on the board yet.</p>`;
    return;
  }
  grid.innerHTML = state.rooms
    .map((r) => {
      const statusClass = `status-${r.status}`;
      const disabled = r.status !== 'available' || state.user?.role !== 'student';
      const label =
        state.user?.role === 'admin'
          ? 'Admin view'
          : r.status === 'available'
          ? 'Apply for this room'
          : 'Not available';
      return `
      <article class="room-card">
        <span class="status-pill ${statusClass}">${r.status}</span>
        <div class="room-tag">${escapeHtml(r.roomNumber)}</div>
        <div class="room-block">${escapeHtml(r.block)}</div>
        <div class="room-meta"><span>Capacity</span><span>${r.occupied}/${r.capacity}</span></div>
        <div class="room-meta"><span>Per semester</span><span class="room-price">${fmtMoney(r.pricePerSemester)}</span></div>
        ${
          state.user?.role === 'student'
            ? `<button class="primary-btn" data-apply="${r._id}" ${disabled ? 'disabled' : ''}>${label}</button>`
            : ''
        }
      </article>`;
    })
    .join('');
}

$('#roomGrid').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-apply]');
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = 'Applying…';
  try {
    await api('/applications', { method: 'POST', body: { roomId: btn.dataset.apply } });
    toast('Application submitted');
    showView('applications');
  } catch (err) {
    toast(err.message, true);
    btn.disabled = false;
    btn.textContent = 'Apply for this room';
  }
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- add room (admin) ----------

$('#addRoomBtn').addEventListener('click', () => $('#roomDialog').showModal());
$('#cancelRoomBtn').addEventListener('click', () => $('#roomDialog').close());

$('#roomForm').addEventListener('submit', async (e) => {
  const fd = new FormData(e.target);
  try {
    await api('/rooms', {
      method: 'POST',
      body: {
        roomNumber: fd.get('roomNumber'),
        block: fd.get('block'),
        capacity: Number(fd.get('capacity')),
        pricePerSemester: Number(fd.get('pricePerSemester')),
      },
    });
    toast('Room added');
    e.target.reset();
    loadRooms();
  } catch (err) {
    toast(err.message, true);
  }
});

// ---------- my applications (student) ----------

async function loadMyApplications() {
  const list = $('#appList');
  try {
    const apps = await api('/applications/my');
    if (!apps.length) {
      list.innerHTML = `<p class="empty-note">You haven't applied for a room yet.</p>`;
      return;
    }
    list.innerHTML = apps
      .map(
        (a) => `
      <div class="app-row">
        <div class="app-row-main">
          <span class="app-room">${escapeHtml(a.room?.roomNumber || 'Room')} · ${escapeHtml(a.room?.block || '')}</span>
          <span class="app-sub">Applied ${new Date(a.createdAt).toLocaleDateString()}</span>
        </div>
        <span class="status-pill status-${a.status === 'approved' ? 'available' : a.status === 'rejected' ? 'full' : 'maintenance'}">${a.status}</span>
      </div>`
      )
      .join('');
  } catch (err) {
    list.innerHTML = `<p class="empty-note">${err.message}</p>`;
  }
}

// ---------- admin queue ----------

async function loadAdminApplications() {
  const list = $('#adminAppList');
  try {
    const apps = await api('/applications');
    if (!apps.length) {
      list.innerHTML = `<p class="empty-note">No applications yet.</p>`;
      return;
    }
    list.innerHTML = apps
      .map(
        (a) => `
      <div class="app-row">
        <div class="app-row-main">
          <span class="app-room">${escapeHtml(a.student?.name || 'Student')}</span>
          <span class="app-sub">${escapeHtml(a.student?.email || '')} → ${escapeHtml(a.room?.roomNumber || '')}, ${escapeHtml(a.room?.block || '')}</span>
        </div>
        ${
          a.status === 'pending'
            ? `<div class="app-actions">
                <button class="ghost-btn" data-reject="${a._id}">Reject</button>
                <button class="primary-btn small" data-approve="${a._id}">Approve</button>
              </div>`
            : `<span class="status-pill status-${a.status === 'approved' ? 'available' : 'full'}">${a.status}</span>`
        }
      </div>`
      )
      .join('');
  } catch (err) {
    list.innerHTML = `<p class="empty-note">${err.message}</p>`;
  }
}

$('#adminAppList').addEventListener('click', async (e) => {
  const approveId = e.target.closest('[data-approve]')?.dataset.approve;
  const rejectId = e.target.closest('[data-reject]')?.dataset.reject;
  const id = approveId || rejectId;
  if (!id) return;
  try {
    await api(`/applications/${id}/status`, {
      method: 'PUT',
      body: { status: approveId ? 'approved' : 'rejected' },
    });
    toast(approveId ? 'Application approved' : 'Application rejected');
    loadAdminApplications();
  } catch (err) {
    toast(err.message, true);
  }
});

// ---------- boot ----------

refreshSessionUI();