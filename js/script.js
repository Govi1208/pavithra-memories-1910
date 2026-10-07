// ---- opening loader: shown for about 3 seconds, then fades away ---------------
// index.html starts with <html class="no-scroll">, so the page cannot scroll meanwhile.
(function () {
  var loader = document.querySelector('.birthday-loader');
  if (!loader) return;
  function remove() {
    loader.remove();
    document.documentElement.classList.remove('no-scroll');
  }
  function start() {
    setTimeout(function () {
      loader.classList.add('birthday-loader-hidden');
      setTimeout(remove, 650); // after the 0.6s fade
    }, 3000);
  }
  // behind the password gate the loader waits; js/gate.js announces the unlock
  if (document.documentElement.classList.contains('locked')) {
    document.addEventListener('birthday:unlocked', start, { once: true });
  } else {
    start();
  }
})();
// Ratio steps, in the order given. A photo keeps its ratio; the layout stretches
// each row a little so the row fills the full width with no gaps.
var RATIOS = [
  { name: '1:1',  w: 1080, h: 1080 },
  { name: '2:3',  w: 1000, h: 1500 },
  { name: '3:4',  w: 1200, h: 1600 },
  { name: '4:5',  w: 1080, h: 1350 },
  { name: '9:16', w: 1080, h: 1920 },
  { name: '4:3',  w: 1600, h: 1200 },
  { name: '3:2',  w: 1500, h: 1000 },
  { name: '16:9', w: 1920, h: 1080 },
  { name: '21:9', w: 2560, h: 1080 }
];

// Order, ratio and image of every photo live in config/images.json
// bump this whenever config or images change, so phones don't keep an old cached copy
var VERSION = '20261007a';
var CONFIG_URL = 'config/images.json?v=' + VERSION;
// Optional captions live in config/captions.json as { "image012.jpg": "text" }
var CAPTIONS_URL = 'config/captions.json?v=' + VERSION;
var IMAGE_DIR = 'images/';
var THUMB_DIR = 'images/thumbs/'; // small copies (same file names) used in the gallery

var MOBILE_MAX = 700;

// crop shapes offered in the viewer, looked up in RATIOS above
var VIEWER_RATIOS = ['1:1', '4:5', '9:16', '16:9', '21:9'];

var photos = document.getElementById('photos');
var captions = {};

// Favourites: config/images.json gives each photo's starting `favorite`; what the visitor
// toggles is kept in localStorage under this key ({ "<photo id>": true/false }) and wins.
var FAVORITES_KEY = 'birthdayPhotoFavorites';
var userFavorites = {};
var filter = 'all'; // 'all' or 'fav'

// A photo shows in its own shape (item.ratio === null, "original") unless a crop
// shape was picked for it in the viewer.
function aspectOf(item) {
  if (item.ratio) {
    var r = RATIOS.find(function (x) { return x.name === item.ratio; });
    return r.w / r.h;
  }
  return item.natural;
}

// ---- layout: balanced justified rows -----------------------------------
// Split the photos, in order, into rows whose total aspect is as even as possible,
// then scale each row to exactly the container width. Result: no gaps anywhere.

