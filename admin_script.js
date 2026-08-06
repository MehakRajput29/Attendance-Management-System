let allStudents=[], allFaculty=[];

async function init() {
  const res = await fetch('/api/admin/stats');
  const d = await res.json();
  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card"><div class="stat-label">Total Students</div><div class="stat-value">${d.total_students}</div><div class="stat-icon">🎓</div></div>
    <div class="stat-card"><div class="stat-label">Total Faculty</div><div class="stat-value">${d.total_faculty}</div><div class="stat-icon">👩‍🏫</div></div>
    <div class="stat-card"><div class="stat-label">Avg Attendance</div><div class="stat-value">${d.attendance_avg}%</div><div class="stat-icon">📊</div></div>
    <div class="stat-card"><div class="stat-label">Notices</div><div class="stat-value">${d.notices}</div><div class="stat-icon">📢</div></div>
    <div class="stat-card"><div class="stat-label">Files</div><div class="stat-value">${d.files}</div><div class="stat-icon">📁</div></div>`;
  document.getElementById('today-summary').innerHTML = `
    <div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:space-between;font-size:.85rem;"><span style="color:var(--text-muted)">Present</span><span class="badge badge-success">${d.present_today}</span></div>
    <div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:space-between;font-size:.85rem;"><span style="color:var(--text-muted)">Absent</span><span class="badge badge-danger">${d.absent_today}</span></div>
    <div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:space-between;font-size:.85rem;"><span style="color:var(--text-muted)">Total</span><span class="badge badge-primary">${d.total_students}</span></div>
    <div style="padding:12px 20px;border-top:1px solid var(--border);">
      <div class="progress-bar"><div class="progress-fill" style="width:${Math.round(d.present_today/Math.max(d.total_students,1)*100)}%"></div></div>
    </div>`;
  loadChart();
}

async function loadChart() {
  const res = await fetch('/api/admin/attendance');
  const data = await res.json();
  if(!data.length){document.getElementById('chart-bars').innerHTML='<p style="color:var(--text-muted);font-size:.8rem">No data</p>';return;}
  const max = Math.max(...data.map(d=>d.present),1);
  const bars = [...data].reverse().map(d=>{
    const h = Math.round((d.present/max)*100);
    return `<div class="bar-item"><div class="bar" style="height:${h}%" title="Present:${d.present}/${d.total} on ${d.date}"></div><div class="bar-label">${d.date.slice(5)}</div></div>`;
  }).join('');
  document.getElementById('chart-bars').innerHTML=bars;
}

async function loadStudents() {
  const res = await fetch('/api/admin/students');
  allStudents = await res.json();
  document.getElementById('student-count').textContent=`All Students (${allStudents.length})`;
  renderStudents(allStudents);
}

function renderStudents(data) {
  const rows = data.map(s=>`<tr>
    <td><span style="font-family:'DM Mono',monospace;font-size:.78rem;color:var(--text-muted)">${s.student_id}</span></td>
    <td style="font-weight:500">${s.name}</td>
    <td>${s.branch}</td><td>${s.year}</td><td>${s.email}</td><td>${s.phone||'—'}</td>
    <td><span class="badge ${s.status==='Active'?'badge-success':'badge-danger'}">${s.status}</span></td>
    <td><button class="btn btn-danger btn-sm" onclick="deleteStudent('${s.student_id}')">Delete</button></td>
  </tr>`).join('');
  document.getElementById('students-table').innerHTML=`<table>
    <thead><tr><th>ID</th><th>Name</th><th>Branch</th><th>Year</th><th>Email</th><th>Phone</th><th>Status</th><th>Action</th></tr></thead>
    <tbody>${rows||'<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted)">No students found</td></tr>'}</tbody></table>`;
}

function filterStudents(){
  const q=document.getElementById('student-search').value.toLowerCase();
  renderStudents(allStudents.filter(s=>s.name.toLowerCase().includes(q)||s.branch.toLowerCase().includes(q)||(s.student_id||'').toLowerCase().includes(q)));
}

async function deleteStudent(sid){
  if(!confirm(`Delete student ${sid}? This also deletes their attendance records.`))return;
  await fetch(`/api/admin/students/${sid}`,{method:'DELETE'});
  await loadStudents();
}

async function addStudent(){
  const name=document.getElementById('s-name').value.trim();
  const branch=document.getElementById('s-branch').value;
  const year=document.getElementById('s-year').value;
  const phone=document.getElementById('s-phone').value.trim();
  const email=document.getElementById('s-email').value.trim();
  const msg=document.getElementById('add-student-msg');
  if(!name||!email){msg.style.color='var(--danger)';msg.textContent='Name and email are required.';return;}
  const res=await fetch('/api/admin/students',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,branch,year,phone,email})});
  const d=await res.json();
  if(d.success){
    msg.style.color='var(--success)';
    msg.textContent=`✅ Added! Login: ${d.username} / ${d.default_password}`;
    setTimeout(()=>{closeModal('add-student-modal');msg.textContent='';},3000);
    await loadStudents();
    ['s-name','s-phone','s-email'].forEach(id=>document.getElementById(id).value='');
  } else {
    msg.style.color='var(--danger)';msg.textContent=d.message||'Error adding student.';
  }
}

async function loadFaculty(){
  const res=await fetch('/api/admin/faculty');
  allFaculty=await res.json();
  document.getElementById('faculty-count').textContent=`All Faculty (${allFaculty.length})`;
  const rows=allFaculty.map(f=>`<tr>
    <td><span style="font-family:'DM Mono',monospace;font-size:.78rem;color:var(--text-muted)">${f.faculty_id}</span></td>
    <td style="font-weight:500">${f.name}</td><td>${f.department}</td><td>${f.email}</td><td>${f.phone||'—'}</td>
    <td>${(f.subjects||'').split(',').map(s=>`<span class="badge badge-primary" style="margin:2px">${s.trim()}</span>`).join('')}</td>
    <td><button class="btn btn-danger btn-sm" onclick="deleteFaculty('${f.faculty_id}')">Delete</button></td>
  </tr>`).join('');
  document.getElementById('faculty-table').innerHTML=`<table>
    <thead><tr><th>ID</th><th>Name</th><th>Dept</th><th>Email</th><th>Phone</th><th>Subjects</th><th>Action</th></tr></thead>
    <tbody>${rows}</tbody></table>`;
}

async function addFaculty(){
  const name=document.getElementById('f-name').value.trim();
  const department=document.getElementById('f-dept').value;
  const email=document.getElementById('f-email').value.trim();
  const phone=document.getElementById('f-phone').value.trim();
  const subjects=document.getElementById('f-subjects').value.trim();
  const msg=document.getElementById('add-faculty-msg');
  if(!name||!email){msg.style.color='var(--danger)';msg.textContent='Name and email are required.';return;}
  const res=await fetch('/api/admin/faculty',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,department,email,phone,subjects})});
  const d=await res.json();
  if(d.success){
    msg.style.color='var(--success)';
    msg.textContent=`✅ Added! Login: ${d.username} / ${d.default_password}`;
    setTimeout(()=>{closeModal('add-faculty-modal');msg.textContent='';},3000);
    await loadFaculty();
  } else {
    msg.style.color='var(--danger)';msg.textContent=d.message||'Error adding faculty.';
  }
}

async function deleteFaculty(fid){
  if(!confirm(`Delete faculty ${fid}?`))return;
  await fetch(`/api/admin/faculty/${fid}`,{method:'DELETE'});
  await loadFaculty();
}

async function loadAttendance(){
  const branch=document.getElementById('att-filter').value;
  const res=await fetch('/api/admin/attendance/full?branch='+branch);
  const data=await res.json();
  const rows=data.map(r=>`<tr>
    <td style="font-family:'DM Mono',monospace;font-size:.78rem">${r.date}</td>
    <td style="font-weight:500">${r.name}</td>
    <td><span style="font-family:'DM Mono',monospace;font-size:.75rem;color:var(--text-muted)">${r.student_id}</span></td>
    <td>${r.branch}</td>
    <td>${r.subject||'—'}</td>
    <td><span class="badge ${r.status==='Present'?'badge-success':'badge-danger'}">${r.status}</span></td>
  </tr>`).join('');
  document.getElementById('attendance-table').innerHTML=`<table>
    <thead><tr><th>Date</th><th>Student</th><th>ID</th><th>Branch</th><th>Subject</th><th>Status</th></tr></thead>
    <tbody>${rows||'<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">No records</td></tr>'}</tbody></table>`;
}

async function loadNotices(){
  const res=await fetch('/api/admin/notices');
  const data=await res.json();
  if(!data.length){document.getElementById('notices-list').innerHTML='<div style="text-align:center;padding:40px;color:var(--text-muted)">No notices yet.</div>';return;}
  document.getElementById('notices-list').innerHTML=data.map(n=>`
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px 24px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
        <h3 style="font-size:.95rem;font-weight:600">${n.title}</h3>
        <div style="display:flex;gap:8px;align-items:center">
          <span style="font-size:.72rem;color:var(--text-muted)">${n.created_at?.slice(0,10)||''}</span>
          <button class="btn btn-danger btn-sm" onclick="deleteNotice(${n.id})">✕</button>
        </div>
      </div>
      <p style="font-size:.85rem;color:var(--text-muted);line-height:1.6">${n.body}</p>
      <div style="margin-top:8px;font-size:.75rem;color:var(--text-muted)">Posted by: <strong>${n.posted_by}</strong></div>
    </div>`).join('');
}

async function addNotice(){
  const title=document.getElementById('n-title').value.trim();
  const body=document.getElementById('n-body').value.trim();
  if(!title||!body){alert('Please fill in both fields.');return;}
  await fetch('/api/admin/notices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,body})});
  closeModal('add-notice-modal');
  document.getElementById('n-title').value='';document.getElementById('n-body').value='';
  await loadNotices();
}

async function deleteNotice(id){
  if(!confirm('Delete this notice?'))return;
  await fetch(`/api/admin/notices/${id}`,{method:'DELETE'});
  await loadNotices();
}

async function loadFiles(){
  const res=await fetch('/api/admin/files');
  const data=await res.json();
  const rows=data.map(f=>`<tr>
    <td style="font-weight:500">${f.original_name}</td>
    <td>${f.uploaded_by}</td>
    <td><span class="badge badge-primary">${f.role}</span></td>
    <td>${f.description||'—'}</td>
    <td><span class="badge badge-primary">.${f.file_type}</span></td>
    <td style="font-size:.78rem;color:var(--text-muted)">${Math.round((f.file_size||0)/1024)}KB</td>
    <td style="font-size:.78rem;color:var(--text-muted)">${(f.created_at||'').slice(0,10)}</td>
    <td><a href="/uploads/${f.filename}" class="btn btn-success btn-sm" download>⬇ Download</a></td>
  </tr>`).join('');
  document.getElementById('files-table').innerHTML=`<table>
    <thead><tr><th>Filename</th><th>Uploaded By</th><th>Role</th><th>Description</th><th>Type</th><th>Size</th><th>Date</th><th>Action</th></tr></thead>
    <tbody>${rows||'<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted)">No files uploaded yet</td></tr>'}</tbody></table>`;
}

async function changePassword(){
  const cur=document.getElementById('cur-pass').value;
  const nw=document.getElementById('new-pass').value;
  const conf=document.getElementById('conf-pass').value;
  const msg=document.getElementById('pass-msg');
  if(!cur||!nw||!conf){msg.style.color='var(--danger)';msg.textContent='All fields required.';return;}
  if(nw!==conf){msg.style.color='var(--danger)';msg.textContent='New passwords do not match.';return;}
  const res=await fetch('/api/change-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({current:cur,new:nw})});
  const d=await res.json();
  msg.style.color=d.success?'var(--success)':'var(--danger)';
  msg.textContent=d.success?'✅ Password updated successfully!':(d.message||'Error');
}

function openModal(id){document.getElementById(id).classList.add('active');}
function closeModal(id){document.getElementById(id).classList.remove('active');}

function showSection(id){
  document.querySelectorAll('.content-section').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.menu li').forEach(l=>l.classList.remove('active'));
  document.querySelector(`.menu li[onclick="showSection('${id}')"]`).classList.add('active');
  const titles={dashboard:'Dashboard Overview',students:'Students Management',faculty:'Faculty Management',attendance:'Attendance Records',notices:'Notices & Announcements',files:'Uploaded Files',settings:'Settings'};
  document.getElementById('page-title').textContent=titles[id]||id;
  if(id==='students')loadStudents();
  if(id==='faculty')loadFaculty();
  if(id==='attendance')loadAttendance();
  if(id==='notices')loadNotices();
  if(id==='files')loadFiles();
}

init();
