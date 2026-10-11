// Review page: 20 gift ratings + comments, overall rating, personal message.
// "Send My Review" builds one WhatsApp message and opens it prefilled (wa.me click-to-chat);
// the visitor taps Send in WhatsApp herself. Nothing is sent by this page, and there is no backend.
(function () {
  'use strict';

  var CFG = window.REVIEW_CONFIG || {};
  var GIFTS = CFG.gifts || [];
  var MIN = CFG.minMessageLength || 300;
  var MAX = CFG.maxMessageLength || 2000;
  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.4l2.9 6.2 6.8.8-5 4.6 1.4 6.7L12 17.3 5.9 20.7l1.4-6.7-5-4.6 6.8-.8z"/></svg>';
  var GIFT_ICON = '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><rect x="8" y="20" width="32" height="20" rx="2"/><rect x="6" y="14" width="36" height="7" rx="2"/><path d="M24 14v26M24 14c-3-7-12-7-12-2.5S20 14 24 14zm0 0c3-7 12-7 12-2.5S28 14 24 14z"/></svg>';

  var values = {};      // gift index -> rating; 'overall' -> rating
  var setters = {};     // key -> function that sets that rating (used to restore a saved draft)
  var lastText = '';    // the most recently built WhatsApp message
  var form = document.getElementById('review-form');

  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  // ---- 1-10 star rating (a radio group: mouse, touch and keyboard) --------------------------
  function buildStars(host, key, label) {
    host.className = 'stars';
    host.setAttribute('role', 'radiogroup');
    if (label) host.setAttribute('aria-label', label);
    else host.setAttribute('aria-labelledby', host.getAttribute('data-labelledby'));
    var out = el('span', 'stars-out', 'Not rated');
    var row = el('div', 'stars-row');
    var btns = [];
    for (var i = 1; i <= 10; i++) {
      var b = el('button', 'star', STAR);
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-label', i + ' out of 10');
      b.setAttribute('aria-checked', 'false');
      b.tabIndex = i === 1 ? 0 : -1;
      b.dataset.v = i;
      row.appendChild(b);
      btns.push(b);
    }
    host.appendChild(row);
    host.appendChild(out);

    function paint(v, preview) {
      btns.forEach(function (b, idx) {
        b.classList.toggle('on', idx < v);
        b.classList.toggle('preview', !!preview);
        var checked = !preview && values[key] === idx + 1;
        b.setAttribute('aria-checked', String(checked));
      });
      var cur = values[key] || 0;
      out.textContent = (preview ? v : cur) ? (preview ? v : cur) + ' / 10' : 'Not rated';
      out.classList.toggle('set', !!cur);
    }
    function set(v) {
      values[key] = v;
      btns.forEach(function (b, idx) { b.tabIndex = idx + 1 === v ? 0 : -1; });
      paint(v, false);
      if (key === 'overall') document.getElementById('err-overall').textContent = '';
      if (typeof key === 'number') { // rating given: drop the "please rate" part of this gift's message
        var ge = document.getElementById('err-gift-' + (key + 1));
        if (ge && /^Please rate this gift from/.test(ge.textContent)) ge.textContent = '';
        else if (ge && /^Please rate this gift and/.test(ge.textContent)) ge.textContent = 'Please add a comment for this gift.';
      }
      saveDraft();
    }
    setters[key] = set;
    row.addEventListener('click', function (e) {
      var b = e.target.closest('.star');
      if (b) set(Number(b.dataset.v));
    });
    row.addEventListener('pointerover', function (e) {
      if (e.pointerType !== 'mouse') return;
      var b = e.target.closest('.star');
      if (b) paint(Number(b.dataset.v), true);
    });
    row.addEventListener('pointerleave', function () { paint(values[key] || 0, false); });
    row.addEventListener('keydown', function (e) {
      var cur = values[key] || 0, next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(10, cur + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(1, cur - 1);
      else if (e.key === 'Home') next = 1;
      else if (e.key === 'End') next = 10;
      if (next === null) return;
      e.preventDefault();
      set(next);
      btns[next - 1].focus();
    });
    paint(0, false);
  }

  // ---- photo carousel: swipe sideways one photo after another (scroll-snap), dots + arrows ---------
  function buildCarousel(host, track, name, count) {
    host.classList.add('carousel');
    track.tabIndex = 0;
    track.setAttribute('role', 'group');
    track.setAttribute('aria-roledescription', 'carousel');
    track.setAttribute('aria-label', 'Photos of ' + name + '. Swipe sideways to see the next one.');
    host.appendChild(track);

    var badge = el('span', 'gift-badge', '1/' + count);
    badge.setAttribute('aria-hidden', 'true');
    host.appendChild(badge);

    var dots = el('div', 'gift-dots');
    var dotBtns = [];
    function go(i) {
      i = Math.max(0, Math.min(count - 1, i));
      track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
    }
    for (var k = 0; k < count; k++) {
      var d = el('button', 'gift-dot');
      d.type = 'button';
      d.setAttribute('aria-label', 'Photo ' + (k + 1) + ' of ' + count);
      d.addEventListener('click', go.bind(null, k));
      dots.appendChild(d);
      dotBtns.push(d);
    }
    host.appendChild(dots);

    var prev = el('button', 'gift-arrow prev', '&#8249;');
    var next = el('button', 'gift-arrow next', '&#8250;');
    prev.type = next.type = 'button';
    prev.setAttribute('aria-label', 'Previous photo');
    next.setAttribute('aria-label', 'Next photo');
    prev.addEventListener('click', function () { go(current() - 1); });
    next.addEventListener('click', function () { go(current() + 1); });
    host.appendChild(prev);
    host.appendChild(next);

    function current() { return Math.round(track.scrollLeft / (track.clientWidth || 1)); }
    var raf = 0;
    function update() {
      raf = 0;
      var c = current();
      dotBtns.forEach(function (b, idx) { b.classList.toggle('on', idx === c); b.setAttribute('aria-current', idx === c ? 'true' : 'false'); });
      badge.textContent = (c + 1) + '/' + count;
      prev.hidden = c <= 0;
      next.hidden = c >= count - 1;
    }
    track.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', function () { track.scrollLeft = current() * track.clientWidth; update(); });
    update();
  }

  // ---- gift cards ----------------------------------------------------------------------------
  function buildGifts() {
    var grid = document.getElementById('gift-grid');
    GIFTS.forEach(function (g, i) {
      var n = i + 1;
      var li = el('li', 'gift');
      var photos = el('div', 'gift-photos');
      var shown = (g.photos || []).slice(0, 6);
      if (!shown.length) shown = [null];
      var multi = shown.length > 1;
      var track = multi ? el('div', 'gift-track') : photos; // several photos: a swipeable row
      shown.forEach(function (src) {
        var frame = el('div', 'gift-photo');
        var ph = el('div', 'gift-ph', GIFT_ICON);
        frame.appendChild(ph);
        if (src) {
          var img = el('img');
          img.alt = g.name;
          img.loading = 'lazy';
          img.decoding = 'async';
          img.addEventListener('error', function () { img.remove(); });
          img.src = src;
          frame.appendChild(img);
        }
        track.appendChild(frame);
      });
      if (multi) buildCarousel(photos, track, g.name, shown.length);
      li.appendChild(photos);

      var head = el('div', 'gift-head', '<span class="gift-no">' + pad(n) + '</span><h3>' + escapeHtml(g.name) + '</h3>');
      li.appendChild(head);

      var stars = el('div');
      buildStars(stars, i, 'Rating for ' + g.name);
      li.appendChild(stars);

      var id = 'comment-' + n;
      var wrap = el('div', 'gift-comment');
      wrap.innerHTML = '<label for="' + id + '">Comment</label>';
      var ta = el('textarea');
      ta.id = id;
      ta.rows = 2;
      ta.maxLength = 500;
      ta.required = true;
      ta.placeholder = 'A few words...';
      wrap.appendChild(ta);
      var err = el('p', 'rv-error');
      err.id = 'err-gift-' + n;
      err.setAttribute('role', 'alert');
      wrap.appendChild(err);
      li.appendChild(wrap);
      grid.appendChild(li);
    });
  }

  // ---- validation ------------------------------------------------------------------------------
  var msgEl = document.getElementById('personal-message');
  var countEl = document.getElementById('msg-count');

  function msgLen() { return msgEl.value.trim().length; }
  function updateCount() {
    var len = msgLen();
    var ok = len >= MIN;
    countEl.textContent = ok ? len + ' / ' + MAX + ' characters' : len + ' / ' + MIN + ' characters minimum (' + MAX + ' maximum)';
    countEl.classList.toggle('ok', ok);
    if (ok) document.getElementById('err-message').textContent = '';
  }

  function validate() {
    var first = null;
    function fail(id, msg, target) {
      document.getElementById(id).textContent = msg;
      if (!first) first = target;
    }
    document.getElementById('err-overall').textContent = '';
    document.getElementById('err-message').textContent = '';
    function valid(v) { return Number.isInteger(v) && v >= 1 && v <= 10; }
    // every gift needs a 1-10 rating and a comment (checked in page order, so focus goes to the first gap)
    GIFTS.forEach(function (g, i) {
      var card = document.querySelectorAll('.gift')[i];
      var comment = document.getElementById('comment-' + (i + 1));
      var needRating = !valid(values[i]);
      var needComment = !comment.value.trim();
      var msg = needRating && needComment ? 'Please rate this gift and add a comment.' :
        needRating ? 'Please rate this gift from 1 to 10.' : needComment ? 'Please add a comment for this gift.' : '';
      document.getElementById('err-gift-' + (i + 1)).textContent = msg;
      if (needRating) fail('err-form', 'Every gift needs a rating and a comment. Please complete the ones marked below.', card.querySelector('.star'));
      else if (needComment) fail('err-form', 'Every gift needs a rating and a comment. Please complete the ones marked below.', comment);
    });
    if (!valid(values.overall)) fail('err-overall', 'Please choose an overall rating from 1 to 10.', document.querySelector('#overall-stars .star'));
    var len = msgLen();
    if (!len) fail('err-message', 'Please write your message. It needs at least ' + MIN + ' characters.', msgEl);
    else if (len < MIN) fail('err-message', 'Your message needs at least ' + MIN + ' characters. ' + (MIN - len) + ' more to go.', msgEl);
    if (first) { first.focus(); return false; }
    return true;
  }

  // ---- WhatsApp message (no prices anywhere) ---------------------------------------------------
  function buildMessage() {
    var L = [
      '*PAVITHRA\'S BIRTHDAY GIFT REVIEW*', '',
      '*OVERALL RATING*', values.overall + '/10', '',
      '*INDIVIDUAL GIFT REVIEWS*', ''
    ];
    GIFTS.forEach(function (g, i) {
      var c = document.getElementById('comment-' + (i + 1)).value.trim().replace(/\s*\n\s*/g, ' ');
      L.push(pad(i + 1) + '. ' + g.name);
      L.push('Rating: ' + values[i] + '/10');
      L.push('Comment: ' + c);
      L.push('');
    });
    L.push('*HER PERSONAL MESSAGE*', '', msgEl.value.trim());
    return L.join('\n');
  }

  function chatUrl(text) {
    return 'https://wa.me/' + CFG.whatsappNumber + (text ? '?text=' + encodeURIComponent(text) : '');
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var t = document.createElement('textarea');
      t.value = text;
      t.setAttribute('readonly', '');
      t.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(t);
      t.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { /* handled below */ }
      t.remove();
      ok ? resolve() : reject(new Error('copy failed'));
    });
  }

  // ---- notice under the button (never claims the review was sent) ------------------------------
  var noteEl = document.getElementById('wa-note');
  function showNote(text, url) {
    noteEl.hidden = false;
    noteEl.innerHTML = '<p></p><p class="rv-note-actions"></p>';
    noteEl.firstChild.textContent = text;
    var actions = noteEl.lastChild;
    if (url) {
      var a = el('a', 'rv-link');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = 'Open WhatsApp again';
      actions.appendChild(a);
    }
    var b = el('button', 'rv-link');
    b.type = 'button';
    b.textContent = 'Copy review text';
    b.addEventListener('click', function () {
      copyText(lastText).then(function () { b.textContent = 'Copied'; }, function () { b.textContent = 'Could not copy'; });
    });
    actions.appendChild(b);
  }

  function submit(e) {
    e.preventDefault();
    var errForm = document.getElementById('err-form');
    errForm.textContent = '';
    noteEl.hidden = true;
    if (!validate()) return;

    lastText = buildMessage();
    var url = chatUrl(lastText);
    if (url.length > (CFG.maxUrlLength || 8000)) {
      errForm.textContent = 'Your review is too long to open in WhatsApp in one go, and I won’t cut any of it. Please shorten some comments or your message a little, or copy the full text and paste it into the chat yourself.';
      showNote('Nothing has been opened or sent.', chatUrl(''));
      return;
    }

    saveDraft();
    var w = window.open(url, '_blank');
    if (w) { try { w.opener = null; } catch (err) { /* cross-origin: fine */ } }
    else window.location.href = url; // pop-up blocked: go there in this tab; the draft is saved
    showNote('Your review is ready in WhatsApp. Please tap Send to share it with Govind.', url);
  }

  // ---- keep the draft, so nothing is lost if WhatsApp does not open or she comes back ----------
  var DRAFT_KEY = 'giftReviewDraft';
  var saveTimer = 0;
  function saveDraft() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var d = { message: msgEl.value, ratings: values, comments: {} };
      GIFTS.forEach(function (g, i) { d.comments[i] = document.getElementById('comment-' + (i + 1)).value; });
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch (err) { /* storage blocked: no draft */ }
    }, 300);
  }
  function restoreDraft() {
    var d;
    try { d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (err) { d = null; }
    if (!d) return;
    msgEl.value = d.message || '';
    Object.keys(d.ratings || {}).forEach(function (k) {
      var v = Number(d.ratings[k]);
      if (setters[k] && v >= 1 && v <= 10) setters[k](v);
    });
    GIFTS.forEach(function (g, i) {
      var ta = document.getElementById('comment-' + (i + 1));
      if (d.comments && d.comments[i]) ta.value = String(d.comments[i]).slice(0, 500);
    });
  }

  msgEl.maxLength = MAX; // the browser stops typing and pasting at the limit
  buildGifts();
  buildStars(document.getElementById('overall-stars'), 'overall', null);
  restoreDraft();
  form.addEventListener('input', saveDraft);
  msgEl.addEventListener('input', updateCount);
  document.getElementById('gift-grid').addEventListener('input', function (e) { // clear a gift's message once she types
    var m = /^comment-(\d+)$/.exec(e.target.id);
    if (m && e.target.value.trim()) document.getElementById('err-gift-' + m[1]).textContent = '';
  });
  form.addEventListener('submit', submit);
  updateCount();
})();
