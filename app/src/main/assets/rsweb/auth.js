/**
 * RetroShare WebUI Auth Portal (rsWeb Custom Extensions)
 * Manages Account Login and Node Creation via HTTP JSON API at http://127.0.0.1:9092
 *
 * DEBUG BUILD — key steps logged with [rsWeb] prefix.
 * adb logcat | grep rsWeb   OR   chrome://inspect Console
 */

(function () {
  const TAG = '[rsWeb]';
  const API_BASE = (window.location.protocol === 'file:')
    ? 'http://127.0.0.1:9092'
    : window.location.origin;
  let accountsList = [];
  let serviceFailureCount = 0;

  console.log(TAG, '=== auth.js START ===');
  console.log(TAG, 'protocol:', window.location.protocol, '| API_BASE:', API_BASE);

  // ─── POST-LOGIN RELOAD DETECTION ─────────────────────────────────────────────
  // After a successful login we do window.location.reload() so that app.js starts
  // fresh with the correct credentials already in sessionStorage.
  // The rs_post_login flag prevents us from doing another overlay/redirect cycle.
  const POST_LOGIN_FLAG = 'rs_post_login';
  const isPostLoginReload = sessionStorage.getItem(POST_LOGIN_FLAG) === 'true';
  if (isPostLoginReload) {
    sessionStorage.removeItem(POST_LOGIN_FLAG);
    console.log(TAG, '✅ Post-login reload detected — letting app.js handle routing');
    // Give mithril 150ms to initialise, then navigate to /home.
    // App.js has correct credentials in sessionStorage from Step 1 below.
    setTimeout(function () {
      if (window.m && window.m.route && typeof window.m.route.set === 'function') {
        console.log(TAG, 'post-login: m.route.set("/home")');
        window.m.route.set('/home');
      } else {
        console.warn(TAG, 'post-login: m not ready, retrying in 300ms');
        setTimeout(function () {
          if (window.m && window.m.route && typeof window.m.route.set === 'function') {
            window.m.route.set('/home');
          }
        }, 300);
      }
    }, 150);
    // Do NOT run checkAuthStatus — just let app.js take over.
    // Still run Step 1 sync below so app.js loginKey is populated.
  }

  // ─── Step 1: Sync localStorage → sessionStorage SYNCHRONOUSLY ────────────────
  // Runs before app.js parses so loginKey is populated with correct values.
  try {
    const lsVerified = localStorage.getItem('rs_isVerified') === 'true';
    const lsUser     = localStorage.getItem('rs_username') || '';
    const lsPass     = localStorage.getItem('rs_passwd')   || '';
    const lsUrl      = localStorage.getItem('rs_url')      || API_BASE;

    console.log(TAG, 'Step1 localStorage: verified=', lsVerified,
      '| user=', lsUser ? '(set)' : '(empty)', '| pass=', lsPass ? '(set)' : '(empty)');

    if (lsVerified && lsUser && lsPass) {
      sessionStorage.setItem('rs_username',   lsUser);
      sessionStorage.setItem('rs_passwd',     lsPass);
      sessionStorage.setItem('rs_url',        lsUrl);
      sessionStorage.setItem('rs_isVerified', 'true');
      console.log(TAG, 'Step1 ✅ synced localStorage → sessionStorage');
    } else {
      console.log(TAG, 'Step1 ⚠️  no stored credentials — sessionStorage stays empty');
    }
  } catch (e) {
    console.error(TAG, 'Step1 ❌ error:', e);
  }

  // Install this before the post-login early return below. The WebUI's logout
  // only routes to its built-in login page, so rsWeb must handle it first.
  document.addEventListener('click', function (event) {
    const clickedElement = event.target && event.target.closest
      ? event.target.closest('.logout-link, button')
      : null;
    // RSNewWebUI is a generated bundle and some upstream versions omit the
    // logout-link class from the mobile navigation button. Recognize that
    // button by its icon and label as a fallback so asset syncs cannot expose
    // the built-in WebUI login page again.
    const isMobileLogout = clickedElement
      && clickedElement.tagName === 'BUTTON'
      && clickedElement.querySelector('.fa-sign-out-alt')
      && clickedElement.textContent.trim().toLowerCase() === 'logout';
    const logoutLink = clickedElement
      && (clickedElement.classList.contains('logout-link') || isMobileLogout)
      ? clickedElement
      : null;
    if (!logoutLink) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    clearSavedCredentials();
    window.location.reload();
  }, true);

  // If this is the post-login reload we're done here — don't run checkAuthStatus.
  if (isPostLoginReload) {
    console.log(TAG, 'post-login reload: skipping checkAuthStatus');
    return; // Exit the IIFE early
  }

  // ─── API helpers ──────────────────────────────────────────────────────────────

  async function deriveApiToken(locationId, password) {
    try {
      const msgUint8 = new TextEncoder().encode(locationId + ':' + password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      console.error(TAG, 'SHA256 error — using raw password:', e);
      return password;
    }
  }

  async function rsApiCall(endpoint, params = {}) {
    console.log(TAG, 'rsApiCall →', endpoint);
    const res = await fetch(API_BASE + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    console.log(TAG, 'rsApiCall ←', endpoint, 'HTTP', res.status);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    console.log(TAG, 'rsApiCall ← body:', JSON.stringify(json));
    return json;
  }

  function saveSessionCredentials(username, apiPass) {
    try {
      sessionStorage.setItem('rs_username',   username);
      sessionStorage.setItem('rs_passwd',     apiPass);
      sessionStorage.setItem('rs_url',        API_BASE);
      sessionStorage.setItem('rs_isVerified', 'true');
      localStorage.setItem('rs_username',     username);
      localStorage.setItem('rs_passwd',       apiPass);
      localStorage.setItem('rs_url',          API_BASE);
      localStorage.setItem('rs_isVerified',   'true');
      console.log(TAG, 'saveSessionCredentials ✅ user:', username);
    } catch (e) {
      console.error(TAG, 'saveSessionCredentials ❌', e);
    }
  }

  function clearSavedCredentials() {
    ['rs_username', 'rs_passwd', 'rs_url', 'rs_isVerified', POST_LOGIN_FLAG]
      .forEach(function (key) {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      });
    console.log(TAG, 'clearSavedCredentials ✅');
  }

  // ─── finishAndLoad ────────────────────────────────────────────────────────────
  // Saves credentials and reloads the page.
  // On reload: Step 1 syncs the new credentials into sessionStorage so app.js
  // reads the correct values into loginKey, verifyLogin succeeds, and mithril
  // navigates to /home on its own. The POST_LOGIN_FLAG prevents another cycle.

  function finishAndLoad(username, passwd) {
    console.log(TAG, '=== finishAndLoad === user:', username,
      '| pass:', passwd ? '(set)' : '(empty)');

    saveSessionCredentials(username, passwd);

    const overlay = document.getElementById('rs-auth-overlay');
    if (overlay) {
      console.log(TAG, 'finishAndLoad: removing overlay');
      overlay.remove();
    }

    console.log(TAG, 'finishAndLoad: setting POST_LOGIN_FLAG and reloading page');
    sessionStorage.setItem(POST_LOGIN_FLAG, 'true');
    window.location.reload();
  }

  // ─── checkAuthStatus ─────────────────────────────────────────────────────────
  // Called on DOMContentLoaded (non-post-login pages only).
  // finishAndLoad is called OUTSIDE the try-catch to avoid its errors being
  // caught here and triggering showAuthOverlay() by mistake.

  async function checkAuthStatus() {
    console.log(TAG, '=== checkAuthStatus START ===');
    console.log(TAG, 'sessionStorage: verified=', sessionStorage.getItem('rs_isVerified'),
      '| user=', sessionStorage.getItem('rs_username') ? '(set)' : '(empty)');
    console.log(TAG, 'localStorage:   verified=', localStorage.getItem('rs_isVerified'),
      '| user=', localStorage.getItem('rs_username') ? '(set)' : '(empty)');

    // ── Only the API fetch is inside try-catch ──
    let loginData = null;
    try {
      loginData = await rsApiCall('/rsLoginHelper/isLoggedIn');
    } catch (e) {
      console.log(TAG, 'checkAuthStatus: ❌ isLoggedIn error:', e.message);
    }

    console.log(TAG, 'checkAuthStatus: isLoggedIn retval =',
      loginData ? loginData.retval : 'N/A (error)');

    // ── finishAndLoad is outside try-catch — its errors cannot trigger overlay ──
    if (loginData && (loginData.retval === true || loginData.retval === 1)) {
      const storedUser = sessionStorage.getItem('rs_username')
                      || localStorage.getItem('rs_username') || '';
      const storedPass = sessionStorage.getItem('rs_passwd')
                      || localStorage.getItem('rs_passwd')   || '';
      console.log(TAG, 'checkAuthStatus: daemon logged in | user:',
        storedUser ? '(set)' : '(empty)', '| pass:', storedPass ? '(set)' : '(empty)');

      if (storedUser && storedPass) {
        console.log(TAG, 'checkAuthStatus: ✅ calling finishAndLoad()');
        finishAndLoad(storedUser, storedPass);
        return; // ← exit before showAuthOverlay
      }
      console.log(TAG, 'checkAuthStatus: ⚠️  logged in but no credentials stored — showing overlay');
    } else {
      console.log(TAG, 'checkAuthStatus: daemon not logged in — showing overlay');
    }

    showAuthOverlay();
  }

  // ─── Auth Overlay ─────────────────────────────────────────────────────────────

  function showAuthOverlay() {
    if (document.getElementById('rs-auth-overlay')) {
      console.log(TAG, 'showAuthOverlay: already exists, skip');
      return;
    }
    console.log(TAG, 'showAuthOverlay: *** SHOWING OVERLAY ***');

    const overlay = document.createElement('div');
    overlay.id = 'rs-auth-overlay';
    overlay.innerHTML = `
      <div class="rs-auth-card">
        <div class="rs-auth-header">
          <img class="rs-auth-logo" src="images/retroshare.svg" alt="RetroShare" />
          <h1 class="rs-auth-title">RetroShare <span>Web</span></h1>
          <p id="rs-auth-subtitle" class="rs-auth-subtitle">Welcome back. Sign in to your profile.</p>
        </div>
        <div id="rs-auth-alert" class="rs-auth-alert"></div>
        <form id="rs-form-login">
          <div class="rs-auth-form-group">
            <label class="rs-auth-label" for="rs-login-account">Select Profile</label>
            <select id="rs-login-account" class="rs-auth-select">
              <option value="">Loading profiles...</option>
            </select>
          </div>
          <div class="rs-auth-form-group">
            <label class="rs-auth-label" for="rs-login-password">Password</label>
            <input type="password" id="rs-login-password" class="rs-auth-input"
              placeholder="Enter password" autocomplete="current-password" required />
          </div>
          <button type="submit" id="rs-btn-login" class="rs-auth-btn">Log In</button>
          <p class="rs-auth-switch">Don't have a profile? <button type="button" data-show-form="create">Create one</button></p>
        </form>
        <form id="rs-form-create" style="display:none;">
          <div class="rs-auth-form-group">
            <label class="rs-auth-label" for="rs-create-username">Profile Name</label>
            <input type="text" id="rs-create-username" class="rs-auth-input"
              placeholder="e.g. Alice" autocomplete="username" required />
          </div>
          <div class="rs-auth-form-group">
            <label class="rs-auth-label" for="rs-create-nodename">Location Name</label>
            <input type="text" id="rs-create-nodename" class="rs-auth-input"
              placeholder="e.g. Phone" value="WebUI" required />
          </div>
          <div class="rs-auth-form-group">
            <label class="rs-auth-label" for="rs-create-password">Password</label>
            <input type="password" id="rs-create-password" class="rs-auth-input"
              placeholder="Min 4 characters" autocomplete="new-password" required />
          </div>
          <div class="rs-auth-form-group">
            <label class="rs-auth-label" for="rs-create-confirm">Confirm Password</label>
            <input type="password" id="rs-create-confirm" class="rs-auth-input"
              placeholder="Repeat password" autocomplete="new-password" required />
          </div>
          <button type="submit" id="rs-btn-create" class="rs-auth-btn">Create Profile</button>
          <p class="rs-auth-switch">Already have a profile? <button type="button" data-show-form="login">Log in</button></p>
        </form>
        <div class="rs-service-status" role="status" aria-live="polite">
          <span id="rs-service-dot" class="rs-service-dot is-checking"></span>
          <span>RetroShare service</span>
          <strong id="rs-service-label">Checking...</strong>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    setupEventListeners();
    fetchAccounts();
  }

  function setupEventListeners() {
    document.querySelectorAll('[data-show-form]').forEach(button => {
      button.addEventListener('click', e => {
        e.preventDefault();
        showAuthForm(button.getAttribute('data-show-form'));
      });
    });
    document.getElementById('rs-form-login').addEventListener('submit', handleLogin);
    document.getElementById('rs-form-create').addEventListener('submit', handleCreate);
  }

  function showAuthForm(mode, keepAlert = false) {
    const isLogin = mode === 'login';
    document.getElementById('rs-form-login').style.display = isLogin ? 'block' : 'none';
    document.getElementById('rs-form-create').style.display = isLogin ? 'none' : 'block';
    document.getElementById('rs-auth-subtitle').textContent = isLogin
      ? 'Welcome back. Sign in to your profile.'
      : 'Create your private identity to get started.';
    if (!keepAlert) hideAlert();
    const firstInput = document.querySelector(isLogin ? '#rs-login-password' : '#rs-create-username');
    if (firstInput) firstInput.focus();
  }

  function setServiceStatus(running) {
    const dot = document.getElementById('rs-service-dot');
    const label = document.getElementById('rs-service-label');
    if (!dot || !label) return;
    dot.className = 'rs-service-dot ' + (running ? 'is-running' : 'is-stopped');
    label.textContent = running ? 'Running' : 'Unavailable';
  }

  async function fetchAccounts() {
    const select = document.getElementById('rs-login-account');
    if (!select) return;
    console.log(TAG, 'fetchAccounts: calling getLocations');
    try {
      const data = await rsApiCall('/rsLoginHelper/getLocations');
      serviceFailureCount = 0;
      setServiceStatus(true);
      accountsList = (data && data.locations) ? data.locations.filter(Boolean) : [];
      console.log(TAG, 'fetchAccounts: found', accountsList.length, 'accounts');
      select.innerHTML = '';
      if (accountsList.length === 0) {
        select.innerHTML = '<option value="">No existing nodes found. Create a new one!</option>';
        showAuthForm('create', true);
        showAlert('No existing profiles found. Please create a new profile.', 'success');
        return;
      }
      accountsList.forEach(acc => {
        const opt = document.createElement('option');
        opt.value = acc.mLocationId;
        opt.textContent = `${acc.mPgpName} (${acc.mLocationName})`;
        select.appendChild(opt);
      });
    } catch (e) {
      console.error(TAG, 'fetchAccounts: ❌', e.message);
      serviceFailureCount += 1;
      setServiceStatus(false);
      if (serviceFailureCount === 3 && window.RSWebAndroid &&
          typeof window.RSWebAndroid.restartRetroShareService === 'function') {
        console.warn(TAG, 'fetchAccounts: requesting Android service restart');
        showAlert('Restarting RetroShare background service...', 'error');
        window.RSWebAndroid.restartRetroShareService();
      } else {
        showAlert('Connecting to RetroShare background service...', 'error');
      }
      setTimeout(fetchAccounts, 2000);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    const select   = document.getElementById('rs-login-account');
    const pwInput  = document.getElementById('rs-login-password');
    const btn      = document.getElementById('rs-btn-login');
    const selId    = select.value;
    const password = pwInput.value;

    console.log(TAG, 'handleLogin: selId:', selId, '| pw length:', password.length);
    if (!selId) { showAlert('Please select an account profile.', 'error'); return; }
    const acc = accountsList.find(a => a.mLocationId === selId);
    if (!acc)  { console.error(TAG, 'handleLogin: account not found'); return; }

    setLoading(btn, true, 'Logging in...');
    hideAlert();

    try {
      const apiPass = await deriveApiToken(acc.mPgpName, password);
      console.log(TAG, 'handleLogin: calling attemptLogin for pgpName:', acc.mPgpName);
      const res = await rsApiCall('/rsLoginHelper/attemptLogin', {
        account:  selId,
        password: password,
        apiUser:  acc.mPgpName,
        apiPass:  apiPass
      });
      console.log(TAG, 'handleLogin: retval=', res && res.retval);

      if (res && (res.retval === 0 || res.retval === 1)) {
        console.log(TAG, 'handleLogin: ✅ success — calling finishAndLoad()');
        showAlert('Login successful! Loading WebUI...', 'success');
        finishAndLoad(acc.mPgpName, apiPass);
      } else {
        console.warn(TAG, 'handleLogin: ❌ rejected retval:', res && res.retval);
        showAlert('Invalid password. Please try again.', 'error');
        setLoading(btn, false, 'Log In');
      }
    } catch (err) {
      console.error(TAG, 'handleLogin: ❌ exception:', err.message);
      showAlert('Login error: ' + err.message, 'error');
      setLoading(btn, false, 'Log In');
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    const username = document.getElementById('rs-create-username').value.trim();
    const nodename = document.getElementById('rs-create-nodename').value.trim() || 'WebUI Node';
    const password = document.getElementById('rs-create-password').value;
    const confirm  = document.getElementById('rs-create-confirm').value;
    const btn      = document.getElementById('rs-btn-create');

    console.log(TAG, 'handleCreate: user:', username, '| node:', nodename);
    if (!username)            { showAlert('Please enter a PGP profile username.', 'error'); return; }
    if (password !== confirm) { showAlert('Passwords do not match.', 'error');              return; }
    if (password.length < 4)  { showAlert('Password must be at least 4 characters.', 'error'); return; }

    setLoading(btn, true, 'Creating Profile...');
    hideAlert();

    try {
      const apiPass = await deriveApiToken(username, password);
      const res = await rsApiCall('/rsLoginHelper/createLocationV2', {
        locationName: nodename,
        pgpName:      username,
        password:     password,
        apiUser:      username,
        apiPass:      apiPass
      });
      console.log(TAG, 'handleCreate: response:', JSON.stringify(res));
      const ok = res && res.retval && (res.retval.errorNumber === 0 || res.retval === true);
      if (ok || res.locationId) {
        console.log(TAG, 'handleCreate: ✅ — calling finishAndLoad()');
        showAlert('Profile created! Loading WebUI...', 'success');
        finishAndLoad(username, apiPass);
      } else {
        const msg = res.retval?.errorMessage || 'Profile creation failed.';
        console.warn(TAG, 'handleCreate: ❌', msg);
        showAlert(msg, 'error');
        setLoading(btn, false, 'Create Profile');
      }
    } catch (err) {
      console.error(TAG, 'handleCreate: ❌ exception:', err.message);
      showAlert('Profile creation error: ' + err.message, 'error');
      setLoading(btn, false, 'Create Node Profile');
    }
  }

  function showAlert(msg, type) {
    const el = document.getElementById('rs-auth-alert');
    if (!el) return;
    el.textContent = msg;
    el.className   = 'rs-auth-alert ' + type;
    el.style.display = '';
  }
  function hideAlert() {
    const el = document.getElementById('rs-auth-alert');
    if (el) el.style.display = 'none';
  }
  function setLoading(btn, loading, text) {
    if (!btn) return;
    btn.disabled = loading;
    btn.innerHTML = loading ? `<span class="rs-auth-spinner"></span> ${text}` : text;
  }

  // ─── Bootstrap ────────────────────────────────────────────────────────────────
  console.log(TAG, 'document.readyState:', document.readyState);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      console.log(TAG, 'DOMContentLoaded — calling checkAuthStatus()');
      checkAuthStatus();
    });
  } else {
    console.log(TAG, 'doc ready — calling checkAuthStatus() immediately');
    checkAuthStatus();
  }
})();
