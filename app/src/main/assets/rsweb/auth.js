/**
 * RetroShare WebUI Auth Portal (rsWeb Custom Extensions)
 * Manages Account Login and Node Creation via HTTP JSON API at http://127.0.0.1:9092
 */

(function () {
  const API_BASE = (window.location.protocol === 'file:') ? 'http://127.0.0.1:9092' : window.location.origin;
  let accountsList = [];

  // Immediately sync credentials from localStorage to sessionStorage at script load time
  // so app.js sees rs_isVerified='true' when evaluating loginKey
  try {
    if (!sessionStorage.getItem('rs_isVerified') && localStorage.getItem('rs_isVerified') === 'true') {
      sessionStorage.setItem('rs_username', localStorage.getItem('rs_username') || '');
      sessionStorage.setItem('rs_passwd', localStorage.getItem('rs_passwd') || '');
      sessionStorage.setItem('rs_url', localStorage.getItem('rs_url') || API_BASE);
      sessionStorage.setItem('rs_isVerified', 'true');
    }
  } catch (e) {
    console.error('Immediate session sync error', e);
  }

  async function deriveApiToken(locationId, password) {
    try {
      const msgUint8 = new TextEncoder().encode(locationId + ':' + password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      console.error('SHA256 error', e);
      return password;
    }
  }

  async function rsApiCall(endpoint, params = {}) {
    const res = await fetch(API_BASE + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  }

  function saveSessionCredentials(username, apiPass) {
    try {
      sessionStorage.setItem('rs_username', username);
      sessionStorage.setItem('rs_passwd', apiPass);
      sessionStorage.setItem('rs_url', API_BASE);
      sessionStorage.setItem('rs_isVerified', 'true');

      localStorage.setItem('rs_username', username);
      localStorage.setItem('rs_passwd', apiPass);
      localStorage.setItem('rs_url', API_BASE);
      localStorage.setItem('rs_isVerified', 'true');
    } catch (e) {
      console.error('Failed to save session credentials', e);
    }
  }

  async function checkAuthStatus() {
    try {
      // Re-verify sync
      if (!sessionStorage.getItem('rs_isVerified') && localStorage.getItem('rs_isVerified') === 'true') {
        sessionStorage.setItem('rs_username', localStorage.getItem('rs_username') || '');
        sessionStorage.setItem('rs_passwd', localStorage.getItem('rs_passwd') || '');
        sessionStorage.setItem('rs_url', localStorage.getItem('rs_url') || API_BASE);
        sessionStorage.setItem('rs_isVerified', 'true');
        // Reload so app.js parses with rs_isVerified='true'
        window.location.reload();
        return true;
      }

      const data = await rsApiCall('/rsLoginHelper/isLoggedIn');
      if (data && (data.retval === true || data.retval === 1)) {
        console.log('RetroShare core is logged in!');
        if (sessionStorage.getItem('rs_isVerified') === 'true') {
          const overlay = document.getElementById('rs-auth-overlay');
          if (overlay) overlay.remove();
          if (typeof window.load_ui === 'function') {
            window.load_ui();
          }
          return true;
        }
      }
    } catch (e) {
      console.log('RetroShare C++ daemon initializing...', e);
    }
    showAuthOverlay();
    return false;
  }

  function showAuthOverlay() {
    if (document.getElementById('rs-auth-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'rs-auth-overlay';
    overlay.innerHTML = `
      <div class="rs-auth-card">
        <div class="rs-auth-header">
          <div class="rs-auth-logo">
            <img src="images/retroshare.svg" alt="RetroShare Logo" />
          </div>
          <h2 class="rs-auth-title">RetroShare Web</h2>
          <p class="rs-auth-subtitle">Decentralized Web Interface</p>
        </div>

        <div class="rs-auth-tabs">
          <button class="rs-auth-tab active" data-tab="login">Login</button>
          <button class="rs-auth-tab" data-tab="create">Create Profile</button>
        </div>

        <div id="rs-auth-alert" class="rs-auth-alert"></div>

        <!-- Login Form -->
        <form id="rs-form-login">
          <div class="rs-auth-form-group">
            <label class="rs-auth-label" for="rs-login-account">Select Profile / Node</label>
            <select id="rs-login-account" class="rs-auth-select">
              <option value="">Loading node profiles...</option>
            </select>
          </div>
          <div class="rs-auth-form-group">
            <label class="rs-auth-label" for="rs-login-password">Password</label>
            <input type="password" id="rs-login-password" class="rs-auth-input" placeholder="Enter node password" autocomplete="current-password" required />
          </div>
          <button type="submit" id="rs-btn-login" class="rs-auth-btn">Log In</button>
        </form>

        <!-- Create Node Form -->
        <form id="rs-form-create" style="display: none;">
          <div class="rs-auth-form-group">
            <label class="rs-auth-label" for="rs-create-username">PGP Profile Name</label>
            <input type="text" id="rs-create-username" class="rs-auth-input" placeholder="e.g. Alice" autocomplete="username" required />
          </div>
          <div class="rs-auth-form-group">
            <label class="rs-auth-label" for="rs-create-nodename">Node Location Name</label>
            <input type="text" id="rs-create-nodename" class="rs-auth-input" placeholder="e.g. Phone Node" value="WebUI Node" required />
          </div>
          <div class="rs-auth-form-group">
            <label class="rs-auth-label" for="rs-create-password">Password</label>
            <input type="password" id="rs-create-password" class="rs-auth-input" placeholder="Min 4 characters" autocomplete="new-password" required />
          </div>
          <div class="rs-auth-form-group">
            <label class="rs-auth-label" for="rs-create-confirm">Confirm Password</label>
            <input type="password" id="rs-create-confirm" class="rs-auth-input" placeholder="Repeat password" autocomplete="new-password" required />
          </div>
          <button type="submit" id="rs-btn-create" class="rs-auth-btn">Create Node Profile</button>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    setupEventListeners();
    fetchAccounts();
  }

  function setupEventListeners() {
    const tabs = document.querySelectorAll('.rs-auth-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const targetTab = tab.getAttribute('data-tab');
        document.getElementById('rs-form-login').style.display = targetTab === 'login' ? 'block' : 'none';
        document.getElementById('rs-form-create').style.display = targetTab === 'create' ? 'block' : 'none';

        hideAlert();
      });
    });

    document.getElementById('rs-form-login').addEventListener('submit', handleLogin);
    document.getElementById('rs-form-create').addEventListener('submit', handleCreate);
  }

  async function fetchAccounts() {
    const select = document.getElementById('rs-login-account');
    if (!select) return;

    try {
      const data = await rsApiCall('/rsLoginHelper/getLocations');
      accountsList = (data && data.locations) ? data.locations.filter(Boolean) : [];

      select.innerHTML = '';
      if (accountsList.length === 0) {
        select.innerHTML = '<option value="">No existing nodes found. Create a new one!</option>';
        document.querySelector('[data-tab="create"]').click();
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
      console.error('Failed to fetch accounts', e);
      showAlert('Connecting to RetroShare background service...', 'error');
      setTimeout(fetchAccounts, 2000);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    const select = document.getElementById('rs-login-account');
    const passwordInput = document.getElementById('rs-login-password');
    const btn = document.getElementById('rs-btn-login');

    const selectedId = select.value;
    const password = passwordInput.value;

    if (!selectedId) {
      showAlert('Please select an account profile.', 'error');
      return;
    }

    const acc = accountsList.find(a => a.mLocationId === selectedId);
    if (!acc) return;

    setLoading(btn, true, 'Logging in...');
    hideAlert();

    try {
      const apiPass = await deriveApiToken(acc.mPgpName, password);
      const res = await rsApiCall('/rsLoginHelper/attemptLogin', {
        account: selectedId,
        password: password,
        apiUser: acc.mPgpName,
        apiPass: apiPass
      });

      if (res && (res.retval === 0 || res.retval === 1)) {
        saveSessionCredentials(acc.mPgpName, apiPass);
        showAlert('Login successful! Opening WebUI...', 'success');
        finishLogin();
      } else {
        showAlert('Invalid password. Please try again.', 'error');
        setLoading(btn, false, 'Log In');
      }
    } catch (err) {
      showAlert('Login error: ' + err.message, 'error');
      setLoading(btn, false, 'Log In');
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    const username = document.getElementById('rs-create-username').value.trim();
    const nodename = document.getElementById('rs-create-nodename').value.trim() || 'WebUI Node';
    const password = document.getElementById('rs-create-password').value;
    const confirm = document.getElementById('rs-create-confirm').value;
    const btn = document.getElementById('rs-btn-create');

    if (!username) {
      showAlert('Please enter a PGP profile username.', 'error');
      return;
    }
    if (password !== confirm) {
      showAlert('Passwords do not match.', 'error');
      return;
    }
    if (password.length < 4) {
      showAlert('Password must be at least 4 characters long.', 'error');
      return;
    }

    setLoading(btn, true, 'Creating Profile...');
    hideAlert();

    try {
      const apiPass = await deriveApiToken(username, password);
      const res = await rsApiCall('/rsLoginHelper/createLocationV2', {
        locationName: nodename,
        pgpName: username,
        password: password,
        apiUser: username,
        apiPass: apiPass
      });

      console.log('Create account response:', res);
      const success = res && res.retval && (res.retval.errorNumber === 0 || res.retval === true);

      if (success || res.locationId) {
        saveSessionCredentials(username, apiPass);
        showAlert('Profile created successfully! Opening WebUI...', 'success');
        finishLogin();
      } else {
        const msg = res.retval?.errorMessage || 'Profile creation failed.';
        showAlert(msg, 'error');
        setLoading(btn, false, 'Create Node Profile');
      }
    } catch (err) {
      showAlert('Profile creation error: ' + err.message, 'error');
      setLoading(btn, false, 'Create Node Profile');
    }
  }

  function finishLogin() {
    setTimeout(() => {
      window.location.reload();
    }, 400);
  }

  function showAlert(msg, type) {
    const alert = document.getElementById('rs-auth-alert');
    if (!alert) return;
    alert.textContent = msg;
    alert.className = 'rs-auth-alert ' + type;
  }

  function hideAlert() {
    const alert = document.getElementById('rs-auth-alert');
    if (alert) alert.style.display = 'none';
  }

  function setLoading(btn, isLoading, text) {
    if (!btn) return;
    btn.disabled = isLoading;
    if (isLoading) {
      btn.innerHTML = `<span class="rs-auth-spinner"></span> ${text}`;
    } else {
      btn.textContent = text;
    }
  }

  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuthStatus);
  } else {
    checkAuthStatus();
  }
})();