function layout() {
  var items = Array.prototype.filter.call(photos.children, function (it) { return !it.hidden; });
  var n = items.length;
  if (!n) { photos.style.height = '0px'; return; }

  var mobile = window.innerWidth <= MOBILE_MAX;
  var gap = mobile ? 4 : 8;
  var target = mobile ? 150 : 240;
  var width = photos.clientWidth;

  var aspect = items.map(aspectOf);
  var prefix = [0];
  aspect.forEach(function (a, i) { prefix.push(prefix[i] + a); });
  var total = prefix[n];

  var rows = Math.max(1, Math.min(n, Math.round(total * target / width)));
  var ideal = total / rows;

  // dp[r][j]: least squared deviation using r rows for the first j photos
  var INF = 1e18, dp = [], cut = [];
  for (var r = 0; r <= rows; r++) {
    dp.push(new Array(n + 1).fill(INF));
    cut.push(new Array(n + 1).fill(0));
  }
  dp[0][0] = 0;
  for (r = 1; r <= rows; r++) {
    for (var j = r; j <= n; j++) {
      for (var i = r - 1; i < j; i++) {
        if (dp[r - 1][i] >= INF) continue;
        var d = prefix[j] - prefix[i] - ideal;
        var c = dp[r - 1][i] + d * d;
        if (c < dp[r][j]) { dp[r][j] = c; cut[r][j] = i; }
      }
    }
  }
  var bounds = [], end = n;
  for (r = rows; r >= 1; r--) {
    var start = cut[r][end];
    bounds.unshift([start, end]);
    end = start;
  }

  var top = 0, maxH = target * 2;
  bounds.forEach(function (b) {
    var count = b[1] - b[0];
    var sum = prefix[b[1]] - prefix[b[0]];
    var h = (width - gap * (count - 1)) / sum;
    var left = 0;
    if (h > maxH) { // a very short list (say one favourite): keep it a sensible size and centre it
      h = maxH;
      left = (width - (sum * h + gap * (count - 1))) / 2;
    }
    for (var k = b[0]; k < b[1]; k++) {
      var w = aspect[k] * h;
      var s = items[k].style;
      s.left = left + 'px';
      s.top = top + 'px';
      s.width = w + 'px';
      s.height = h + 'px';
      left += w + gap;
    }
    top += h + gap;
  });
  photos.style.height = (top - gap) + 'px';
}

var resizeTimer;
window.addEventListener('resize', function () {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(layout, 60);
});

// ---- one photo ---------------------------------------------------------

function altText(entry) {
  return captions[entry.image] || 'Memory of Pavithra, photo ' + entry.id;
}

function buildItem(entry) {
  var item = document.createElement('div');
  item.className = 'item';
  item.photoId = entry.id;
  item.file = entry.image;
  item.id = 'photo-' + entry.id;
  item.width = entry.width;
  item.height = entry.height;
  item.natural = entry.width / entry.height;
  item.ratio = entry.ratio && entry.ratio !== 'original' ? entry.ratio : null;

  item.img = document.createElement('img');
  item.img.draggable = false;
  item.img.loading = 'lazy';
  item.img.width = entry.width;
  item.img.height = entry.height;
  item.img.alt = altText(entry);
  item.img.src = THUMB_DIR + entry.image;
  item.tabIndex = 0;
  item.setAttribute('role', 'button');
  item.setAttribute('aria-label', 'Open ' + item.img.alt);

  item.favorite = !!entry.favorite;
  item.defaultFavorite = !!entry.defaultFavorite;
  item.favButton = document.createElement('button');
  item.favButton.type = 'button';
  item.favButton.className = 'fav';
  // a heart press only toggles the favourite: it must not open the viewer or start a drag
  item.favButton.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  item.favButton.addEventListener('click', function (e) { e.stopPropagation(); toggleFavorite(item); });

  item.appendChild(item.img);
  item.appendChild(item.favButton);
  updateHeart(item);
  return item;
}

// ---- favourites -----------------------------------------------------------

// Reads the saved choices. Anything that is not a plain { id: true/false } object (missing,
// corrupted, edited by hand) is ignored rather than allowed to break the page.
function loadFavorites() {
  var clean = {}, saved;
  try { saved = JSON.parse(localStorage.getItem(FAVORITES_KEY)); } catch (e) { return clean; }
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return clean;
  Object.keys(saved).forEach(function (id) {
    if (typeof saved[id] === 'boolean') clean[id] = saved[id];
  });
  return clean;
}

function saveFavorites() {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(userFavorites)); } catch (e) { /* storage blocked */ }
}

function favoriteCount() {
  return Array.prototype.filter.call(photos.children, function (it) { return it.favorite; }).length;
}

function updateHeart(item) {
  item.favButton.textContent = item.favorite ? '♥' : '♡'; // ♥ / ♡
  item.favButton.classList.toggle('on', item.favorite);
  item.favButton.setAttribute('aria-pressed', String(item.favorite));
  item.favButton.setAttribute('aria-label', item.favorite ? 'Remove from favorites' : 'Add to favorites');
}

function popHeart(button) {
  button.classList.remove('pop');
  void button.offsetWidth; // restart the animation
  button.classList.add('pop');
}

