const form = document.querySelector('#analysis-form');
const fileInput = document.querySelector('#resume-file');
const resumeInput = document.querySelector('#resume-text');
const jobInput = document.querySelector('#job-description');
const dropzone = document.querySelector('#dropzone');
const errorBanner = document.querySelector('#error-banner');
const results = document.querySelector('#results');
const button = document.querySelector('#analyze-button');
const routePages = { '/': document.querySelector('#upload-page'), '/analysis': document.querySelector('#analysis-page'), '/tailored': document.querySelector('#tailored-page') };
let selectedFile = null;
let currentAnalysis = null;

function saveInputs() {
  sessionStorage.setItem('matchday-resume-text', resumeInput.value);
  sessionStorage.setItem('matchday-job-description', jobInput.value);
}
function invalidateResults() {
  currentAnalysis = null;
  sessionStorage.removeItem('matchday-analysis');
  sessionStorage.removeItem('matchday-tailored-draft');
}
function restoreInputs() {
  resumeInput.value = sessionStorage.getItem('matchday-resume-text') || '';
  jobInput.value = sessionStorage.getItem('matchday-job-description') || '';
  count(resumeInput, document.querySelector('#resume-count'));
  count(jobInput, document.querySelector('#job-count'));
}
function showPage(path) {
  const route = routePages[path] ? path : '/';
  if (route === '/analysis') {
    try { currentAnalysis ||= JSON.parse(sessionStorage.getItem('matchday-analysis') || 'null'); } catch { currentAnalysis = null; }
    if (!currentAnalysis) return navigate('/');
    render(currentAnalysis);
  }
  if (route === '/tailored') {
    const draft = sessionStorage.getItem('matchday-tailored-draft');
    if (!draft) return navigate(currentAnalysis ? '/analysis' : '/');
    document.querySelector('#tailored-draft').value = draft;
    document.querySelector('#tailored-score-note').textContent = currentAnalysis ? `Tailored for a role with a ${currentAnalysis.matchScore}% resume match. Review every detail before using it.` : 'Built around the role you selected. Check every detail before using it.';
  }
  for (const [url, page] of Object.entries(routePages)) page.hidden = url !== route;
  document.querySelectorAll('.nav-item[data-route]').forEach((link) => link.classList.toggle('active', link.dataset.route === route));
  const labels = { '/': 'Upload resume and job description', '/analysis': 'Resume match analysis', '/tailored': 'Tailored resume' };
  document.querySelector('.breadcrumb').innerHTML = `Workspace <span>/</span> ${labels[route]}`;
}
function navigate(path) {
  if (location.pathname !== path) history.pushState({}, '', path);
  showPage(path);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
document.querySelectorAll('[data-route]').forEach((link) => link.addEventListener('click', (event) => {
  event.preventDefault(); navigate(link.dataset.route);
}));
window.addEventListener('popstate', () => showPage(location.pathname));

function count(input, output) {
  const length = input.value.length;
  output.textContent = `${length.toLocaleString()} character${length === 1 ? '' : 's'}`;
}
resumeInput.addEventListener('input', () => { count(resumeInput, document.querySelector('#resume-count')); saveInputs(); invalidateResults(); });
jobInput.addEventListener('input', () => { count(jobInput, document.querySelector('#job-count')); saveInputs(); invalidateResults(); });

function setFile(file) {
  if (!file) return;
  if (!['application/pdf', 'text/plain'].includes(file.type) && !/\.(pdf|txt)$/i.test(file.name)) {
    showError('Choose a PDF or TXT file.'); return;
  }
  if (file.size > 3 * 1024 * 1024) { showError('That file is over 3 MB. Vercel limits uploads, so choose a smaller resume.'); return; }
  invalidateResults();
  selectedFile = file;
  document.querySelector('#file-title').textContent = file.name;
  document.querySelector('#file-subtitle').textContent = `${(file.size / 1024).toFixed(0)} KB · ready to analyze`;
  errorBanner.hidden = true;
  if (file.type === 'text/plain' || /\.txt$/i.test(file.name)) {
    file.text().then((text) => { resumeInput.value = text; count(resumeInput, document.querySelector('#resume-count')); });
    selectedFile = null;
  } else resumeInput.value = '';
}
fileInput.addEventListener('change', () => setFile(fileInput.files[0]));
for (const event of ['dragover', 'dragenter']) dropzone.addEventListener(event, (e) => { e.preventDefault(); dropzone.classList.add('dragging'); });
for (const event of ['dragleave', 'drop']) dropzone.addEventListener(event, (e) => { e.preventDefault(); dropzone.classList.remove('dragging'); });
dropzone.addEventListener('drop', (e) => setFile(e.dataTransfer.files[0]));
document.querySelector('#clear-resume').addEventListener('click', () => {
  invalidateResults();
  resumeInput.value = ''; selectedFile = null; fileInput.value = '';
  document.querySelector('#file-title').textContent = 'Drop your resume here';
  document.querySelector('#file-subtitle').innerHTML = 'or <span class="browse">browse files</span>';
  count(resumeInput, document.querySelector('#resume-count'));
});
function showError(message) { errorBanner.textContent = message; errorBanner.hidden = false; }
function safe(value) { return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function list(items) { return `<ul>${(Array.isArray(items) && items.length ? items : ['No specific items to highlight.']).map((x) => `<li>${safe(x)}</li>`).join('')}</ul>`; }
function render(data) {
  const criteria = (Array.isArray(data.criteria) ? data.criteria : []).map((item) => {
    const score = Math.max(0, Math.min(100, Number(item.score) || 0));
    return `<div class="criteria-row"><span>${safe(item.name)}</span><div class="bar"><span style="width:${score}%"></span></div><small>${score}%</small><div class="criteria-detail">${safe(item.evidence)}</div></div>`;
  }).join('');
  results.innerHTML = `<div class="result-top"><div class="score-ring" style="--score:${data.matchScore}%"><div class="score-inner"><strong>${data.matchScore}</strong><span>/100</span></div></div><div class="result-copy"><div class="result-label">Your match snapshot</div><h2>Here’s where you stand</h2><p>${safe(data.summary)}</p></div></div><div class="result-columns"><div class="result-panel"><h3>Where you shine</h3>${list(data.strengths)}</div><div class="result-panel"><h3>Areas to strengthen</h3>${list(data.gaps)}</div><div class="result-panel"><h3>Keywords to consider</h3>${list(data.keywords)}</div><div class="result-panel"><h3>Ways to improve your resume</h3>${list(data.recommendations)}</div></div>${criteria ? `<div class="criteria"><h3>Role alignment</h3>${criteria}</div>` : ''}<div class="tailor-cta"><div><strong>Ready to make it yours?</strong><p>Generate a resume draft tailored to the role. You can edit, copy, or download it on the next page.</p></div><button type="button" class="analyze-button" id="tailor-button"><span>Tailor my resume</span><span class="button-arrow">↗</span></button></div>`;
  results.hidden = false;
  document.querySelector('#tailor-button').addEventListener('click', tailorResume);
}
async function fileAsBase64(file) {
  const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
  return dataUrl.split(',')[1];
}
async function requestPayload() {
  const payload = { resumeText: resumeInput.value, jobDescription: jobInput.value };
  if (selectedFile) payload.pdf = { mimeType: selectedFile.type || 'application/pdf', data: await fileAsBase64(selectedFile) };
  return payload;
}
async function authenticatedHeaders() {
  const token = await window.matchdayAuth?.getIdToken();
  if (!token) throw new Error('Your sign-in session ended. Please sign in again.');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}
async function tailorResume() {
  const tailorButton = document.querySelector('#tailor-button');
  const label = tailorButton.querySelector('span:first-child');
  if (!resumeInput.value.trim() && !selectedFile) {
    showError('This tab no longer has the uploaded PDF. Return to Upload resume and select the file again.');
    return;
  }
  tailorButton.disabled = true; label.textContent = 'Tailoring your resume…';
  try {
    const response = await fetch('/api/tailor', { method: 'POST', headers: await authenticatedHeaders(), body: JSON.stringify(await requestPayload()) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'The resume draft could not be created.');
    sessionStorage.setItem('matchday-tailored-draft', data.draft);
    navigate('/tailored');
  } catch (error) { showError(error.message || 'Something went wrong. Please try again.'); }
  finally { tailorButton.disabled = false; label.textContent = 'Tailor my resume'; }
}
form.addEventListener('submit', async (event) => {
  event.preventDefault(); errorBanner.hidden = true; results.hidden = true;
  if (!resumeInput.value.trim() && !selectedFile) return showError('Add your resume as text or upload a PDF.');
  if (!jobInput.value.trim()) return showError('Add the job description to continue.');
  saveInputs();
  sessionStorage.removeItem('matchday-tailored-draft');
  button.disabled = true; button.querySelector('span:first-child').textContent = 'Reading your resume…';
  try {
    const payload = await requestPayload();
    button.querySelector('span:first-child').textContent = 'Finding your fit…';
    const response = await fetch('/api/analyze', { method: 'POST', headers: await authenticatedHeaders(), body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'The analysis could not be completed.');
    currentAnalysis = data;
    sessionStorage.setItem('matchday-analysis', JSON.stringify(data));
    navigate('/analysis');
  } catch (error) { showError(error.message || 'Something went wrong. Please try again.'); }
  finally { button.disabled = false; button.querySelector('span:first-child').textContent = 'Analyze my match'; }
});

document.querySelector('#copy-draft').addEventListener('click', async () => {
  const copy = document.querySelector('#copy-draft');
  try { await navigator.clipboard.writeText(document.querySelector('#tailored-draft').value); }
  catch { document.querySelector('#tailored-draft').select(); document.execCommand('copy'); }
  copy.textContent = 'Copied';
  setTimeout(() => { copy.textContent = 'Copy'; }, 1800);
});
document.querySelector('#download-draft').addEventListener('click', () => {
  const blob = new Blob([document.querySelector('#tailored-draft').value], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'tailored-resume.txt'; link.click(); URL.revokeObjectURL(link.href);
});
document.querySelector('#tailored-draft').addEventListener('input', (event) => sessionStorage.setItem('matchday-tailored-draft', event.target.value));

restoreInputs();
try { currentAnalysis = JSON.parse(sessionStorage.getItem('matchday-analysis') || 'null'); } catch { currentAnalysis = null; }
showPage(location.pathname);
