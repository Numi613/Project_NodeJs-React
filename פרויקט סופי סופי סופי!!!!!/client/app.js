// Client JS: talks to server at http://localhost:3000
const API_BASE = 'http://localhost:3000';

function parseJwt (token) {
  try{
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join('')));
  }catch(e){return null}
}

async function request(path, method='GET', body=null, useAuth=true){
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');
  if(useAuth && token){ headers['Authorization'] = `Bearer ${token}` }
  const res = await fetch(API_BASE + path, { method, headers, body: body? JSON.stringify(body): undefined });
  const text = await res.text();
  try{ return { status: res.status, data: JSON.parse(text) } }catch{ return { status: res.status, data: text } }
}

// UI helpers
function show(el, ok){ el.style.display = ok? 'block':'none' }
function by(id){ return document.getElementById(id) }

// Assignments cache to avoid repeated fetches for titles
let assignmentsCache = null;
// visibility toggles for UI sections
let assignmentsHidden = false;
let mySubsHidden = false;
let allSubsHidden = true; // Start hidden for teacher submissions
async function fetchAssignmentsMap(force = false){
  if(assignmentsCache && !force) return assignmentsCache;
  const res = await request('/student/assignments','GET');
  const map = {};
  if(res.status===200 && Array.isArray(res.data)){
    res.data.forEach(a => map[String(a._id || a.assignment_id || a.id)] = a.title || a.name);
  }
  assignmentsCache = map;
  return assignmentsCache;
}

// simple toast for success/error messages
function showToast(text, type='info'){
  const t = by('toast');
  if(!t) return; t.textContent = text; t.className = 'toast';
  if(type==='success') t.classList.add('toast-success');
  if(type==='error') t.classList.add('toast-error');
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>{ t.classList.add('hidden'); }, 3000);
}

// Auth flows
function generateUserId(){
  // simple 24-hex string (Mongo-style ObjectId)
  return Array.from({length:24},()=> Math.floor(Math.random()*16).toString(16)).join('');
}

async function register(){
  const user_id = by('regUserId')?.value.trim();
  const name = by('regName').value.trim();
  const email = by('regEmail').value.trim();
  const password = by('regPassword').value;
  const role = by('regRole').value;

  // clear previous user id error
  const uidErr = by('regUserIdErr'); if(uidErr){ uidErr.classList.add('hidden'); uidErr.textContent = ''; }

  if(!user_id || !/^[a-f0-9]{24}$/i.test(user_id)){
    if(uidErr){ uidErr.classList.remove('hidden'); uidErr.textContent = 'Provide a valid user id (24 hex characters)'; }
    return;
  }

  const res = await request('/identification/register','POST',{user_id,name,email,password,role}, false);

  if(res.status===201){
    by('regMsg').textContent = '✅ Registration successful! You can now log in.';
    by('regMsg').style.color = '#10b981';
    by('regMsg').style.fontWeight = '600';
    showToast('Registration successful! Please log in.', 'success');
    // prefill login name for convenience
    by('loginName').value = name;
    // Auto-switch to login form
    setTimeout(() => {
      by('registerForm').dataset.open = 'false';
      by('loginForm').dataset.open = 'true';
      updateUI();
      by('loginName').focus();
    }, 1500);
  } else {
    by('regMsg').textContent = res.data?.message || 'Error';
  }
} 


async function login(){
  const name = by('loginName').value.trim();
  const password = by('loginPassword').value;
  const res = await request('/identification/login','POST',{name,password}, false);
  if(res.status===200 && res.data?.token){
    localStorage.setItem('token', res.data.token);
    // store display name locally (server login returns id and email but not name)
    localStorage.setItem('userName', name);
    by('loginMsg').textContent = 'Logged in';
    // Clear any cached data from previous user
    assignmentsCache = null;
    by('mySubsList').innerHTML = '';
    by('assignmentsList').innerHTML = '';
    updateUI();
  } else {
    by('loginMsg').textContent = res.data?.message || 'Login failed';
  }
}

function logout(){
  localStorage.removeItem('token');
  localStorage.removeItem('userName');
  // Clear all cached data when logging out
  assignmentsCache = null;
  by('mySubsList').innerHTML = '';
  by('assignmentsList').innerHTML = '';
  updateUI();
}