// gallery heart, viewer heart, the Favorites count and the saved state all move together
function toggleFavorite(item) {
  item.favorite = !item.favorite;
  if (item.favorite === item.defaultFavorite) delete userFavorites[item.photoId]; // back to the file's default
  else userFavorites[item.photoId] = item.favorite;
  saveFavorites();
  updateHeart(item);
  popHeart(item.favButton);
  document.getElementById('fav-count').textContent = favoriteCount();
  if (!lightbox.hidden && currentItem() === item) {
    syncViewerHeart();
    popHeart(lbFav);
  }
  // un-hearting inside the Favorites view removes it from the grid (but not mid-viewer)
  if (filter === 'fav' && lightbox.hidden) applyFilter();
}

function applyFilter() {
  var onlyFavorites = filter === 'fav', any = false;
  Array.prototype.forEach.call(photos.children, function (item) {
    item.hidden = onlyFavorites && !item.favorite;
    if (!item.hidden) any = true;
  });
  // the "no favorites yet" message, but never while the photos are still loading
  document.getElementById('gallery-empty').hidden = !(onlyFavorites && !any && photos.children.length > 0);
  layout();
}

function setFilter(next) {
  if (next === filter) return;
  filter = next;
  Array.prototype.forEach.call(document.querySelectorAll('.filter-btn'), function (btn) {
    btn.setAttribute('aria-pressed', String(btn.dataset.filter === filter));
  });
  var wasReady = photos.classList.contains('ready');
  photos.classList.remove('ready'); // no gliding between the two views, just a soft fade
  applyFilter();
  photos.classList.remove('refilter');
  void photos.offsetWidth;
  photos.classList.add('refilter');
  if (wasReady) requestAnimationFrame(function () { photos.classList.add('ready'); });
}

Array.prototype.forEach.call(document.querySelectorAll('.filter-btn'), function (btn) {
  btn.addEventListener('click', function () { setFilter(btn.dataset.filter); });
});

function showMessage(text) {
  var msg = document.getElementById('message');
  msg.textContent = text;
  msg.hidden = false;
}

// ---- the arrangement: config/images.json is the truth ------------------------
// Everyone sees the order and ratios from config/images.json, so every device looks the same.
// A static page cannot write that file, so to change it open the site with ?edit on the address:
// order / ratio / favorite changes are then kept in this browser while you work, and an
// "Edit mode" bar (bottom-left) copies or downloads the new images.json to replace the old one.
// Without ?edit nothing about the arrangement is stored; a visitor's own favorites are the
// only thing kept in their browser (see FAVORITES_KEY).

var EDIT = /[?&]edit\b/.test(location.search);
var STORAGE_KEY = 'photo-grid-v2';

function currentData() {
  return Array.prototype.map.call(photos.querySelectorAll('.item'), function (item, i) {
    return {
      id: item.photoId, image: item.file, order: i + 1, ratio: item.ratio || 'original',
      width: item.width, height: item.height, favorite: item.favorite
    };
  });
}

function saveLocal() {
  if (!EDIT) return; // visitors never store (or inherit) an arrangement
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(currentData())); } catch (e) { /* storage blocked */ }
}

function loadLocal() {
  if (!EDIT) return null;
  try {
    var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved.filter(function (s) { return s && typeof s === 'object' && 'id' in s; }) : null;
  } catch (e) { return null; }
}

// apply saved order/ratio on top of the config; photos missing from the save go last
function mergeSaved(entries, saved) {
  if (!Array.isArray(saved)) return entries;
  var byId = {};
  saved.forEach(function (s) { byId[s.id] = s; });
  var next = saved.length;
  return entries.map(function (e) {
    var s = byId[e.id];
    return s ? Object.assign({}, e, { order: s.order, ratio: s.ratio }) :
      Object.assign({}, e, { order: ++next });
  });
}

// captions are optional: a missing or broken file just means no captions
var captionsReady = fetch(CAPTIONS_URL)
  .then(function (res) { return res.ok ? res.json() : {}; })
  .then(function (data) { captions = data || {}; })
  .catch(function () { captions = {}; });

