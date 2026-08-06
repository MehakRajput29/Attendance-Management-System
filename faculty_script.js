let facultyData=null, attStudents=[];

async function init(){
  const res=await fetch('/api/faculty/me');
  facultyData=await res.json();
  document.getElementById('topbar-name').textContent=facultyData.name;
  document.getElementById('faculty-sub').textContent=`Welcome back, ${facultyData.name}`;
  document.getElementById('dept-val').textContent=facultyData.department||'—';
  document.getElementById('att-date').value=new Date().toISOString().split('T')[0];
  const sRes=await fetch('/api/faculty/students');
  const students=await sRes.json();
  document.getElementById('students-count').textContent=students.length;
  loadSchedule();
  loadOverviewNotices();
}

function loadSchedule(){
  const items=[
    {time:'9:00 AM',name:'Machine Learning — AI 3rd',done:true},
    {time:'11:00 AM',name:'Statistics — DS 2nd',done:false},
    {time:'2:00 PM',name:'Data Mining Lab',done:false},
  ];
  document.getElementById('schedule-list').innerHTML=items.map(i=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:11px 20px;border-top:1px solid var(--border);font-size:.84rem;">
      <div><span style="color:var(--text-muted);margin-right:12px">${i.time}</span><span style="font-weight:500">${i.name}</span></div>
      <span class="badge ${i.done?'badge-success':'badge-warning'}">${i.done?'Done':'Upcoming'}</span>
    </div>`).join('');
}

async function loadOverviewNotices(){
  const res=await fetch('/api/faculty/notices');
  const data=await res.json();
  document.getElementById('overview-notices').innerHTML=data.slice(0,3).map(n=>`
    <div style="padding:11px 20px;border-top:1px solid var(--border);">
      <div style="font-weight:500;font-size:.85rem">${n.title}</div>
      <div style="font-size:.75rem;color:var(--text-muted);margin-top:3px">${n.posted_by} · ${(n.created_at||'').slice(0,10)}</div>
    </div>`).join('')||'<div style="padding:20px;color:var(--text-muted);font-size:.85rem;text-align:center">No notices</div>';
}

async function loadAttList(){
  const d=document.getElementById('att-date').value;
  const res=await fetch(`/api/faculty/attendance/date?date=${d}`);
  attStudents=await res.json();
  const rows=attStudents.map(s=>`
    <div class="att-row">
      <div><div class="att-name">${s.name}</div><div class="att-branch">${s.branch} · ${s.id}</div></div>
      <div class="att-toggle">
        <label><input type="radio" name="att_${s.id}" value="Present" ${s.status==='Present'?'checked':''}><span class="opt-present">✅ Present</span></label>
        <label><input type="radio" name="att_${s.id}" value="Absent" ${s.status==='Absent'?'checked':''}><span class="opt-absent">❌ Absent</span></label>
      </div>
    </div>`).join('');
  document.getElementById('att-list-wrap').innerHTML=`<div class="att-list">${rows||'<p style="color:var(--text-muted);padding:16px">No students found.</p>'}</div>`;
}

function markAll(status){
  attStudents.forEach(s=>{
    const r=document.querySelector(`input[name="att_${s.id}"][value="${status}"]`);
    if(r) r.checked=true;
  });
}

async function saveAttendance(){
  if(!attStudents.length){alert('Load students first.');return;}
  const date=document.getElementById('att-date').value;
  const subject=document.getElementById('att-subject').value;
  const records={};
  attStudents.forEach(s=>{
    const r=document.querySelector(`input[name="att_${s.id}"]:checked`);
    if(r) records[s.id]=r.value;
  });
  const res=await fetch('/api/faculty/attendance/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date,subject,records})});
  const d=await res.json();
  const msg=document.getElementById('save-msg');
  msg.style.display='block';
  msg.innerHTML=`<div style="background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.3);border-radius:10px;padding:10px 16px;color:#34d399;font-size:.85rem">✅ Attendance saved for ${d.saved} students on ${date} (${subject})</div>`;
  setTimeout(()=>msg.style.display='none',4000);
}

async function loadReports(){
  const res=await fetch('/api/faculty/reports');
  const data=await res.json();
  const rows=data.map(s=>{
    const color=s.pct>=75?'badge-success':s.pct>=60?'badge-warning':'badge-danger';
    return `<tr>
      <td style="font-family:'DM Mono',monospace;font-size:.78rem;color:var(--text-muted)">${s.id}</td>
      <td style="font-weight:500">${s.name}</td><td>${s.branch}</td>
      <td>${s.present}</td><td>${s.total-s.present}</td>
      <td><div style="display:flex;align-items:center;gap:8px"><div class="progress-bar" style="width:80px"><div class="progress-fill" style="width:${s.pct}%"></div></div><span class="badge ${color}">${s.pct}%</span></div></td>
    </tr>`;
  }).join('');
  document.getElementById('reports-content').innerHTML=`<div class="table-wrap"><table>
    <thead><tr><th>ID</th><th>Name</th><th>Branch</th><th>Present</th><th>Absent</th><th>Attendance %</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}

async function loadStudentsTable(){
  const res=await fetch('/api/faculty/students');
  const data=await res.json();
  const rows=data.map(s=>`<tr>
    <td style="font-family:'DM Mono',monospace;font-size:.78rem;color:var(--text-muted)">${s.student_id}</td>
    <td style="font-weight:500">${s.name}</td><td>${s.branch}</td><td>${s.year}</td><td>${s.email}</td>
    <td><span class="badge ${s.status==='Active'?'badge-success':'badge-danger'}">${s.status}</span></td>
  </tr>`).join('');
  document.getElementById('students-table-wrap').innerHTML=`<div class="table-wrap"><table>
    <thead><tr><th>ID</th><th>Name</th><th>Branch</th><th>Year</th><th>Email</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}

async function uploadFile(){
  const fi=document.getElementById('file-input');
  const desc=document.getElementById('file-desc').value;
  const msg=document.getElementById('upload-msg');
  if(!fi.files[0]){msg.style.color='var(--danger)';msg.textContent='Please select a file.';return;}
  const fd=new FormData();
  fd.append('file',fi.files[0]);
  fd.append('description',desc);
  msg.style.color='var(--text-muted)';msg.textContent='Uploading...';
  const res=await fetch('/api/faculty/upload',{method:'POST',body:fd});
  const d=await res.json();
  if(d.success){
    msg.style.color='var(--success)';msg.textContent=`✅ "${d.filename}" uploaded successfully!`;
    fi.value='';document.getElementById('file-desc').value='';
    loadMyFiles();
  } else {
    msg.style.color='var(--danger)';msg.textContent=d.message||'Upload failed.';
  }
}

async function loadMyFiles(){
  const res=await fetch('/api/faculty/files');
  const data=await res.json();
  if(!data.length){document.getElementById('my-files').innerHTML='<div style="padding:20px;color:var(--text-muted);font-size:.85rem;text-align:center">No files uploaded yet.</div>';return;}
  document.getElementById('my-files').innerHTML=data.map(f=>`
    <div style="padding:11px 20px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-weight:500;font-size:.85rem">${f.original_name}</div>
        <div style="font-size:.75rem;color:var(--text-muted)">${f.description||'No description'} · ${(f.created_at||'').slice(0,10)}</div>
      </div>
      <a href="/uploads/${f.filename}" class="btn btn-success btn-sm" download>⬇</a>
    </div>`).join('');
}

async function loadNotices(){
  const res=await fetch('/api/faculty/notices');
  const data=await res.json();
  document.getElementById('notices-list').innerHTML=data.map(n=>`
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px 24px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <h3 style="font-size:.95rem;font-weight:600">${n.title}</h3>
        <div style="display:flex;align-items:center;gap:8px"><span class="badge ${n.role==='admin'?'badge-danger':'badge-primary'}">${n.role}</span><span style="font-size:.72rem;color:var(--text-muted)">${(n.created_at||'').slice(0,10)}</span></div>
      </div>
      <p style="font-size:.85rem;color:var(--text-muted);line-height:1.6">${n.body}</p>
      <div style="margin-top:6px;font-size:.75rem;color:var(--text-muted)">— ${n.posted_by}</div>
    </div>`).join('')||'<div style="text-align:center;padding:40px;color:var(--text-muted)">No notices</div>';
}

function openNoticeModal(){document.getElementById('notice-modal').classList.add('active');}
async function postNotice(){
  const title=document.getElementById('n-title').value.trim();
  const body=document.getElementById('n-body').value.trim();
  if(!title||!body){alert('Fill in both fields.');return;}
  await fetch('/api/faculty/notices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,body})});
  document.getElementById('notice-modal').classList.remove('active');
  document.getElementById('n-title').value='';document.getElementById('n-body').value='';
  loadNotices();
}

function loadProfile(){
  const f=facultyData;
  document.getElementById('profile-content').innerHTML=`
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px;">
      <div style="text-align:center;margin-bottom:24px">
        <div style="width:70px;height:70px;background:linear-gradient(135deg,var(--primary),var(--accent));border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2rem;margin:0 auto 12px">👩‍🏫</div>
        <h2 style="font-size:1.2rem">${f.name}</h2>
        <p style="color:var(--text-muted);font-size:.85rem">${f.department} Department</p>
      </div>
      ${[['Faculty ID',f.faculty_id],['Email',f.email],['Phone',f.phone||'—'],['Department',f.department],['Subjects',(f.subjects||'').split(',').map(s=>`<span class="badge badge-primary" style="margin:2px">${s.trim()}</span>`).join(' ')]].map(([k,v])=>`
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
  if(nw!==conf){msg.style.color='var(--danger)';msg.textContent='New passwords do not match.';return;}
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
  const titles={overview:'Dashboard Overview',markAttendance:'Mark Attendance',viewReports:'Attendance Reports',students:'All Students',uploadFiles:'Upload Files',notices:'Notices',profile:'My Profile'};
  document.getElementById('page-title').textContent=titles[id]||id;
  if(id==='viewReports')loadReports();
  if(id==='students')loadStudentsTable();
  if(id==='uploadFiles'){loadMyFiles();}
  if(id==='notices')loadNotices();
  if(id==='profile')loadProfile();
}

init();
