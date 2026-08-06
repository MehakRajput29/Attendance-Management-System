let facultyData = null, attendanceData = [], studentsData = [];

async function init() {
  const res = await fetch('/api/faculty/me');
  facultyData = await res.json();
  document.getElementById('topbar-name').textContent = facultyData.name;
  document.getElementById('faculty-name-display').textContent = `Welcome back, ${facultyData.name}`;
  // Set today's date in date picker
  document.getElementById('att-date').value = new Date().toISOString().split('T')[0];
  await loadStudentCount();
}

async function loadStudentCount() {
  const res = await fetch('/api/faculty/students');
  studentsData = await res.json();
  document.getElementById('my-students-count').textContent = studentsData.length;
}

async function loadMarkAttendance() {
  const res = await fetch('/api/faculty/attendance/today');
  attendanceData = await res.json();
  const rows = attendanceData.map(s => `
    <div class="att-row">
      <div><div class="att-name">${s.name}</div><div class="att-branch">${s.branch} · ${s.id}</div></div>
      <div class="att-toggle">
        <label><input type="radio" name="att_${s.id}" value="Present" ${s.status==='Present'?'checked':''}><span class="opt-present">✅ Present</span></label>
        <label><input type="radio" name="att_${s.id}" value="Absent" ${s.status==='Absent'?'checked':''}><span class="opt-absent">❌ Absent</span></label>
      </div>
    </div>`).join('');
  document.getElementById('att-list-wrap').innerHTML = `
    <div class="att-list">${rows}</div>
    <div style="margin-top:12px;display:flex;justify-content:flex-end;gap:10px;align-items:center;">
      <button class="btn" style="background:var(--surface2)" onclick="markAll('Present')">✅ Mark All Present</button>
      <button class="btn" style="background:var(--surface2)" onclick="markAll('Absent')">❌ Mark All Absent</button>
    </div>`;
}

function markAll(status) {
  attendanceData.forEach(s => {
    const radio = document.querySelector(`input[name="att_${s.id}"][value="${status}"]`);
    if (radio) radio.checked = true;
  });
}

async function saveAttendance() {
  const date = document.getElementById('att-date').value;
  const records = {};
  attendanceData.forEach(s => {
    const radio = document.querySelector(`input[name="att_${s.id}"]:checked`);
    if (radio) records[s.id] = radio.value;
  });
  const res = await fetch('/api/faculty/attendance/save', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({date, records})
  });
  const data = await res.json();
  const msg = document.getElementById('save-msg');
  msg.style.display = 'block';
  msg.innerHTML = `<div style="background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.3);border-radius:10px;padding:10px 16px;color:#34d399;font-size:.85rem">✅ Attendance saved successfully for ${data.saved} students on ${date}!</div>`;
  setTimeout(() => { msg.style.display = 'none'; }, 4000);
}

async function loadReports() {
  const res = await fetch('/api/faculty/reports');
  const data = await res.json();
  const rows = data.map(s => {
    const color = s.pct >= 75 ? 'badge-success' : s.pct >= 60 ? 'badge-warning' : 'badge-danger';
    return `<tr>
      <td style="font-family:'DM Mono',monospace;font-size:.78rem;color:var(--text-muted)">${s.id}</td>
      <td style="font-weight:500">${s.name}</td>
      <td>${s.branch}</td>
      <td>${s.present}</td>
      <td>${s.total - s.present}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="progress-bar" style="width:80px"><div class="progress-fill" style="width:${s.pct}%"></div></div>
          <span class="badge ${color}">${s.pct}%</span>
        </div>
      </td>
    </tr>`;
  }).join('');
  document.getElementById('reports-content').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>ID</th><th>Name</th><th>Branch</th><th>Present</th><th>Absent</th><th>Attendance %</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function loadMyStudents() {
  const rows = studentsData.map(s => `
    <tr>
      <td style="font-family:'DM Mono',monospace;font-size:.78rem;color:var(--text-muted)">${s.id}</td>
      <td style="font-weight:500">${s.name}</td>
      <td>${s.branch}</td>
      <td>${s.year}</td>
      <td>${s.email}</td>
      <td><span class="badge ${s.status==='Active'?'badge-success':'badge-danger'}">${s.status}</span></td>
    </tr>`).join('');
  document.getElementById('my-students-table').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>ID</th><th>Name</th><th>Branch</th><th>Year</th><th>Email</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function loadProfile() {
  const f = facultyData;
  document.getElementById('profile-content').innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:32px;max-width:500px">
      <div style="text-align:center;margin-bottom:28px">
        <div style="width:72px;height:72px;background:linear-gradient(135deg,var(--primary),var(--accent));border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2rem;margin:0 auto 12px">👩‍🏫</div>
        <h2 style="font-size:1.3rem">${f.name}</h2>
        <p style="color:var(--text-muted);font-size:.85rem">${f.department} Department</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px">
        ${[['Faculty ID',f.id],['Email',f.email],['Phone',f.phone],['Department',f.department],['Subjects',f.subjects.join(', ')]].map(([k,v])=>`
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
  const titles={overview:'Dashboard Overview',markAttendance:'Mark Attendance',viewReports:'Attendance Reports',students:'My Students',profile:'My Profile'};
  document.getElementById('page-title').textContent=titles[id]||id;
  if(id==='markAttendance') loadMarkAttendance();
  if(id==='viewReports') loadReports();
  if(id==='students' && studentsData.length) loadMyStudents();
  if(id==='profile') loadProfile();
}

init();
