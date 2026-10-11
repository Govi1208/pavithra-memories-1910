// Gallery page: once the visitor has scrolled ~75% of the page, offer a link to review.html.
// Shown at most once per browser session once dismissed; never while the photo viewer is open,
// during the loader, or while a finger/mouse is pressed (so it cannot interrupt a drag).
(function () {
  'use strict';

  var KEY = 'reviewPopupDismissed';
  var THRESHOLD = 0.75;
  var root = document.documentElement;
  var lightbox = document.getElementById('lightbox');
  var pop = null;
  var pressed = false;
  var scrolled = false;

  function dismissed() { try { return sessionStorage.getItem(KEY) === 'true'; } catch (e) { return false; } }
  function remember() { try { sessionStorage.setItem(KEY, 'true'); } catch (e) { /* storage blocked: shown again on reload only */ } }
  if (dismissed()) return;

  function depth() {
    var max = root.scrollHeight - window.innerHeight;
    return max > window.innerHeight * 0.5 ? window.scrollY / max : 0; // ignore pages that barely scroll
  }

  function canShow() {
    return scrolled && !pressed &&
      !root.classList.contains('locked') && !root.classList.contains('no-scroll') && // gate, loader, viewer
      !(lightbox && !lightbox.hidden) && depth() >= THRESHOLD;
  }

  function hide() {
    remember();
    window.removeEventListener('scroll', check);
    if (!pop) return;
    pop.classList.remove('in');
    var p = pop;
    pop = null;
    setTimeout(function () { p.remove(); }, 500);
    document.removeEventListener('keydown', onKey);
  }

  function onKey(e) { if (e.key === 'Escape') hide(); }

  function show() {
    window.removeEventListener('scroll', check);
    pop = document.createElement('div');
    pop.className = 'rv-pop';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-modal', 'false');
    pop.setAttribute('aria-labelledby', 'rv-pop-title');
    pop.innerHTML =
      '<svg class="rv-heart" viewBox="0 0 24 22" aria-hidden="true" focusable="false" style="display:block;width:20px;height:18px;margin:0 auto;fill:#e2a3ab"><path d="M12 21C5 15.5 1 12 1 7.2 1 3.9 3.5 1.5 6.6 1.5c2.2 0 4.2 1.2 5.4 3.1 1.2-1.9 3.2-3.1 5.4-3.1C20.5 1.5 23 3.9 23 7.2 23 12 19 15.5 12 21z"/></svg>' +
      '<h2 id="rv-pop-title">One Little Thing Before You Go...</h2>' +
      '<p>You’ve seen our memories. Now, I’d love to know how you felt about the little gifts I chose for you.</p>' +
      '<div class="rv-pop-actions">' +
        '<a class="rv-btn" href="review.html" id="rv-pop-go">Write Your Review</a>' +
        '<button type="button" class="rv-btn rv-btn-quiet" id="rv-pop-later">Maybe Later</button>' +
      '</div>';
    document.body.appendChild(pop);
    pop.querySelector('#rv-pop-go').addEventListener('click', remember);
    pop.querySelector('#rv-pop-later').addEventListener('click', hide);
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(function () { requestAnimationFrame(function () { if (pop) pop.classList.add('in'); }); });
  }

  var timer = 0;
  function check() {
    scrolled = true;
    clearTimeout(timer);
    if (canShow()) { show(); return; }
    if (depth() >= THRESHOLD) timer = setTimeout(check, 600); // blocked right now (viewer open, pressed): retry
  }

  document.addEventListener('pointerdown', function () { pressed = true; }, { passive: true, capture: true });
  ['pointerup', 'pointercancel'].forEach(function (t) {
    document.addEventListener(t, function () { pressed = false; }, { passive: true, capture: true });
  });
  window.addEventListener('scroll', check, { passive: true });
})();
