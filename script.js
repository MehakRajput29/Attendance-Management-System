function showLogin(role) {
  document.getElementById('overlay').classList.add('active');
  document.getElementById(role + '-login').classList.add('active');
}
function closeLogin() {
  document.getElementById('overlay').classList.remove('active');
  document.querySelectorAll('.login-box').forEach(b => b.classList.remove('active'));
}
async function login(role) {
  const username = document.getElementById(role + '-username').value.trim();
  const password = document.getElementById(role + '-password').value.trim();
  const errEl = document.getElementById(role + '-error');
  errEl.textContent = '';
  if (!username || !password) { errEl.textContent = 'Please fill in all fields.'; return; }
  const btn = document.querySelector(`#${role}-login button`);
  btn.textContent = 'Signing in...'; btn.disabled = true;
  try {
    const res = await fetch('/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({role, username, password}) });
    const data = await res.json();
    if (data.success) {
      window.location.href = `/${data.role}-dashboard`;
    } else {
      errEl.textContent = 'Invalid credentials. Please try again.';
      btn.textContent = 'Sign In'; btn.disabled = false;
    }
  } catch(e) {
    errEl.textContent = 'Server error. Please try again.';
    btn.textContent = 'Sign In'; btn.disabled = false;
  }
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLogin(); });
