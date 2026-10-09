/* Heart ripple: a tiny wave of glowing love wherever the page is clicked or tapped.
   Passive listeners only, never blocks clicks or scrolling; each ripple removes itself. */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var MAX_LIVE = 5;      // cap on simultaneous ripples
  var MIN_GAP = 140;     // ms between ripples when tapping rapidly
  var MOVE_LIMIT = 10;   // px of travel before a press counts as a scroll/drag, not a tap
  var LIFE = 1000;       // ms, longest animation; also the cleanup fallback
  var PARTICLES = 6;

  var HEART = '<svg viewBox="0 0 24 22" aria-hidden="true" focusable="false"><path d="M12 21C5 15.5 1 12 1 7.2 1 3.9 3.5 1.5 6.6 1.5c2.2 0 4.2 1.2 5.4 3.1 1.2-1.9 3.2-3.1 5.4-3.1C20.5 1.5 23 3.9 23 7.2 23 12 19 15.5 12 21z"/></svg>';

  var layer = document.createElement('div');
  layer.className = 'heart-ripple-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  var live = 0;
  var lastAt = 0;
  var start = null;

  function spawn(x, y) {
    var now = Date.now();
    if (now - lastAt < MIN_GAP || live >= MAX_LIVE) return;
    lastAt = now;

    var r = document.createElement('div');
    r.className = 'hr';
    r.style.left = x + 'px';
    r.style.top = y + 'px';

    var html = '<i class="hr-glow"></i><i class="hr-ring"></i><span class="hr-main">' + HEART + '</span>';
    var offset = Math.random() * 60;
    for (var i = 0; i < PARTICLES; i++) {
      var a = (offset + i * (360 / PARTICLES)) * Math.PI / 180;
      var d = 34 + Math.random() * 22;
      html += '<span class="hr-p" style="--dx:' + (Math.cos(a) * d).toFixed(1) + 'px;--dy:' + (Math.sin(a) * d).toFixed(1) +
        'px;--s:' + (0.7 + Math.random() * 0.5).toFixed(2) + ';--t:' + (i % 2 ? '#ffd9e3' : '#ff9db8') + '">' + HEART + '</span>';
    }
    r.innerHTML = html;

    live++;
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      live--;
      if (r.parentNode) r.parentNode.removeChild(r);
    }
    r.querySelector('.hr-glow').addEventListener('animationend', finish);
    setTimeout(finish, LIFE + 300);
    layer.appendChild(r);
  }

  function ignored(target) {
    return !!(target && target.closest && target.closest('input, textarea, select, [contenteditable="true"]'));
  }

  document.addEventListener('pointerdown', function (e) {
    start = e.isPrimary === false || ignored(e.target) ? null : { x: e.clientX, y: e.clientY, id: e.pointerId };
  }, { passive: true, capture: true });

  document.addEventListener('pointerup', function (e) {
    var s = start;
    start = null;
    if (!s || s.id !== e.pointerId || (reduce && reduce.matches)) return;
    if (Math.abs(e.clientX - s.x) > MOVE_LIMIT || Math.abs(e.clientY - s.y) > MOVE_LIMIT) return;
    spawn(e.clientX, e.clientY);
  }, { passive: true, capture: true });

  document.addEventListener('pointercancel', function () { start = null; }, { passive: true, capture: true });
})();
