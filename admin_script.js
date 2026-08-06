let allStudents = [], allAttendance = [];

async function init() {
  await loadStats();
  await loadChart();
}

async function loadStats() {
  const res = await fetch('/api/admin/stats');
  const d = await res.json();
  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card"><div class="stat-label">Total Students</div><div class="stat-value">${d.total_students}</div><div class="stat-icon">🎓</div></div>
    <div class="stat-card"><div class="stat-label">Total Faculty</div><div class="stat-value">${d.total_faculty}</div><div class="stat-icon">👩‍🏫</div></div>
    <div class="stat-card"><div class="stat-label">Classes</div><div class="stat-value">${d.classes}</div><div class="stat-icon">🏫</div></div>
    <div class="stat-card"><div class="stat-label">Avg Attendance</div><div class="stat-value">${d.attendance_avg}%</div><div class="stat-icon">📊</div></div>
  `;
  document.getElementById('today-summary').innerHTML = `
    <div style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:.82rem;"><span>Present Today</span><span style="color:var(--success)">${d.present_today}</span></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${Math.round(d.present_today/d.total_students*100)}%"></div></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:.85rem;padding:8px 0;border-top:1px solid var(--border);">
      <span style="color:var(--text-muted)">Present</span><span class="badge badge-success">${d.present_today}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:.85rem;padding:8px 0;border-top:1px solid var(--border);">
      <span style="color:var(--text-muted)">Absent</span><span class="badge badge-danger">${d.absent_today}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:.85rem;padding:8px 0;border-top:1px solid var(--border);">
      <span style="color:var(--text-muted)">Total</span><span class="badge badge-primary">${d.total_students}</span>
    </div>
  `;
}

async function loadChart() {
  const res = await fetch('/api/admin/attendance');
  const data = await res.json();
  const max = Math.max(...data.map(d => d.present));
  const bars = data.slice(0,14).reverse().map(d => {
    const h = Math.round((d.present / max) * 100);
    const label = d.date.slice(5);
    return `<div class="bar-item"><div class="bar" style="height:${h}%" title="Present: ${d.present}/${d.total}"></div><div class="bar-label">${label}</div></div>`;
  }).join('');
  document.getElementById('chart-bars').innerHTML = bars;
}

async function loadStudents() {
  const res = await fetch('/api/admin/students');
  allStudents = await res.json();
  renderStudents(allStudents);
}

function renderStudents(data) {
  const rows = data.map(s => `
    <tr>
      <td><span style="font-family:'DM Mono',monospace;font-size:.8rem;color:var(--text-muted)">${s.id}</span></td>
      <td style="font-weight:500">${s.name}</td>
      <td>${s.branch}</td>
      <td>${s.year}</td>
      <td>${s.email}</td>
      <td>${s.phone}</td>
      <td><span class="badge ${s.status==='Active'?'badge-success':'badge-danger'}">${s.status}</span></td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteStudent('${s.id}')">Delete</button></td>
    </tr>`).join('');
  document.getElementById('students-table').innerHTML = `
    <table>
      <thead><tr><th>ID</th><th>Name</th><th>Branch</th><th>Year</th><th>Email</th><th>Phone</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px">No students found</td></tr>'}</tbody>
    </table>`;
}

function filterStudents() {
  const q = document.getElementById('student-search').value.toLowerCase();
  renderStudents(allStudents.filter(s => s.name.toLowerCase().includes(q) || s.branch.toLowerCase().includes(q)));
}

async function deleteStudent(id) {
  if (!confirm('Delete this student?')) return;
  await fetch(`/api/admin/students/${id}`, {method:'DELETE'});
  await loadStudents();
}

async function loadFaculty() {
  const res = await fetch('/api/admin/faculty');
  const data = await res.json();
  const rows = data.map(f => `
    <tr>
      <td><span style="font-family:'DM Mono',monospace;font-size:.8rem;color:var(--text-muted)">${f.id}</span></td>
      <td style="font-weight:500">${f.name}</td>
      <td>${f.department}</td>
      <td>${f.email}</td>
      <td>${f.phone}</td>
      <td>${f.subjects.map(s=>`<span class="badge badge-primary" style="margin-right:4px">${s}</span>`).join('')}</td>
    </tr>`).join('');
  document.getElementById('faculty-table').innerHTML = `
    <table>
      <thead><tr><th>ID</th><th>Name</th><th>Department</th><th>Email</th><th>Phone</th><th>Subjects</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

async function loadAttendance() {
  const res = await fetch('/api/admin/attendance/full');
  allAttendance = await res.json();
  renderAttendance(allAttendance);
}

function renderAttendance(data) {
  const rows = data.slice(0,100).map(r => `
    <tr>
      <td>${r.date}</td>
      <td style="font-weight:500">${r.name}</td>
      <td><span style="font-family:'DM Mono',monospace;font-size:.78rem;color:var(--text-muted)">${r.student_id}</span></td>
      <td>${r.branch}</td>
      <td><span class="badge ${r.status==='Present'?'badge-success':'badge-danger'}">${r.status}</span></td>
    </tr>`).join('');
  document.getElementById('attendance-table').innerHTML = `
    <table>
      <thead><tr><th>Date</th><th>Student</th><th>ID</th><th>Branch</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function filterAttendance() {
  const branch = document.getElementById('att-filter').value;
  renderAttendance(branch ? allAttendance.filter(r => r.branch === branch) : allAttendance);
}

function openAddStudent() { document.getElementById('add-student-modal').classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

async function addStudent() {
  const name = document.getElementById('new-name').value.trim();
  const branch = document.getElementById('new-branch').value;
  const year = document.getElementById('new-year').value;
  const phone = document.getElementById('new-phone').value.trim();
  const email = document.getElementById('new-email').value.trim();
  if (!name || !email) { alert('Please fill in name and email.'); return; }
  await fetch('/api/admin/students', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,branch,year,phone,email})});
  closeModal('add-student-modal');
  await loadStudents();
}

function showSection(id) {
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.menu li').forEach(l => l.classList.remove('active'));
  document.querySelector(`.menu li[onclick="showSection('${id}')"]`).classList.add('active');
  const titles = {dashboard:'Dashboard Overview',students:'Students Management',faculty:'Faculty Management',attendance:'Attendance Records',settings:'System Settings'};
  document.getElementById('page-title').textContent = titles[id] || id;
  if (id==='students' && !allStudents.length) loadStudents();
  if (id==='faculty') loadFaculty();
  if (id==='attendance' && !allAttendance.length) loadAttendance();
}

init();