fetch(CONFIG_URL)
  .then(function (res) {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  })
  .then(function (entries) {
    return captionsReady.then(function () { return entries; });
  })
  .then(function (entries) {
    entries = mergeSaved(entries, loadLocal());
    userFavorites = loadFavorites();
    entries = entries.map(function (e) { // the file's default, unless the visitor chose otherwise
      var fromFile = e.favorite === true;
      return Object.assign({}, e, {
        defaultFavorite: fromFile,
        favorite: userFavorites.hasOwnProperty(e.id) ? userFavorites[e.id] : fromFile
      });
    });
    // drop saved choices that now just repeat the file (e.g. after a new images.json was pasted in)
    var pruned = false;
    Object.keys(userFavorites).forEach(function (id) {
      var entry = entries.find(function (x) { return String(x.id) === id; });
      if (!entry || userFavorites[id] === entry.defaultFavorite) { delete userFavorites[id]; pruned = true; }
    });
    if (pruned) saveFavorites();
    entries.sort(function (a, b) { return a.order - b.order; });
    entries.forEach(function (entry) { photos.appendChild(buildItem(entry)); });
    applyFilter(); // lays out, and respects a filter picked while the photos were still loading
    document.getElementById('fav-count').textContent = favoriteCount();
    showClosing(entries.length);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { photos.classList.add('ready'); });
    });
  })
  .catch(function () {
    showMessage('Could not load ' + CONFIG_URL + '. Open the page through a web server ' +
      '(GitHub Pages, or "npx serve" / "python -m http.server" locally), not by double-clicking the file.');
  });

// ---- drag to move --------------------------------------------------------
// Mouse only: drag a photo to move it.
// Layout follows DOM order, so moving a photo = moving it in the DOM and re-laying out;
// the other photos glide into the freed space.

var drag = null;

photos.addEventListener('pointerdown', function (e) {
  justDragged = false;
  var item = e.target.closest('.item');
  if (!item || e.button > 0) return;
  if (e.pointerType !== 'mouse') return;

  var rect = item.getBoundingClientRect();
  drag = {
    moved: false,
    item: item,
    id: e.pointerId,
    grabX: e.clientX - rect.left,
    grabY: e.clientY - rect.top,
    x: e.clientX,
    y: e.clientY,
    startX: e.clientX,
    startY: e.clientY,
    lastTarget: null
  };
  item.classList.add('dragging');
  item.setPointerCapture(e.pointerId);
  e.preventDefault();
  requestAnimationFrame(edgeScroll);
});

function moveDrag() {
  var item = drag.item;

  // which other photo is under the pointer?
  var target = null;
  var stack = document.elementsFromPoint(drag.x, drag.y);
  for (var i = 0; i < stack.length; i++) {
    var el = stack[i].closest && stack[i].closest('.item');
    if (el && el !== item && el.parentNode === photos) { target = el; break; }
  }

  if (target && target !== drag.lastTarget) {
    var children = Array.prototype.slice.call(photos.children);
    var after = children.indexOf(item) < children.indexOf(target);
    photos.insertBefore(item, after ? target.nextSibling : target);
    drag.lastTarget = target;
    layout();
  } else if (!target) {
    drag.lastTarget = null;
  }

  // keep the photo glued to the pointer
  item.style.transform = 'none';
  var rect = item.getBoundingClientRect();
  item.style.transform = 'translate(' +
    (drag.x - drag.grabX - rect.left) + 'px,' +
    (drag.y - drag.grabY - rect.top) + 'px)';
}

// with 100 photos the page is long: scroll while the pointer is near the top/bottom edge
function edgeScroll() {
  if (!drag) return;
  var zone = 70, speed = 0;
  if (drag.y < zone) speed = -Math.ceil((zone - drag.y) / 4);
  else if (drag.y > window.innerHeight - zone) speed = Math.ceil((drag.y - (window.innerHeight - zone)) / 4);
  if (speed) {
    window.scrollBy({ top: speed, behavior: 'instant' }); // page has smooth scrolling on
    moveDrag();
  }
  requestAnimationFrame(edgeScroll);
}

photos.addEventListener('pointermove', function (e) {
  if (!drag || e.pointerId !== drag.id) return;
  if (Math.abs(e.clientX - drag.startX) > 4 || Math.abs(e.clientY - drag.startY) > 4) drag.moved = true;
  drag.x = e.clientX;
  drag.y = e.clientY;
  moveDrag();
});

function endDrag(e) {
  if (!drag || e.pointerId !== drag.id) return;
  drag.item.classList.remove('dragging');
  drag.item.style.transform = '';
  justDragged = drag.moved;
  drag = null;
  layout();
  saveLocal();
}

