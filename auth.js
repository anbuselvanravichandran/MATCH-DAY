const gate = document.querySelector('#auth-gate');
const shell = document.querySelector('#app-shell');
const form = document.querySelector('#auth-form');
const notice = document.querySelector('#auth-notice');
const errorBox = document.querySelector('#auth-error');
const submitButton = document.querySelector('#auth-submit');
const passwordInput = document.querySelector('#auth-password');
const title = document.querySelector('#auth-title');
const intro = document.querySelector('#auth-intro');
const switchWrap = document.querySelector('#auth-switch');
const switchCopy = document.querySelector('#auth-switch-copy');
const switchButton = document.querySelector('#auth-switch-button');
const emailInput = document.querySelector('#auth-email');

let auth;
let mode = 'signin';
let resetButton;

function authMessage(code) {
  const messages = {
    'auth/email-already-in-use': 'An account already uses that email. Try signing in instead.',
    'auth/invalid-credential': 'That email and password do not match. Check them and try again.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/weak-password': 'Choose a stronger password with at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Wait a little, then try again.',
    'auth/network-request-failed': 'Could not reach Firebase. Check your internet connection.',
    'auth/user-disabled': 'This account has been disabled. Contact the app owner.',
  };
  return messages[code] || 'Firebase could not complete that request. Please try again.';
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function setMode(nextMode) {
  mode = nextMode;
  const signingUp = mode === 'signup';
  title.textContent = signingUp ? 'Create your account.' : 'Welcome back.';
  intro.textContent = signingUp ? 'Set up an account to use your resume workspace.' : 'Sign in to continue to your resume workspace.';
  submitButton.querySelector('span:first-child').textContent = signingUp ? 'Create account' : 'Sign in';
  passwordInput.autocomplete = signingUp ? 'new-password' : 'current-password';
  switchCopy.textContent = signingUp ? 'Already have an account?' : 'New to Matchday?';
  switchButton.textContent = signingUp ? 'Sign in' : 'Create an account';
  resetButton.hidden = signingUp;
  errorBox.hidden = true;
}

switchButton.addEventListener('click', () => setMode(mode === 'signin' ? 'signup' : 'signin'));

async function start() {
  try {
    const response = await fetch('/api/firebase-config');
    const data = await response.json();
    if (!data.configured) {
      notice.innerHTML = 'Firebase is not configured yet. Add <code>FIREBASE_API_KEY</code>, <code>FIREBASE_AUTH_DOMAIN</code>, <code>FIREBASE_PROJECT_ID</code>, and <code>FIREBASE_APP_ID</code> from your Firebase web app to <code>.env</code>, enable Email/Password in Firebase Authentication, then restart the app.';
      return;
    }
    const sdk = 'https://www.gstatic.com/firebasejs/12.19.0/';
    const [{ initializeApp }, { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut }] = await Promise.all([
      import(`${sdk}firebase-app.js`), import(`${sdk}firebase-auth.js`),
    ]);
    const firebaseApp = initializeApp(data.config);
    auth = getAuth(firebaseApp);
    window.matchdayAuth = { getIdToken: () => auth.currentUser?.getIdToken() };
    notice.hidden = true;
    form.hidden = false;
    switchWrap.hidden = false;
    resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'forgot-password';
    resetButton.textContent = 'Forgot password?';
    form.insertBefore(resetButton, errorBox);
    resetButton.addEventListener('click', async () => {
      errorBox.hidden = true;
      const email = emailInput.value.trim();
      if (!email) { showError('Enter your email address first, then choose Forgot password.'); return; }
      try {
        await sendPasswordResetEmail(auth, email);
        notice.textContent = 'Password reset email sent. Check your inbox.';
        notice.classList.add('success'); notice.hidden = false;
      } catch (error) { showError(authMessage(error.code)); }
    });
    setMode('signin');
    onAuthStateChanged(auth, (user) => {
      if (user) {
        document.querySelector('#account-email').textContent = user.email || 'Signed in';
        gate.hidden = true; shell.hidden = false;
      } else {
        shell.hidden = true; gate.hidden = false;
      }
    });
    document.querySelector('#sign-out').addEventListener('click', () => signOut(auth));
    form.addEventListener('submit', async (event) => {
      event.preventDefault(); errorBox.hidden = true;
      submitButton.disabled = true;
      submitButton.querySelector('span:first-child').textContent = mode === 'signup' ? 'Creating account…' : 'Signing in…';
      try {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        if (mode === 'signup') await createUserWithEmailAndPassword(auth, email, password);
        else await signInWithEmailAndPassword(auth, email, password);
      } catch (error) { showError(authMessage(error.code)); }
      finally {
        submitButton.disabled = false;
        submitButton.querySelector('span:first-child').textContent = mode === 'signup' ? 'Create account' : 'Sign in';
      }
    });
  } catch (error) {
    notice.textContent = 'Could not connect to Firebase. Check the Firebase web configuration and internet connection, then reload.';
    console.error(error);
  }
}

start();
