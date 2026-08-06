let studentData = null;

async function init() {
  const res = await fetch('/api/student/me');
  studentData = await res.json();
  const name = studentData.profile.name;
  document.getElementById('topbar-name').textContent = name;
  document.getElementById('student-name-display').textContent = `Welcome back, ${name}`;
  renderOverview();
}

function renderOverview() {
  const d = studentData;
  const color = d.attendance_pct >= 75 ? 'badge-success' : d.attendance_pct >= 60 ? 'badge-warning' : 'badge-danger';
  document.getElementById('overview-stats').innerHTML = `
    <div class="stat-card"><div class="stat-label">Attendance %</div><div class="stat-value">${d.attendance_pct}%</div><div class="stat-sub">${d.present_days} of ${d.present_days+d.absent_days} days</div><div class="stat-icon">📊</div></div>
    <div class="stat-card"><div class="stat-label">Present Days</div><div class="stat-value">${d.present_days}</div><div class="stat-icon">✅</div></div>
    <div class="stat-card"><div class="stat-label">Absent Days</div><div class="stat-value">${d.absent_days}</div><div class="stat-icon">❌</div></div>
  `;
  const rows = d.recent_attendance.slice(0,6).map(r =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 20px;border-top:1px solid var(--border);font-size:.85rem;">
      <span>${r.date}</span><span class="badge ${r.status==='Present'?'badge-success':'badge-danger'}">${r.status}</span>
    </div>`).join('');
  document.getElementById('recent-attendance-overview').innerHTML = rows;
  loadPendingAssignments();
}

async function loadPendingAssignments() {
  const res = await fetch('/api/student/assignments');
  const data = await res.json();
  const pending = data.filter(a => a.status === 'Pending');
  if (!pending.length) {
    document.getElementById('pending-assignments').innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:.85rem">✅ All assignments submitted!</div>';
    return;
  }
  document.getElementById('pending-assignments').innerHTML = pending.map(a =>
    `<div style="padding:12px 20px;border-top:1px solid var(--border);">
      <div style="font-weight:500;font-size:.88rem">${a.title}</div>
      <div style="font-size:.75rem;color:var(--text-muted);margin-top:3px">${a.subject} · Due: ${a.due}</div>
    </div>`).join('');
}

async function loadAttendanceDetail() {
  const d = studentData;
  const color = d.attendance_pct >= 75 ? 'var(--success)' : d.attendance_pct >= 60 ? 'var(--warning)' : 'var(--danger)';
  const pct = d.attendance_pct;
  const rows = d.recent_attendance.map(r =>
    `<tr><td>${r.date}</td><td><span class="badge ${r.status==='Present'?'badge-success':'badge-danger'}">${r.status}</span></td></tr>`).join('');
  document.getElementById('attendance-detail').innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px;margin-bottom:20px;display:flex;gap:32px;align-items:center;">
      <div style="text-align:center">
        <div style="font-size:3rem;font-weight:800;color:${color}">${pct}%</div>
        <div style="font-size:.8rem;color:var(--text-muted)">Overall Attendance</div>
        <div class="progress-bar" style="margin-top:10px;width:120px"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
      <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div style="text-align:center;background:rgba(16,185,129,.08);border-radius:12px;padding:16px"><div style="font-size:1.6rem;font-weight:700;color:var(--success)">${d.present_days}</div><div style="font-size:.78rem;color:var(--text-muted)">Days Present</div></div>
        <div style="text-align:center;background:rgba(239,68,68,.08);border-radius:12px;padding:16px"><div style="font-size:1.6rem;font-weight:700;color:var(--danger)">${d.absent_days}</div><div style="font-size:.78rem;color:var(--text-muted)">Days Absent</div></div>
      </div>
    </div>
    <div class="table-wrap">
      <div class="table-header"><h3>Attendance Log (Last 30 Days)</h3></div>
      <table><thead><tr><th>Date</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;
}

async function loadAssignments() {
  const res = await fetch('/api/student/assignments');
  const data = await res.json();
  const rows = data.map(a => `
    <tr>
      <td style="font-weight:500">${a.title}</td>
      <td>${a.subject}</td>
      <td>${a.due}</td>
      <td><span class="badge ${a.status==='Submitted'?'badge-success':'badge-warning'}">${a.status}</span></td>
    </tr>`).join('');
  document.getElementById('assignments-list').innerHTML = `
    <div class="table-wrap">
      <table><thead><tr><th>Title</th><th>Subject</th><th>Due Date</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </div>`;
}

async function loadTimetable() {
  const res = await fetch('/api/student/timetable');
  const data = await res.json();
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
  const todayDay = days[new Date().getDay()-1] || '';
  const grid = data.map(d => `
    <div style="background:var(--surface);border:1px solid ${d.day===todayDay?'var(--primary)':'var(--border)'};border-radius:14px;padding:18px;${d.day===todayDay?'box-shadow:0 0 0 1px var(--primary)':''}">
      <div style="font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:8px">${d.day===todayDay?'📍':'📅'} ${d.day} ${d.day===todayDay?'<span class="badge badge-primary">Today</span>':''}</div>
      ${d.slots.map(s=>`<div style="background:var(--bg);border-radius:8px;padding:8px 12px;margin-bottom:6px;font-size:.82rem;color:var(--text-muted)">${s}</div>`).join('')}
    </div>`).join('');
  document.getElementById('timetable-grid').innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px">${grid}</div>`;
}

function loadProfile() {
  const p = studentData.profile;
  document.getElementById('profile-content').innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:32px;max-width:500px">
      <div style="text-align:center;margin-bottom:28px">
        <div style="width:72px;height:72px;background:linear-gradient(135deg,var(--primary),var(--accent));border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2rem;margin:0 auto 12px">🎓</div>
        <h2 style="font-size:1.3rem">${p.name}</h2>
        <p style="color:var(--text-muted);font-size:.85rem">${p.branch} · ${p.year} Year</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px">
        ${[['Student ID',p.id],['Email',p.email],['Phone',p.phone],['Branch',p.branch],['Year',p.year+' Year'],['Status',p.status]].map(([k,v])=>`
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:.88rem">
          <span style="color:var(--text-muted)">${k}</span>
          <span style="font-weight:500">${v}</span>
        </div>`).join('')}
      </div>
    </div>`;
}

function showSection(id) {
  document.querySelectorAll('.content-section').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.menu li').forEach(l=>l.classList.remove('active'));
  document.querySelector(`.menu li[onclick="showSection('${id}')"]`).classList.add('active');
  const titles={overview:'Dashboard Overview',attendance:'My Attendance',assignments:'My Assignments',timetable:'Weekly Timetable',profile:'My Profile'};
  document.getElementById('page-title').textContent=titles[id]||id;
  if(id==='attendance') loadAttendanceDetail();
  if(id==='assignments') loadAssignments();
  if(id==='timetable') loadTimetable();
  if(id==='profile') loadProfile();
}

init();