// ---- click a photo to see it fully ---------------------------------------
// A click or tap opens it. Keyboard: Enter on a focused photo.

var justDragged = false;

var lightbox = document.getElementById('lightbox');
var lbStage = document.getElementById('lb-stage');
var lbFrame = document.getElementById('lb-frame');
var lbImg = document.getElementById('lb-img');
var lbCaption = document.getElementById('lb-caption');
var lbCount = document.getElementById('lb-count');
var lbRatios = document.getElementById('lb-ratios');
var lbFav = document.getElementById('lb-fav');

var viewer = { items: [], index: 0, token: 0 };
var fullImages = {}; // file -> Image, only for the current photo and its neighbours

function currentItem() {
  return viewer.items[viewer.index];
}

function buildRatioButtons() {
  [null].concat(VIEWER_RATIOS).forEach(function (name) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = name || 'Original';
    btn.dataset.ratio = name || '';
    btn.addEventListener('click', function () {
      // picking a shape is the one place a photo's ratio is edited: it is saved and the gallery follows
      currentItem().ratio = name;
      markRatio();
      fitFrame();
      layout();
      saveLocal();
    });
    lbRatios.appendChild(btn);
  });
}

function markRatio() {
  Array.prototype.forEach.call(lbRatios.children, function (btn) {
    if (btn.dataset.ratio === undefined) return;
    btn.setAttribute('aria-pressed', String(btn.dataset.ratio === (currentItem().ratio || '')));
  });
}

// Size the frame to the chosen shape, as large as fits. The image fills it with
// object-fit: cover, so a crop never stretches anything.
function fitFrame() {
  if (!lbImg.naturalWidth) return;
  var a = aspectOf(currentItem());
  var w = Math.min(lbStage.clientWidth, lbStage.clientHeight * a);
  lbFrame.style.width = w + 'px';
  lbFrame.style.height = (w / a) + 'px';
  lbFrame.style.visibility = 'visible';
}

function onImgLoad() {
  fitFrame();
  lbFrame.classList.add('in');
}

function syncViewerHeart() {
  var on = currentItem().favorite;
  lbFav.textContent = on ? '♥' : '♡';
  lbFav.classList.toggle('on', on);
  lbFav.setAttribute('aria-pressed', String(on));
  lbFav.setAttribute('aria-label', on ? 'Remove from favorites' : 'Add to favorites');
}

function loadFull(file) {
  var im = fullImages[file];
  if (!im) {
    im = fullImages[file] = new Image();
    im.src = IMAGE_DIR + file;
  }
  return im;
}

function show(i) {
  var n = viewer.items.length;
  viewer.index = (i + n) % n;
  var item = viewer.items[viewer.index];
  var token = ++viewer.token;
  markRatio();
  syncViewerHeart();

  // the gallery thumbnail is already cached, so something sharp-ish appears at once;
  // the full-resolution file replaces it as soon as it has loaded
  lbFrame.style.visibility = 'hidden';
  lbFrame.classList.remove('in');
  lbImg.alt = item.img.alt;
  lbImg.onload = onImgLoad;
  lbImg.src = THUMB_DIR + item.file;

  var full = loadFull(item.file);
  function swap() {
    if (token !== viewer.token) return;
    lbImg.src = full.src;
  }
  if (full.complete && full.naturalWidth) swap();
  else full.addEventListener('load', swap, { once: true });

  var caption = captions[item.file];
  lbCaption.textContent = caption || '';
  lbCaption.hidden = !caption;
  lbCount.textContent = (viewer.index + 1) + ' of ' + n + ' memories';

  // keep the neighbours warm; drop everything else so memory stays small
  var keep = {};
  [-1, 0, 1].forEach(function (d) {
    var f = viewer.items[(viewer.index + d + n) % n].file;
    keep[f] = true;
    loadFull(f);
  });
  Object.keys(fullImages).forEach(function (f) { if (!keep[f]) delete fullImages[f]; });
}

function openLightbox(item) {
  viewer.items = Array.prototype.filter.call(photos.children, function (it) { return !it.hidden; }); // the filtered list
  lightbox.hidden = false;
  document.documentElement.classList.add('no-scroll');
  document.addEventListener('keydown', onViewerKey);
  window.addEventListener('resize', fitFrame);
  show(viewer.items.indexOf(item));
  document.getElementById('lb-close').focus();
}

