/* Gallery entrance uses the same animated studio mark as the homepage. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches) return;
  const overlay = document.createElement('div');
  overlay.className = 'gallery-loader';
  overlay.setAttribute('aria-hidden', 'true');
  const logo = document.createElement('img');
  logo.src = '/assets/logo-loader.svg' + (matchMedia('(max-width: 700px)').matches ? '#quick' : '');
  logo.alt = '';
  overlay.append(logo);
  document.documentElement.append(overlay);
  function dismiss() {
    overlay.classList.add('is-leaving');
    setTimeout(() => overlay.remove(), 650);
  }
  const timer = setTimeout(dismiss, matchMedia('(max-width: 700px)').matches ? 1500 : 3900);
  addEventListener('pageshow', event => { if (event.persisted) { clearTimeout(timer); overlay.remove(); } });
  addEventListener('keydown', event => { if (event.key === 'Escape' || event.key === 'Tab') { clearTimeout(timer); overlay.remove(); } }, { once: true });
})();
