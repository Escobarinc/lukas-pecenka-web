(() => {
  const sessionKey = 'lp-admin-session-v1';
  const sessionValue = 'pecenka-admin-authenticated';
  const passwordHash = '1fba8feee8e4719016fb07cf3e232153ecb10eb3381742986ad973d4573c62cc';
  const allowedPages = new Set(['index.html', 'sluzby.html', 'jak-to-probiha.html', 'sanacni-pruzkum.html', 'ukazka-pruzkumu.html', 'reference.html', 'o-mne.html', 'kontakt.html']);
  const requestedPage = new URLSearchParams(location.search).get('next') || 'index.html';
  const destinationPage = allowedPages.has(requestedPage) ? requestedPage : 'index.html';
  const destination = `${destinationPage}?admin=43`;
  const form = document.querySelector('.admin-login-form');
  const password = document.querySelector('#admin-password');
  const toggle = document.querySelector('.admin-password-toggle');
  const status = document.querySelector('.admin-login-status');
  const submit = document.querySelector('.admin-submit');
  let attempts = 0;

  async function sha256(value) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  toggle.addEventListener('click', () => {
    const visible = password.type === 'text';
    password.type = visible ? 'password' : 'text';
    toggle.textContent = visible ? 'Zobrazit' : 'Skrýt';
    toggle.setAttribute('aria-label', visible ? 'Zobrazit heslo' : 'Skrýt heslo');
    toggle.setAttribute('aria-pressed', String(!visible));
    password.focus();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!password.value) {
      status.textContent = 'Zadejte heslo.';
      password.focus();
      return;
    }
    submit.disabled = true;
    status.textContent = 'Ověřuji přihlášení…';
    const valid = await sha256(password.value) === passwordHash;
    if (valid) {
      sessionStorage.setItem(sessionKey, sessionValue);
      status.classList.add('is-success');
      status.textContent = 'Přihlášení proběhlo úspěšně.';
      setTimeout(() => location.replace(destination), 350);
      return;
    }
    attempts += 1;
    status.classList.remove('is-success');
    status.textContent = attempts >= 3 ? 'Heslo není správné. Zkontrolujte zápis a zkuste to znovu.' : 'Nesprávné heslo.';
    password.value = '';
    password.focus();
    submit.disabled = false;
  });
})();
