// Password gate. The password lives in config/password.json (not in this file).
// This is a static site, so it only keeps casual visitors out; it is not real security.
(function () {
  var root = document.documentElement;
  var gate = document.getElementById('gate');
  // already unlocked in this browser session: the loader starts straight away (see js/script.js)
  if (!gate || !root.classList.contains('locked')) return;

  var form = document.getElementById('gate-form');
  var field = document.getElementById('gate-field');
  var input = document.getElementById('gate-input');
  var toggle = document.getElementById('gate-toggle');
  var button = document.getElementById('gate-btn');
  var message = document.getElementById('gate-error');
  var busy = false;

  var WRONG = 'Hmm... that’s not our secret <span class="heart" aria-hidden="true">&#9829;</span>';
  var FAILED = 'Something went wrong. Please try again.';

  function setBusy(on) {
    busy = on;
    input.disabled = on;
    button.disabled = on;
    toggle.disabled = on;
  }

  function showMessage(html) { message.innerHTML = html; } // only ever fixed strings from above

  function wrong() {
    showMessage(WRONG);
    input.value = '';
    field.classList.remove('gate-shake');
    void field.offsetWidth; // restart the (very small) shake
    field.classList.add('gate-shake');
    input.focus();
  }

  function unlock() {
    try { sessionStorage.setItem('birthdayUnlocked', 'true'); } catch (e) { /* storage blocked: just no skip on refresh */ }
    gate.classList.add('gate-leaving');
    setTimeout(function () {
      root.classList.remove('locked'); // the existing loader appears, then its 3 seconds begin
      gate.remove();                   // takes this form and its listeners with it
      document.dispatchEvent(new Event('birthday:unlocked'));
    }, 600);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    var entered = input.value;
    if (!entered) { input.focus(); return; }

    showMessage('');
    setBusy(true);
    fetch('config/password.json', { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || data.password === undefined) throw new Error('password.json has no "password"');
        if (entered === String(data.password)) { unlock(); return; }
        setBusy(false);
        wrong();
      })
      .catch(function (err) {
        console.error('Password check failed:', err); // details stay in the console only
        setBusy(false);
        showMessage(FAILED);
      });
  });

  toggle.addEventListener('click', function () {
    var show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    toggle.textContent = show ? 'Hide' : 'Show';
    toggle.setAttribute('aria-pressed', String(show));
    toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    input.focus();
  });

  // desktop: ready to type; phones: wait for a tap, so the keyboard does not pop up over the sky
  if (window.matchMedia('(hover: hover)').matches) input.focus();
})();
