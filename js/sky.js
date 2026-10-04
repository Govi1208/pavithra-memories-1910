// Night-sky background, drawn once onto a canvas that sits fixed behind the page.
// Stars come from a seeded random generator, so the sky is the same on every visit, but they
// are placed with a noise "density" map (clear patches and busier patches) and a faint Milky Way
// band, so there is no even dot pattern. Only a handful of stars twinkle, as tiny DOM dots.
(function () {
  var sky = document.querySelector('.sky');
  var canvas = sky && sky.querySelector('canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  var SEED = 1910;
  var STAR_TINTS = ['255,255,255', '255,255,255', '255,255,255', '205,220,255', '255,233,210', '232,220,255'];
  var drawnW = 0, drawnH = 0;

  // ---- small helpers -----------------------------------------------------

  function makeRandom(seed) { // mulberry32
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeNoise(rand) { // smooth value noise, tiles every 64 cells
    var grid = [], i;
    for (i = 0; i < 4096; i++) grid.push(rand());
    function smooth(t) { return t * t * (3 - 2 * t); }
    function at(x, y) { return grid[(y & 63) * 64 + (x & 63)]; }
    return function (x, y) {
      var xi = Math.floor(x), yi = Math.floor(y), u = smooth(x - xi), v = smooth(y - yi);
      var a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
  }

  function pick(list, rand) { return list[Math.floor(rand() * list.length)]; }

  function gauss(rand) { // roughly normal, mean 0, sd ~0.5
    return (rand() + rand() + rand() + rand() - 2) / 1.15;
  }

  function blob(c, x, y, r, rgb, alpha) { // one soft round cloud
    var g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + alpha + ')');
    g.addColorStop(0.5, 'rgba(' + rgb + ',' + (alpha * 0.45) + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // A coarse grid of summed light + dust, painted with random dither so it has no banding.
  function makeField(W, H) {
    var CELL = 4, gw = Math.ceil(W / CELL) + 2, gh = Math.ceil(H / CELL) + 2;
    var R = new Float32Array(gw * gh), G = new Float32Array(gw * gh), B = new Float32Array(gw * gh);
    var D = new Float32Array(gw * gh);

    function splat(x, y, r, add) { // soft round falloff, exactly zero at the edge
      var gx0 = Math.max(0, Math.floor((x - r) / CELL)), gx1 = Math.min(gw - 1, Math.ceil((x + r) / CELL));
      var gy0 = Math.max(0, Math.floor((y - r) / CELL)), gy1 = Math.min(gh - 1, Math.ceil((y + r) / CELL));
      var r2 = r * r, gxi, gyi, dx, dy, t, f;
      for (gyi = gy0; gyi <= gy1; gyi++) {
        dy = gyi * CELL - y;
        for (gxi = gx0; gxi <= gx1; gxi++) {
          dx = gxi * CELL - x;
          t = (dx * dx + dy * dy) / r2;
          if (t < 1) { f = (1 - t) * (1 - t); add(gyi * gw + gxi, f); }
        }
      }
    }

    return {
      light: function (x, y, r, rgb, a) {
        var c = rgb.split(','), cr = a * c[0] / 255, cg = a * c[1] / 255, cb = a * c[2] / 255;
        splat(x, y, r, function (k, f) { R[k] += cr * f; G[k] += cg * f; B[k] += cb * f; });
      },
      dust: function (x, y, r, a) {
        splat(x, y, r, function (k, f) { D[k] = Math.min(0.9, D[k] + a * f); });
      },
      paint: function (target) {
        var off = document.createElement('canvas');
        off.width = W; off.height = H;
        var oc = off.getContext('2d'), img = oc.createImageData(W, H), px = img.data;
        var x, y, o = 0, gx, gy, i0, fx, fy, w00, w10, w01, w11, k, r, g, b, d, al, A, inv;
        var xi = new Int32Array(W), xf = new Float32Array(W);
        for (x = 0; x < W; x++) { xi[x] = Math.floor(x / CELL); xf[x] = x / CELL - xi[x]; }
        for (y = 0; y < H; y++) {
          gy = Math.floor(y / CELL); fy = y / CELL - gy;
          for (x = 0; x < W; x++, o += 4) {
            k = gy * gw + xi[x]; fx = xf[x];
            w00 = (1 - fx) * (1 - fy); w10 = fx * (1 - fy); w01 = (1 - fx) * fy; w11 = fx * fy;
            r = R[k] * w00 + R[k + 1] * w10 + R[k + gw] * w01 + R[k + gw + 1] * w11;
            g = G[k] * w00 + G[k + 1] * w10 + G[k + gw] * w01 + G[k + gw + 1] * w11;
            b = B[k] * w00 + B[k + 1] * w10 + B[k + gw] * w01 + B[k + gw + 1] * w11;
            d = D[k] * w00 + D[k + 1] * w10 + D[k + gw] * w01 + D[k + gw + 1] * w11;
            al = Math.max(r, g, b);
            if (al < 0.0004 && d < 0.0004) continue;
            // dust (dark) sits over the light: premultiplied colour, then back to straight alpha
            A = d + al * (1 - d);
            inv = al > 0 ? (1 - d) / A : 0;
            px[o] = (r / (al || 1) * 255 * al * inv) + 4 * d / A;
            px[o + 1] = (g / (al || 1) * 255 * al * inv) + 5 * d / A;
            px[o + 2] = (b / (al || 1) * 255 * al * inv) + 22 * d / A;
            px[o + 3] = Math.floor(A * 255 + Math.random()); // random rounding = dither
          }
        }
        oc.putImageData(img, 0, 0);
        target.drawImage(off, 0, 0, W, H);
      }
    };
  }
  // ---- the sky ---------------------------------------------------------------

  function draw() {
    var W = Math.ceil(window.innerWidth);
    var H = Math.ceil(window.innerHeight);
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    drawnW = W; drawnH = H;

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    // CSS size = exact device pixels / dpr, so the browser never has to resample the canvas
    canvas.style.width = canvas.width / dpr + 'px';
    canvas.style.height = canvas.height / dpr + 'px';
    sky.style.width = W + 'px';
    sky.style.height = H + 'px';
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    ctx.clearRect(0, 0, W, H);
    Array.prototype.slice.call(sky.querySelectorAll('.sky-twinkle')).forEach(function (n) { n.remove(); });

    var rand = makeRandom(SEED);
    var noise = makeNoise(rand);
    var big = Math.max(W, H), small = Math.min(W, H);
    var aspect = W / H;

    function fbm(nx, ny) { return 0.65 * noise(nx * 3, ny * 3) + 0.35 * noise(nx * 7 + 11, ny * 7 + 5); }
    // 0 = empty patch of sky, 1 = busy patch
    function density(x, y) {
      var d = fbm((x / W) * aspect * 1.6, (y / H) * 1.6);
      return Math.max(0, Math.min(1, (d - 0.32) / 0.4));
    }

    // Milky Way band: a diagonal line across the screen
    var x0 = -0.1 * W, y0 = 0.92 * H, x1 = 1.1 * W, y1 = 0.12 * H;
    var lx = x1 - x0, ly = y1 - y0, len = Math.sqrt(lx * lx + ly * ly);
    var bandW = 0.17 * big;
    function bandPoint(spread) { // a random point along the band, spread sideways
      var t = rand(), off = gauss(rand) * bandW * spread;
      return [x0 + lx * t + (-ly / len) * off, y0 + ly * t + (lx / len) * off];
    }
    function bandWeight(x, y) {
      var dist = Math.abs((x - x0) * ly - (y - y0) * lx) / len;
      return Math.exp(-(dist * dist) / (2 * bandW * bandW));
    }

    // 1) haze and nebula clouds. They are summed in floating point on a coarse grid, then written
    //    out with random grain. (Stacking many faint gradients on the canvas itself shows the
    //    browser's regular dithering pattern as fine scanlines; random grain looks like film.)
    var field = makeField(W, H);
    var i, p, n;

    for (i = 0; i < 70; i++) { // Milky Way glow, patchy rather than a smooth stripe
      p = bandPoint(0.9);
      n = fbm((p[0] / W) * aspect * 2.4 + 3, (p[1] / H) * 2.4 + 9);
      field.light(p[0], p[1], bandW * (0.5 + rand() * 0.8),
        rand() < 0.7 ? '165,180,235' : '235,200,185', (0.009 + rand() * 0.015) * (0.3 + 1.6 * n));
    }

    var palette = ['70,100,210', '120,85,200', '190,100,165', '70,100,210', '110,80,190'];
    for (i = 0; i < 6; i++) { // nebula clusters: several overlapping clouds each
      var cx = rand() * W, cy = rand() * H, hue = pick(palette, rand);
      for (n = 0; n < 9; n++) {
        field.light(cx + gauss(rand) * 0.22 * big, cy + gauss(rand) * 0.16 * big,
          (0.12 + rand() * 0.22) * big, hue, 0.015 + rand() * 0.026);
      }
    }

    for (i = 0; i < 16; i++) { // thin dark dust drifting through the band
      p = bandPoint(0.55);
      field.dust(p[0], p[1], bandW * (0.25 + rand() * 0.4), 0.09 + rand() * 0.07);
    }

    field.paint(ctx);
    // 2) stars
    function dot(x, y, r, alpha, rgb) {
      ctx.fillStyle = 'rgba(' + rgb + ',' + alpha + ')';
      if (r < 0.75) { ctx.fillRect(x - r, y - r, r * 2, r * 2); return; }
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
    }

    var area = (W * H) / (1440 * 900);
    var tries = 0, placed = 0, want = Math.round(W * H / 1000), x, y, d, b;

    while (placed < want && tries < want * 8) { // very many tiny distant stars, in clumps and gaps
      tries++;
      x = rand() * W; y = rand() * H;
      d = density(x, y);
      if (rand() > 0.03 + Math.pow(d, 1.5)) continue;
      b = Math.pow(rand(), 3);
      dot(x, y, 0.3 + b * 0.35, 0.14 + b * 0.5, pick(STAR_TINTS, rand));
      placed++;
    }

    for (i = 0, want = Math.round(W * H / 700); i < want; i++) { // the Milky Way is a dense dust of faint stars
      p = bandPoint(0.75);
      dot(p[0], p[1], 0.3 + rand() * 0.2, 0.1 + rand() * 0.28, pick(STAR_TINTS, rand));
    }

    var twinkling = [];
    var mediums = Math.max(28, Math.round(70 * area)), brights = Math.max(6, Math.round(10 * area));
    var star, kind;
    for (i = 0; i < mediums + brights; i++) {
      kind = i < mediums ? 'medium' : 'bright';
      do { x = rand() * W; y = rand() * H; d = density(x, y); } while (rand() > 0.1 + d);
      star = {
        x: x, y: y,
        r: kind === 'medium' ? 0.75 + rand() * 0.5 : 1.25 + rand() * 0.55,
        a: kind === 'medium' ? 0.55 + rand() * 0.35 : 0.9,
        rgb: pick(STAR_TINTS, rand), halo: kind === 'bright'
      };
      if (twinkling.length < 8 && (i % 11 === 0 || (kind === 'bright' && twinkling.length < 8 && i % 3 === 0))) {
        twinkling.push(star); // drawn as a tiny animated element instead
        continue;
      }
      if (star.halo) blob(ctx, star.x, star.y, 10 + rand() * 6, star.rgb, 0.22);
      dot(star.x, star.y, star.r, star.a, star.rgb);
    }

    twinkling.forEach(function (s, k) {
      var el = document.createElement('span');
      el.className = 'sky-twinkle';
      var size = s.r * 2;
      el.style.cssText = 'left:' + (s.x - s.r) + 'px;top:' + (s.y - s.r) + 'px;width:' + size + 'px;height:' +
        size + 'px;background:rgb(' + s.rgb + ');box-shadow:0 0 ' + (4 + s.r * 3) + 'px ' + s.r + 'px rgba(' + s.rgb +
        ',0.35);animation-duration:' + (6 + (k * 1.7) % 5) + 's;animation-delay:-' + (k * 1.3) + 's';
      sky.appendChild(el);
    });
  }

  draw();

  // redraw only when the screen really changed (not for the phone address bar sliding away)
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (window.innerWidth !== drawnW || window.innerHeight > drawnH + 1) draw();
    }, 200);
  });

  // The sky is fixed behind the whole page; it only dims a little as you scroll down toward
  // the end, so the photos stay the brightest thing on screen.
  var ticking = false;
  function fade() {
    ticking = false;
    var room = document.documentElement.scrollHeight - window.innerHeight;
    var p = room > 0 ? window.scrollY / room : 0;
    sky.style.opacity = String(1 - p * 0.4);
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(fade); }
  }, { passive: true });
  window.addEventListener('load', fade);
})();