// Student functions
async function loadAssignments(){
  const res = await request('/student/assignments','GET');
  const ul = by('assignmentsList'); ul.innerHTML = '';
  if(!(res.status===200 && Array.isArray(res.data))){ by('assignmentsList').innerHTML = '<div class="small-muted">Error loading assignments</div>'; return }
  const list = res.data;
  show(by('assignmentsEmpty'), list.length === 0);

  list.forEach(a=>{
    const li = document.createElement('li');
    const title = a.title || a.name || '(no title)';
    const due = a.dueDate ? new Date(a.dueDate).toLocaleDateString() : 'No due date';
    const isOpen = a.isOpen !== undefined ? a.isOpen : (a.dueDate ? (new Date(a.dueDate) >= new Date()) : true);
    const id = a._id || a.assignment_id || a.id || '';

    li.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div>
          <div style="font-weight:700">${escapeHtml(title)}</div>
          <div class="meta">Due: ${due} • ${isOpen? '<span class="role-badge">Open</span>':'<span class="small-muted">Closed</span>'}</div>
        </div>
        <div style="text-align:right">
          <div class="small-muted">ID: ${shortId(id)}</div>
          <button class="btn small" data-assignmentid="${escapeHtml(String(id))}">Submit</button>
        </div>
      </div>
    `;
    ul.appendChild(li);
  })

  // attach quick submit handlers
  Array.from(ul.querySelectorAll('button[data-assignmentid]')).forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const as = btn.getAttribute('data-assignmentid');
      by('submitAssignmentId').value = as;
      by('submitGithubLink').focus();
    })
  })
}

function shortId(id){ return id? String(id).slice(0,8) : '' }

async function submitAssignment(){
  const token = localStorage.getItem('token');
  const payload = token? parseJwt(token): null;
  // try several common keys
  const studentId = payload?.user_id || payload?.userId || payload?._id || null;
  const assignmentId = by('submitAssignmentId').value.trim();
  let githubLink = by('submitGithubLink').value.trim();
  const partner = by('submitPartner') ? by('submitPartner').value.trim() : '';
  const submitBtn = by('submitBtn');

  // basic validations
  if(!studentId){ by('submitMsg').textContent = 'You must be logged in as a student to submit.'; return }
  if(!assignmentId){ by('submitMsg').textContent = 'Provide an assignment id (use the Submit button on an assignment to autofill).'; return }
  if(!/^[a-f0-9]{8,24}$/i.test(assignmentId)){
    by('submitMsg').textContent = 'Assignment id looks invalid — use the Submit button next to an assignment.'; return
  }
  if(!githubLink){ by('submitMsg').textContent = 'Provide a GitHub repo link or path (e.g. username/repo or https://github.com/...)'; return }

  // normalize GitHub link: accept "user/repo" and prefix github.com
  if(!/^https?:\/\//i.test(githubLink)){
    if(/^[\w-]+\/[\w-\.]+$/.test(githubLink)){
      githubLink = 'https://github.com/' + githubLink;
    } else if(/github\.com\//i.test(githubLink)){
      githubLink = 'https://' + githubLink.replace(/^https?:\/\//i,'');
    } else {
      // leave as-is but warn the user
      console.warn('Submitting non-URL github link:', githubLink);
    }
  }

  submitBtn.disabled = true; submitBtn.classList.add('disabled');
  const body = { assignment_id: assignmentId, githubLink };
  if(partner) body.partner = partner;
  const res = await request(`/student/submissions`,'POST', body);
  submitBtn.disabled = false; submitBtn.classList.remove('disabled');

  if(res.status===201){
    by('submitMsg').textContent = 'Submitted!';
    by('submitAssignmentId').value = '';
    by('submitGithubLink').value = '';
    loadMySubmissions();
  } else {
    // show server message and debug info
    const msg = res.data?.message || res.data?.error || JSON.stringify(res.data) || 'Error';
    by('submitMsg').textContent = msg;
    console.error('Submit failed:', res);
    const db = by('debug');
    db.classList.remove('hidden');
    const payload = { assignment_id: assignmentId, githubLink };
    const debugObj = {
      time: new Date().toISOString(),
      request: {
        url: API_BASE + `/student/submitAssignment/${studentId}`,
        method: 'POST',
        payload
      },
      response: res
    };
    db.textContent = JSON.stringify(debugObj, null, 2);

    // helpful tip for collecting server logs
    const tip = document.createElement('div');
    tip.style.marginTop = '12px';
    tip.style.color = '#9ca3af';
    tip.innerText = 'Tip: Open DevTools → Network, click the failing POST to /student/submitAssignment/... and paste the Response body here (or paste server terminal error).';
    db.appendChild(tip);
  }
}

async function loadMySubmissions(){
  const res = await request('/student/mySubmisions','GET');
  const ul = by('mySubsList'); ul.innerHTML = '';
  
  console.log('My submissions response:', res); // Debug log
  
  if(!(res.status===200 && Array.isArray(res.data))){ 
    ul.textContent = 'Error loading my submissions'; 
    return 
  }

  const submissions = res.data;
  show(by('mySubsEmpty'), submissions.length === 0);

  // Clear assignments cache to avoid showing wrong data
  assignmentsCache = null;
  const assignmentsMap = await fetchAssignmentsMap(true); // Force refresh

  submissions.forEach(s=>{
    const assignmentObj = s.assignment || s.assignment_id || {};
    const assignmentId = assignmentObj._id || assignmentObj.assignment_id || s.assignment_id || '';
    const assignmentTitle = (assignmentObj && assignmentObj.title) ? assignmentObj.title : (assignmentsMap[String(assignmentId)] || 'Untitled Assignment');
    const grade = s.grade !== undefined && s.grade !== null ? s.grade : 'Not graded yet';
    const githubLink = s.githubLink || 'No link';
    const partner = s.partner || 'No partner';
    const comment = s.comment || s.feedback || 'No feedback yet';
    const submissionDate = s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'Unknown date';

    const li = document.createElement('li');
    li.innerHTML = `
      <div style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px">
        <div style="font-weight:700;font-size:1.1em;margin-bottom:8px">${escapeHtml(String(assignmentTitle))}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.9em">
          <div><strong>Assignment ID:</strong> ${shortId(assignmentId)}</div>
          <div><strong>Grade:</strong> <span style="color:${grade === 'Not graded yet' ? '#ef4444' : '#10b981'}">${escapeHtml(String(grade))}</span></div>
          <div><strong>GitHub:</strong> <a href="${escapeHtml(String(githubLink))}" target="_blank" style="color:#2563eb">${githubLink.length > 30 ? githubLink.substring(0,30) + '...' : githubLink}</a></div>
          <div><strong>Partner:</strong> ${escapeHtml(String(partner))}</div>
          <div><strong>Submitted:</strong> ${submissionDate}</div>
          <div style="grid-column:1/-1;margin-top:8px"><strong>Teacher Feedback:</strong> <span style="color:#6b7280;font-style:${comment === 'No feedback yet' ? 'italic' : 'normal'}">${escapeHtml(String(comment))}</span></div>
        </div>
      </div>
    `;
    ul.appendChild(li);
  })
}

// Teacher functions
async function addAssignment(){
  const title = by('addTitle').value.trim();
  const description = by('addDescription').value.trim();
  const dueDateInput = by('addDueDate').value;

  if(!title){ by('addMsg').textContent = 'Title is required'; return }
  if(!dueDateInput){ by('addMsg').textContent = 'Due date is required'; return }

  // server schema uses `descreption` (typo) and requires dueDate — send expected keys
  const dueDate = new Date(dueDateInput).toISOString();
  // disable button while creating
  const addBtn = by('addAssignmentBtn'); addBtn.disabled = true; addBtn.classList.add('disabled');
  const res = await request('/teacher/Addassignments','POST',{ title, descreption: description, dueDate });
  addBtn.disabled = false; addBtn.classList.remove('disabled');

  if(res.status===201){
    by('addMsg').textContent = 'Assignment created';
    showToast('Assignment created', 'success');
    // clear form
    by('addTitle').value = '';
    by('addDueDate').value = '';
    by('addDescription').value = '';
    // auto-refresh submissions and assignments
    loadAllSubmissions();
    loadAssignments();
  } else {
    const msg = res.data?.message || JSON.stringify(res.data) || 'Error';
    by('addMsg').textContent = msg;
    showToast(msg, 'error');
  }
}

async function loadAllSubmissions(){
  const res = await request('/teacher/submissions','GET');
  const ul = by('allSubsList'); ul.innerHTML = '';
  if(!(res.status===200 && Array.isArray(res.data))){ by('allSubsList').innerHTML = '<div class="small-muted">Error loading submissions</div>'; return }

  let submissions = res.data;

  // Show the hide button and submissions list
  by('toggleSubs').style.display = 'inline-block';
  allSubsHidden = false;
  by('toggleSubs').textContent = 'Hide';
  const wrap = by('allSubsListWrap');
  wrap.classList.remove('hidden-wrap');
  wrap.classList.add('visible-wrap');

  // clear empty message
  show(by('subsEmpty'), submissions.length === 0);

  // If assignments are not populated, get a cached map (fetch once if needed)
  const needsAssignmentFetch = submissions.length && submissions.some(s => {
    const a = s.assignment || s.assignment_id;
    return !(a && a.title);
  });

  const assignmentsMap = await fetchAssignmentsMap(needsAssignmentFetch);


  submissions.forEach(s=>{
    const studentObj = s.student || s.student_id || s.student_id || {}; // may be populated
    const assignmentObj = s.assignment || s.assignment_id || {};

    const studentName = (studentObj && studentObj.name) ? studentObj.name : (typeof studentObj === 'string' ? studentObj : (s.student_id || 'Unknown'));

    // determine assignment id and title
    const assignmentIdRaw = (assignmentObj && (assignmentObj._id || assignmentObj.assignment_id)) ? (assignmentObj._id || assignmentObj.assignment_id) : (s.assignment_id || '');
    const assignmentId = String(assignmentIdRaw || '');
    let assignmentTitle = (assignmentObj && assignmentObj.title) ? assignmentObj.title : '';
    if(!assignmentTitle && assignmentsMap[assignmentId]) assignmentTitle = assignmentsMap[assignmentId];
    if(!assignmentTitle && typeof assignmentObj === 'string') assignmentTitle = assignmentObj;
    if(!assignmentTitle) assignmentTitle = 'Untitled Assignment';

    const grade = s.grade !== undefined && s.grade !== null ? s.grade : 'N/A';
    const studentId = (studentObj && studentObj.user_id) ? studentObj.user_id : (typeof studentObj === 'string' ? studentObj : (s.student_id || ''));

    const li = document.createElement('li');
    li.innerHTML = `
      <div class="submission-item">
        <div class="left">
          <div class="title">${escapeHtml(String(assignmentTitle))}</div>
          <div class="small-muted">Assignment ID: ${shortId(assignmentId)}</div>
          <div class="small-muted">Student: ${escapeHtml(String(studentName))} (${shortId(studentId)})</div>
        </div>
        <div class="right">
          <div class="small-muted">Grade: <strong>${escapeHtml(String(grade))}</strong></div>
          <div>
            <button class="btn small" data-student="${escapeHtml(String(studentId))}" data-assignment="${escapeHtml(String(assignmentId))}">Mark</button>
          </div>
        </div>
      </div>
    `;
    ul.appendChild(li);
  })

  // attach mark handlers (open modal for grading)
  Array.from(ul.querySelectorAll('button[data-student]')).forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const st = btn.getAttribute('data-student');
      const as = btn.getAttribute('data-assignment');
      openMarkModal(st, as);
    })
  })
}

// Open marking modal and prefill values if available
function openMarkModal(studentId, assignmentId, currentGrade, currentComment){
  const modal = by('markModal');
  modal.dataset.student = studentId;
  modal.dataset.assignment = assignmentId;
  by('markGrade').value = currentGrade && currentGrade!=='N/A' ? String(currentGrade) : '';
  by('markComment').value = currentComment || '';
  by('markMsg').textContent = '';
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden','false');
  by('markGrade').focus();
}

function closeMarkModal(){
  const modal = by('markModal');
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden','true');
  modal.removeAttribute('data-student');
  modal.removeAttribute('data-assignment');
}

async function submitMark(){
  const modal = by('markModal');
  const student = modal.dataset.student; const assignment = modal.dataset.assignment;
  const grade = by('markGrade').value.trim();
  const comment = by('markComment').value.trim();
  const msgEl = by('markMsg');
  if(!grade){ msgEl.textContent = 'Provide a grade'; return }
  const submitBtn = by('markSubmit');
  submitBtn.disabled = true; submitBtn.classList.add('disabled');

const res = await request(`/submissions/${student}/${assignment}`, 'PUT', { grade, comment });
  submitBtn.disabled = false; submitBtn.classList.remove('disabled');
  if(res.status===200){
    msgEl.textContent = 'Marked';
    showToast('Marked successfully', 'success');
    closeMarkModal();
    loadAllSubmissions();
  } else {
    const msg = res.data?.message || JSON.stringify(res.data) || 'Error';
    msgEl.textContent = msg;
    showToast(msg, 'error');
    console.error('Mark failed:', res);
  }
}

async function submitManualGrade(){
  const studentId = by('gradeStudentId').value.trim();
  const assignmentId = by('gradeAssignmentId').value.trim();
  const grade = by('manualGrade').value.trim();
  const comment = by('manualComment').value.trim();
  const msgEl = by('manualGradeMsg');
  
  if(!studentId){ msgEl.textContent = 'Provide student ID'; return }
  if(!assignmentId){ msgEl.textContent = 'Provide assignment ID'; return }
  if(!grade){ msgEl.textContent = 'Provide a grade'; return }
  
  const submitBtn = by('manualGradeBtn');
  submitBtn.disabled = true; submitBtn.classList.add('disabled');
  
  const res = await request(`/teacher/markSubmission/${studentId}/${assignmentId}`,'PUT',{grade, comment});
  
  submitBtn.disabled = false; submitBtn.classList.remove('disabled');
  
  if(res.status===200){
    msgEl.textContent = 'Grade submitted successfully!';
    showToast('Grade submitted successfully', 'success');
    // Clear form
    by('gradeStudentId').value = '';
    by('gradeAssignmentId').value = '';
    by('manualGrade').value = '';
    by('manualComment').value = '';
    // Refresh submissions
    loadAllSubmissions();
  } else {
    const msg = res.data?.message || JSON.stringify(res.data) || 'Error submitting grade';
    msgEl.textContent = msg;
    showToast(msg, 'error');
  }
}

async function markSubmission(){
  const studentId = prompt('student id'); const assignmentId = prompt('assignment id');
  if(!studentId||!assignmentId) return alert('need ids');
  openMarkModal(studentId, assignmentId);
}

async function getAverage(){
  const res = await request('/teacher/stats/averages','GET');
  by('avgGrade').textContent = res.status===200? (res.data?.averageGrade !== undefined ? `Average: ${res.data.averageGrade}` : JSON.stringify(res.data)) : 'Error';
}

// UI wiring
function updateUI(){
  const token = localStorage.getItem('token');
  const payload = token? parseJwt(token): null;
  const role = payload?.role;
  const name = localStorage.getItem('userName') || payload?.name || 'User';

  // show friendly welcome instead of raw token id
  if(token){
    by('userInfo').innerHTML = ` <div class="welcome"><strong>Welcome, ${escapeHtml(name)}</strong><span class="role muted">${role? role.charAt(0).toUpperCase()+role.slice(1) : 'User'}</span></div>`;
  } else {
    by('userInfo').textContent = '';
  }

  // nav buttons
  show(by('logout'), !!token);
  show(by('showLogin'), !token);
  show(by('showRegister'), !token);

  // welcome section - hide when logged in
  show(by('welcomeSection'), !token);

  // forms & areas
  show(by('loginForm'), !token && by('loginForm').dataset.open==='true');
  show(by('registerForm'), !token && by('registerForm').dataset.open==='true');
  show(by('studentArea'), !!token && role==='student');
  show(by('teacherArea'), !!token && role==='teacher');
}

// small helper to avoid basic HTML injection in names
function escapeHtml(unsafe){
  return unsafe.replace(/[&<>"]/, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[m]});
}

// Event listeners
window.addEventListener('DOMContentLoaded', ()=>{
  // nav
  by('showLogin').addEventListener('click', ()=>{ by('loginForm').dataset.open = by('loginForm').dataset.open==='true' ? 'false' : 'true'; by('registerForm').dataset.open='false'; updateUI() });
  by('showRegister').addEventListener('click', ()=>{ by('registerForm').dataset.open = by('registerForm').dataset.open==='true' ? 'false' : 'true'; by('loginForm').dataset.open='false'; updateUI() });
  by('logout').addEventListener('click', ()=>{ logout() });
  
  // CTA buttons
  if(by('ctaLogin')) by('ctaLogin').addEventListener('click', ()=>{ by('loginForm').dataset.open = 'true'; by('registerForm').dataset.open='false'; updateUI() });

  // auth
  by('registerBtn').addEventListener('click', register);
  by('loginBtn').addEventListener('click', login);
  // generate user id button
  by('genUserId')?.addEventListener('click', ()=>{ const id = generateUserId(); by('regUserId').value = id; by('regUserIdErr')?.classList.add('hidden'); showToast('User ID generated', 'success'); });
  // clear user id error as user types
  by('regUserId')?.addEventListener('input', ()=>{ const e = by('regUserIdErr'); if(e){ e.classList.add('hidden'); e.textContent = ''; } });
  // clear register form
  by('regClear')?.addEventListener('click', ()=>{ ['regUserId','regName','regEmail','regPassword'].forEach(id=>{ if(by(id)) by(id).value=''; }); by('regMsg').textContent=''; by('regUserIdErr')?.classList.add('hidden'); });

  // student
  by('refreshAssignments').addEventListener('click', loadAssignments);
  by('submitBtn').addEventListener('click', submitAssignment);
  by('clearSubmitForm')?.addEventListener('click', ()=>{ by('submitAssignmentId').value=''; by('submitGithubLink').value=''; by('submitPartner').value=''; by('submitMsg').textContent=''; });
  by('refreshMySubs').addEventListener('click', loadMySubmissions);
  // hide/show toggles
  if(by('toggleAssignments')){
    by('toggleAssignments').addEventListener('click', ()=>{
      assignmentsHidden = !assignmentsHidden;
      by('toggleAssignments').textContent = assignmentsHidden ? 'Show' : 'Hide';
      const wrap = by('assignmentsListWrap');
      if(assignmentsHidden){
        wrap.classList.add('hidden-wrap');
        wrap.classList.remove('visible-wrap');
      } else {
        wrap.classList.remove('hidden-wrap');
        wrap.classList.add('visible-wrap');
      }
    });
  }
  if(by('toggleMySubs')){
    by('toggleMySubs').addEventListener('click', ()=>{
      mySubsHidden = !mySubsHidden;
      by('toggleMySubs').textContent = mySubsHidden ? 'Show' : 'Hide';
      const wrap = by('mySubsListWrap');
      if(mySubsHidden){
        wrap.classList.add('hidden-wrap');
        wrap.classList.remove('visible-wrap');
      } else {
        wrap.classList.remove('hidden-wrap');
        wrap.classList.add('visible-wrap');
      }
    });
  }
  // teacher
  by('addAssignmentBtn').addEventListener('click', addAssignment);
  by('refreshSubs').addEventListener('click', loadAllSubmissions);
  by('getAvg').addEventListener('click', getAverage);
  by('manualGradeBtn').addEventListener('click', submitManualGrade);
  by('clearGradeForm')?.addEventListener('click', ()=>{ 
    by('gradeStudentId').value=''; 
    by('gradeAssignmentId').value=''; 
    by('manualGrade').value=''; 
    by('manualComment').value=''; 
    by('manualGradeMsg').textContent=''; 
  });
  // hide/show toggle for teacher submissions
  if(by('toggleSubs')){
    by('toggleSubs').addEventListener('click', ()=>{
      allSubsHidden = !allSubsHidden;
      by('toggleSubs').textContent = allSubsHidden ? 'Show' : 'Hide';
      const wrap = by('allSubsListWrap');
      if(allSubsHidden){
        wrap.classList.add('hidden-wrap');
        wrap.classList.remove('visible-wrap');
        by('toggleSubs').style.display = 'none';
      } else {
        wrap.classList.remove('hidden-wrap');
        wrap.classList.add('visible-wrap');
      }
    });
  }

  // modal handlers
  by('markCancel')?.addEventListener('click', closeMarkModal);
  by('markSubmit')?.addEventListener('click', submitMark);
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeMarkModal(); });



  updateUI();
});

// expose helper for manual actions (debug)
window.__client = { request, parseJwt };