function closeLightbox() {
  var current = viewer.items[viewer.index];
  viewer.token++;
  lightbox.hidden = true;
  lbImg.onload = null;
  lbImg.removeAttribute('src');
  fullImages = {};
  document.documentElement.classList.remove('no-scroll');
  document.removeEventListener('keydown', onViewerKey);
  window.removeEventListener('resize', fitFrame);
  if (filter === 'fav') applyFilter(); // photos un-hearted while viewing leave the Favorites grid now
  if (current) {
    current.focus({ preventScroll: true });
    current.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
}

function onViewerKey(e) {
  if (e.key === 'Escape') closeLightbox();
  else if (e.key === 'ArrowLeft') show(viewer.index - 1);
  else if (e.key === 'ArrowRight') show(viewer.index + 1);
  else if (e.key === 'Tab') {
    // keep Tab inside the viewer while it is open
    var focusable = lightbox.querySelectorAll('button');
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  }
}

document.getElementById('lb-close').addEventListener('click', closeLightbox);
lbFav.addEventListener('click', function () { toggleFavorite(currentItem()); });
document.getElementById('lb-prev').addEventListener('click', function () { show(viewer.index - 1); });
document.getElementById('lb-next').addEventListener('click', function () { show(viewer.index + 1); });
lightbox.addEventListener('click', function (e) {
  if (e.target === lightbox || e.target === lbStage) closeLightbox();
});

// swipe left/right on touch screens
var swipe = null;
lightbox.addEventListener('touchstart', function (e) {
  var t = e.touches[0];
  swipe = e.touches.length === 1 && !e.target.closest('.lb-ratios') ? { x: t.clientX, y: t.clientY } : null;
}, { passive: true });
lightbox.addEventListener('touchend', function (e) {
  if (!swipe) return;
  var t = e.changedTouches[0];
  var dx = t.clientX - swipe.x, dy = t.clientY - swipe.y;
  swipe = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(viewer.index + (dx < 0 ? 1 : -1));
}, { passive: true });

buildRatioButtons();

// ?edit: a small bar to get the current order / ratios / favorites out as a new config/images.json
if (EDIT) {
  var editBar = document.createElement('div');
  editBar.className = 'edit-bar';
  editBar.innerHTML = '<span>Edit mode</span>' +
    '<button type="button" data-act="copy">Copy images.json</button>' +
    '<button type="button" data-act="download">Download</button>';
  document.body.appendChild(editBar);

  function configText() { return JSON.stringify(currentData(), null, 4) + '\n'; }

  function download() {
    var link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([configText()], { type: 'application/json' }));
    link.download = 'images.json';
    link.click();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  function flash(button, text) {
    var old = button.dataset.label || (button.dataset.label = button.textContent);
    button.textContent = text;
    setTimeout(function () { button.textContent = old; }, 1600);
  }

  editBar.addEventListener('click', function (e) {
    var button = e.target.closest('button');
    if (!button) return;
    if (button.dataset.act === 'download') { download(); flash(button, 'Saved!'); return; }
    // copying needs https or localhost; anywhere else fall back to a download
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(configText()).then(
        function () { flash(button, 'Copied!'); },
        function () { download(); flash(button, 'Downloaded'); });
    } else { download(); flash(button, 'Downloaded'); }
  });
}

photos.addEventListener('click', function (e) {
  var item = e.target.closest('.item');
  if (!item) return;
  if (justDragged) { justDragged = false; return; }
  openLightbox(item);
});

photos.addEventListener('keydown', function (e) {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('item')) {
    e.preventDefault();
    openLightbox(e.target);
  }
});

// ---- closing message: fades in once, when it scrolls into view -----------------

function showClosing(count) {
  var closing = document.getElementById('closing');
  document.getElementById('total-count').textContent = count;
  document.getElementById('total-count-2').textContent = count;
  document.getElementById('gallery-count').textContent = count;
  closing.hidden = false;
  if (!('IntersectionObserver' in window)) { closing.classList.add('in'); return; }
  var io = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting) { closing.classList.add('in'); io.disconnect(); }
  }, { threshold: 0.25 });
  io.observe(closing);
}


photos.addEventListener('pointerup', endDrag);
photos.addEventListener('pointercancel', endDrag);
