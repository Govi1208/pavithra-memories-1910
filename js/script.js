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
var CONFIG_URL = 'config/images.json';
var IMAGE_DIR = 'images/';

var MOBILE_MAX = 700;

var photos = document.getElementById('photos');

// ---- layout: balanced justified rows -----------------------------------
// Split the photos, in order, into rows whose total aspect is as even as possible,
// then scale each row to exactly the container width. Result: no gaps anywhere.

function layout() {
  var items = Array.prototype.slice.call(photos.children);
  var n = items.length;
  if (!n) return;

  var mobile = window.innerWidth <= MOBILE_MAX;
  var gap = mobile ? 4 : 6;
  var target = mobile ? 150 : 240;
  var width = photos.clientWidth;

  var aspect = items.map(function (it) {
    var r = RATIOS[it.ratioIndex];
    return r.w / r.h;
  });
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

  var top = 0;
  bounds.forEach(function (b) {
    var count = b[1] - b[0];
    var sum = prefix[b[1]] - prefix[b[0]];
    var h = (width - gap * (count - 1)) / sum;
    var left = 0;
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

function applyRatio(item) {
  var r = RATIOS[item.ratioIndex];
  item.label.textContent = r.name + ' · ' + r.w + ' × ' + r.h;
  item.minus.disabled = item.ratioIndex === 0;
  item.plus.disabled = item.ratioIndex === RATIOS.length - 1;
}

function step(item, delta) {
  var next = item.ratioIndex + delta;
  if (next < 0 || next >= RATIOS.length) return;
  item.ratioIndex = next;
  applyRatio(item);
  layout();
  saveLocal();
}

function makeButton(text, title) {
  var btn = document.createElement('button');
  btn.textContent = text;
  btn.title = title;
  return btn;
}

function buildItem(entry) {
  var item = document.createElement('div');
  item.className = 'item';
  item.photoId = entry.id;
  item.file = entry.image;
  item.id = 'photo-' + entry.id;
  var idx = RATIOS.findIndex(function (r) { return r.name === entry.ratio; });
  item.ratioIndex = idx >= 0 ? idx : 0;

  item.img = document.createElement('img');
  item.img.draggable = false;
  item.img.loading = 'lazy';
  item.img.alt = entry.image;
  item.img.src = IMAGE_DIR + entry.image;

  var controls = document.createElement('div');
  controls.className = 'controls';
  item.label = document.createElement('span');
  item.minus = makeButton('−', 'Previous ratio');
  item.plus = makeButton('+', 'Next ratio');
  item.minus.addEventListener('click', function () { step(item, -1); });
  item.plus.addEventListener('click', function () { step(item, 1); });

  var handle = document.createElement('div');
  handle.className = 'handle';
  handle.title = 'Drag to move';
  handle.textContent = '✥';

  controls.appendChild(item.label);
  controls.appendChild(item.minus);
  controls.appendChild(item.plus);
  controls.appendChild(handle);

  item.appendChild(item.img);
  item.appendChild(controls);
  applyRatio(item);
  return item;
}

function showMessage(text) {
  var msg = document.getElementById('message');
  msg.textContent = text;
  msg.hidden = false;
}

// ---- remember the arrangement in this browser ------------------------------
// config/images.json is the starting point; your changes are kept in localStorage
// so a refresh keeps them. "Reset" goes back to config/images.json.

var STORAGE_KEY = 'photo-grid-order';

function currentData() {
  return Array.prototype.map.call(photos.querySelectorAll('.item'), function (item, i) {
    return { id: item.photoId, image: item.file, order: i + 1, ratio: RATIOS[item.ratioIndex].name };
  });
}

function saveLocal() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(currentData())); } catch (e) { /* storage blocked */ }
}

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) { return null; }
}

// apply saved order/ratio on top of the config; photos missing from the save go last
function mergeSaved(entries, saved) {
  if (!Array.isArray(saved)) return entries;
  var byId = {};
  saved.forEach(function (s) { byId[s.id] = s; });
  var next = saved.length;
  return entries.map(function (e) {
    var s = byId[e.id];
    return s ? { id: e.id, image: e.image, order: s.order, ratio: s.ratio } :
      { id: e.id, image: e.image, order: ++next, ratio: e.ratio };
  });
}

fetch(CONFIG_URL)
  .then(function (res) {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  })
  .then(function (entries) {
    entries = mergeSaved(entries, loadLocal());
    entries.sort(function (a, b) { return a.order - b.order; });
    entries.forEach(function (entry) { photos.appendChild(buildItem(entry)); });
    layout();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { photos.classList.add('ready'); });
    });
  })
  .catch(function () {
    showMessage('Could not load ' + CONFIG_URL + '. Open the page through a web server ' +
      '(GitHub Pages, or "npx serve" / "python -m http.server" locally), not by double-clicking the file.');
  });

// ---- download the current order + ratios as images.json -------------------
// A static site cannot write files, so rearrange, download, then replace config/images.json.

document.getElementById('download').addEventListener('click', function () {
  var url = URL.createObjectURL(new Blob([JSON.stringify(currentData(), null, 2) + '\n'], { type: 'application/json' }));
  var a = document.createElement('a');
  a.href = url;
  a.download = 'images.json';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('reset').addEventListener('click', function () {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* storage blocked */ }
  location.reload();
});

// ---- touch: tap a photo to show its controls ----------------------------

function clearActive() {
  var current = photos.querySelector('.item.active');
  if (current) current.classList.remove('active');
}

document.addEventListener('pointerdown', function (e) {
  if (e.pointerType === 'mouse') return;
  var item = e.target.closest && e.target.closest('.item');
  if (item && item.classList.contains('active')) return;
  clearActive();
  if (item) item.classList.add('active');
});

// ---- drag to move --------------------------------------------------------
// Mouse: drag anywhere on a photo. Touch: tap the photo, then drag its handle.
// Layout follows DOM order, so moving a photo = moving it in the DOM and re-laying out;
// the other photos glide into the freed space.

var drag = null;

photos.addEventListener('pointerdown', function (e) {
  var item = e.target.closest('.item');
  if (!item || e.button > 0) return;
  if (e.target.closest('button')) return;
  var onHandle = !!e.target.closest('.handle');
  if (e.pointerType !== 'mouse' && !onHandle) return;

  var rect = item.getBoundingClientRect();
  drag = {
    item: item,
    id: e.pointerId,
    grabX: e.clientX - rect.left,
    grabY: e.clientY - rect.top,
    x: e.clientX,
    y: e.clientY,
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
    window.scrollBy(0, speed);
    moveDrag();
  }
  requestAnimationFrame(edgeScroll);
}

photos.addEventListener('pointermove', function (e) {
  if (!drag || e.pointerId !== drag.id) return;
  drag.x = e.clientX;
  drag.y = e.clientY;
  moveDrag();
});

function endDrag(e) {
  if (!drag || e.pointerId !== drag.id) return;
  drag.item.classList.remove('dragging');
  drag.item.style.transform = '';
  drag = null;
  layout();
  saveLocal();
}

photos.addEventListener('pointerup', endDrag);
photos.addEventListener('pointercancel', endDrag);
