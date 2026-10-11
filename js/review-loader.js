// Opening loader for the review page: the same heart ring as the gallery, shown for about
// 3 seconds, then it fades away. review.html starts with <html class="no-scroll">, so the page
// cannot scroll meanwhile. (Same timing and classes as the loader in js/script.js.)
(function () {
  var loader = document.querySelector('.birthday-loader');
  var root = document.documentElement;
  if (!loader) { root.classList.remove('no-scroll'); return; }
  function remove() {
    loader.remove();
    root.classList.remove('no-scroll');
  }
  setTimeout(function () {
    loader.classList.add('birthday-loader-hidden');
    setTimeout(remove, 650); // after the 0.6s fade
  }, 3000);
})();
