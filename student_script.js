let studentData=null;

async function init(){
  const res=await fetch('/api/student/me');
  studentData=await res.json();
  if(!studentData.profile){window.location='/';return;}
  const name=studentData.profile.name;
  document.getElementById('topbar-name').textContent=name;
  document.getElementById('student-sub').textContent=`Welcome back, ${name}`;
  renderOverview();
}

function renderOverview(){
  const d=studentData;
  const pctColor=d.attendance_pct>=75?'var(--success)':d.attendance_pct>=60?'var(--warning)':'var(--danger)';
  document.getElementById('overview-stats').innerHTML=`
    <div class="stat-card"><div class="stat-label">Attendance</div><div class="stat-value" style="color:${pctColor}">${d.attendance_pct}%</div><div class="stat-sub">${d.present_days} of ${d.present_days+d.absent_days} days</div><div class="stat-icon">📊</div></div>
    <div class="stat-card"><div class="stat-label">Present Days</div><div class="stat-value">${d.present_days}</div><div class="stat-icon">✅</div></div>
    <div class="stat-card"><div class="stat-label">Absent Days</div><div class="stat-value">${d.absent_days}</div><div class="stat-icon">❌</div></div>
    <div class="stat-card"><div class="stat-label">Branch</div><div class="stat-value" style="font-size:1rem;padding-top:12px">${d.profile.branch}</div><div class="stat-icon">🏫</div></div>`;
  document.getElementById('recent-att').innerHTML=d.recent_attendance.map(r=>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 20px;border-top:1px solid var(--border);font-size:.84rem;">
      <span>${r.date}</span>
      <span>${r.subject||'—'}</span>
      <span class="badge ${r.status==='Present'?'badge-success':'badge-danger'}">${r.status}</span>
    </div>`).join('');
  loadOverviewNotices();
}

async function loadOverviewNotices(){
  const res=await fetch('/api/student/notices');
  const data=await res.json();
  document.getElementById('overview-notices').innerHTML=data.slice(0,3).map(n=>`
    <div style="padding:11px 20px;border-top:1px solid var(--border);">
      <div style="font-weight:500;font-size:.85rem">${n.title}</div>
      <div style="font-size:.75rem;color:var(--text-muted);margin-top:3px">${n.posted_by} · ${(n.created_at||'').slice(0,10)}</div>
    </div>`).join('')||'<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:.85rem">No notices</div>';
}

async function loadAttendanceDetail(){
  const res=await fetch('/api/student/attendance/full');
  const data=await res.json();
  const p=studentData;
  const pctColor=p.attendance_pct>=75?'var(--success)':p.attendance_pct>=60?'var(--warning)':'var(--danger)';
  const rows=data.map(r=>`<tr>
    <td style="font-family:'DM Mono',monospace;font-size:.8rem">${r.date}</td>
    <td>${r.subject||'—'}</td>
    <td>${r.marked_by||'—'}</td>
    <td><span class="badge ${r.status==='Present'?'badge-success':'badge-danger'}">${r.status}</span></td>
  </tr>`).join('');
  document.getElementById('attendance-detail').innerHTML=`
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:22px;margin-bottom:20px;display:flex;gap:32px;align-items:center;">
      <div style="text-align:center;min-width:130px">
        <div style="font-size:3.5rem;font-weight:800;color:${pctColor}">${p.attendance_pct}%</div>
        <div style="font-size:.78rem;color:var(--text-muted);margin-bottom:8px">Overall Attendance</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${p.attendance_pct}%"></div></div>
        ${p.attendance_pct<75?'<div style="font-size:.72rem;color:var(--danger);margin-top:6px">⚠️ Below 75% threshold</div>':'<div style="font-size:.72rem;color:var(--success);margin-top:6px">✅ Good standing</div>'}
      </div>
      <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div style="background:rgba(16,185,129,.08);border-radius:12px;padding:16px;text-align:center"><div style="font-size:1.8rem;font-weight:700;color:var(--success)">${p.present_days}</div><div style="font-size:.78rem;color:var(--text-muted)">Days Present</div></div>
        <div style="background:rgba(239,68,68,.08);border-radius:12px;padding:16px;text-align:center"><div style="font-size:1.8rem;font-weight:700;color:var(--danger)">${p.absent_days}</div><div style="font-size:.78rem;color:var(--text-muted)">Days Absent</div></div>
      </div>
    </div>
    <div class="table-wrap"><div class="table-header"><h3>Full Attendance Log</h3></div>
    <table><thead><tr><th>Date</th><th>Subject</th><th>Marked By</th><th>Status</th></tr></thead>
    <tbody>${rows||'<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-muted)">No records found</td></tr>'}</tbody></table></div>`;
}

async function loadNotices(){
  const res=await fetch('/api/student/notices');
  const data=await res.json();
  document.getElementById('notices-list').innerHTML=data.map(n=>`
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px 24px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <h3 style="font-size:.95rem;font-weight:600">${n.title}</h3>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="badge ${n.role==='admin'?'badge-danger':'badge-primary'}">${n.role}</span>
          <span style="font-size:.72rem;color:var(--text-muted)">${(n.created_at||'').slice(0,10)}</span>
        </div>
      </div>
      <p style="font-size:.85rem;color:var(--text-muted);line-height:1.6">${n.body}</p>
      <div style="margin-top:6px;font-size:.75rem;color:var(--text-muted)">— ${n.posted_by}</div>
    </div>`).join('')||'<div style="text-align:center;padding:40px;color:var(--text-muted)">No notices yet.</div>';
}

async function loadResources(){
  const res=await fetch('/api/student/files');
  const data=await res.json();
  const rows=data.map(f=>`<tr>
    <td style="font-weight:500">${f.original_name}</td>
    <td>${f.uploaded_by}</td>
    <td>${f.description||'—'}</td>
    <td><span class="badge badge-primary">.${f.file_type}</span></td>
    <td style="font-size:.78rem;color:var(--text-muted)">${(f.created_at||'').slice(0,10)}</td>
    <td><a href="/uploads/${f.filename}" class="btn btn-success btn-sm" download>⬇ Download</a></td>
  </tr>`).join('');
  document.getElementById('resources-table').innerHTML=`<table>
    <thead><tr><th>File Name</th><th>Uploaded By</th><th>Description</th><th>Type</th><th>Date</th><th>Action</th></tr></thead>
    <tbody>${rows||'<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">No files available yet</td></tr>'}</tbody></table>`;
}

function loadTimetable(){
  const days=[
    {day:'Monday',slots:['Machine Learning — 9:00 AM','Statistics — 11:00 AM','Lab — 2:00 PM']},
    {day:'Tuesday',slots:['Deep Learning — 10:00 AM','Data Mining — 12:00 PM']},
    {day:'Wednesday',slots:['NLP — 9:00 AM','Computer Vision — 11:00 AM','Lab — 2:00 PM']},
    {day:'Thursday',slots:['Algorithms — 9:00 AM','OS — 11:00 AM']},
    {day:'Friday',slots:['Machine Learning — 10:00 AM','Seminar — 2:00 PM']},
  ];
  const todayDay=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];
  document.getElementById('timetable-grid').innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px">${
    days.map(d=>`<div style="background:var(--surface);border:1px solid ${d.day===todayDay?'var(--primary)':'var(--border)'};border-radius:14px;padding:18px;${d.day===todayDay?'box-shadow:0 0 0 1px var(--primary)':''}">
      <div style="font-weight:700;margin-bottom:12px;font-size:.9rem">${d.day===todayDay?'📍':'📅'} ${d.day} ${d.day===todayDay?'<span class="badge badge-primary">Today</span>':''}</div>
      ${d.slots.map(s=>`<div style="background:var(--bg);border-radius:8px;padding:8px 10px;margin-bottom:6px;font-size:.8rem;color:var(--text-muted)">${s}</div>`).join('')}
    </div>`).join('')
  }</div>`;
}

function loadProfile(){
  const p=studentData.profile;
  document.getElementById('profile-content').innerHTML=`
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px;">
      <div style="text-align:center;margin-bottom:24px">
        <div style="width:70px;height:70px;background:linear-gradient(135deg,var(--primary),var(--accent));border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2rem;margin:0 auto 12px">🎓</div>
        <h2 style="font-size:1.2rem">${p.name}</h2>
        <p style="color:var(--text-muted);font-size:.85rem">${p.branch} · ${p.year} Year</p>
      </div>
      ${[['Student ID',p.student_id],['Email',p.email],['Phone',p.phone||'—'],['Branch',p.branch],['Year',p.year+' Year'],['Status',`<span class="badge ${p.status==='Active'?'badge-success':'badge-danger'}">${p.status}</span>`]].map(([k,v])=>`
      <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:.88rem;align-items:center">
        <span style="color:var(--text-muted)">${k}</span><span style="font-weight:500">${v}</span>
      </div>`).join('')}
    </div>`;
}

async function changePassword(){
  const cur=document.getElementById('cur-pass').value;
  const nw=document.getElementById('new-pass').value;
  const conf=document.getElementById('conf-pass').value;
  const msg=document.getElementById('pass-msg');
  if(!cur||!nw||!conf){msg.style.color='var(--danger)';msg.textContent='All fields required.';return;}
  if(nw!==conf){msg.style.color='var(--danger)';msg.textContent='Passwords do not match.';return;}
  const res=await fetch('/api/change-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({current:cur,new:nw})});
  const d=await res.json();
  msg.style.color=d.success?'var(--success)':'var(--danger)';
  msg.textContent=d.success?'✅ Password updated!':(d.message||'Error');
}

function showSection(id){
  document.querySelectorAll('.content-section').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.menu li').forEach(l=>l.classList.remove('active'));
  document.querySelector(`.menu li[onclick="showSection('${id}')"]`).classList.add('active');
  const titles={overview:'Dashboard Overview',attendance:'My Attendance',notices:'Notices',resources:'Study Resources',timetable:'Weekly Timetable',profile:'My Profile'};
  document.getElementById('page-title').textContent=titles[id]||id;
  if(id==='attendance')loadAttendanceDetail();
  if(id==='notices')loadNotices();
  if(id==='resources')loadResources();
  if(id==='timetable')loadTimetable();
  if(id==='profile')loadProfile();
}

init();
