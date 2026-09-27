/* Small enhancements independent of the original animation engine. */
function buildMobileHome() {
  const breakpoint = matchMedia('(max-width: 991px)');
  breakpoint.addEventListener('change', () => location.reload());
  if (!breakpoint.matches) return;
  const source = document.querySelector('[data-barba="wrapper"]');
  if (!source) return;
  const text = (selector, parent = source) => parent.querySelector(selector)?.textContent.trim() || '';
  const el = (tag, className, content) => {
    const node = document.createElement(tag);
    node.className = className;
    if (content) node.textContent = content;
    return node;
  };
  const picture = (original, className = '') => {
    if (!original) return el('span', '');
    const image = original.cloneNode(false);
    image.removeAttribute('style');
    image.removeAttribute('id');
    image.className = className;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.sizes = '(max-width: 600px) 100vw, 80vw';
    return image;
  };
  const link = (label, href, className = 'nm-link') => {
    const node = el('a', className, label);
    node.href = href;
    return node;
  };
  const main = el('div', '');
  main.id = 'mobile-home';
  const header = el('header', 'nm-header');
  const brand = link('', '#hero', 'nm-brand');
  brand.setAttribute('aria-label', 'Nouvelle Spaces home');
  const logo = source.querySelector('.logo_symbol.header svg')?.cloneNode(true);
  if (logo) { logo.setAttribute('aria-hidden', 'true'); brand.append(logo); }
  brand.append(el('span', '', 'Nouvelle Spaces'));
  const menu = el('details', 'nm-menu');
  const toggle = el('summary', '', 'Menu');
  const nav = el('nav', '');
  nav.setAttribute('aria-label', 'Main navigation');
  nav.append(link('Home', '#hero'), link('The studio', '#studio'), link('Project gallery ↗', '/projects'), link('Contact', '#contact'));
  menu.append(toggle, nav);
  menu.addEventListener('click', event => { if (event.target.closest('a')) menu.open = false; });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.open) { menu.open = false; toggle.focus(); } });
  document.addEventListener('click', event => { if (!menu.contains(event.target)) menu.open = false; });
  header.append(brand, menu);
  const content = el('main', '');
  const hero = el('section', 'nm-hero');
  hero.id = 'hero';
  source.querySelectorAll('[data-hero-video]').forEach((original, index) => {
    const video = original.cloneNode(true);
    video.className = 'nm-film';
    video.hidden = index !== 0;
    video.muted = true;
    video.loop = false;
    video.preload = index ? 'none' : 'metadata';
    hero.append(video);
  });
  const heroCopy = el('div', 'nm-hero-copy');
  heroCopy.append(el('p', 'nm-kicker', 'Architecture · Interiors · Visualization'), el('h1', '', text('.hero-s_logo h1') || 'Nouvelle Spaces'), el('p', 'nm-hero-intro', text('.benefits-intro-w p') || 'Spaces designed for living — crafted to endure'), link('Explore our projects ↗', '/projects', 'nm-button'));
  hero.append(heroCopy);
  const section = (kicker, title, className = '') => {
    const node = el('section', `nm-section ${className}`);
    node.append(el('p', 'nm-kicker', kicker), el('h2', '', title));
    return node;
  };
  const reasons = section('The Nouvelle approach', 'Three reasons to choose Nouvelle Spaces');
  const cards = el('div', 'nm-reasons');
  source.querySelectorAll('.benefit-slide').forEach((slide, index) => {
    const card = el('article', 'nm-reason');
    card.append(el('span', 'nm-number', `0${index + 1}`), el('h3', '', text('h3', slide)), el('p', '', text('.benefit-slide_desc p', slide)));
    cards.append(card);
  });
  reasons.append(cards);
  const studio = section(text('.loc-info-w h2'), 'Architecture with a personal point of view.', 'nm-studio');
  studio.id = 'studio';
  studio.append(el('p', 'nm-lead', text('.loc-info-w h3')), el('p', '', text('.loc-info-w p')), picture(source.querySelector('.loc-intro-s_img img')));
  const design = section(text('.loc-intro-s_cap'), text('.loc-intro-s_title h3'), 'nm-design');
  design.append(el('h3', '', text('.loc-intro-s_desc h3')), el('p', '', text('.loc-intro-s_desc p')), link('Discuss your project ↗', '#contact'));
  const interiors = section('Considered interiors', 'The space to live in', 'nm-interiors');
  interiors.append(picture(source.querySelector('.interior-s_r_img img')), el('h3', '', text('.interior-s_r_lead h4')), el('p', '', text('.interior-s_r_desc p')));
  const services = text('.interior-s_l_desc');
  const list = el('ul', 'nm-services');
  services.split('•').slice(1).forEach(item => list.append(el('li', '', item.trim())));
  interiors.append(list);
  const projects = section('Selected perspectives', text('.loc-path-s_title h2') || 'Spaces crafted for refined living', 'nm-work');
  const strip = el('div', 'nm-image-strip');
  strip.setAttribute('aria-label', 'Architecture and interior photographs');
  strip.tabIndex = 0;
  const images = [...source.querySelectorAll('.quote-slide-img, .interior-s_gallery-cms img')];
  images.slice(0, 6).forEach(img => strip.append(picture(img)));
  projects.append(strip, el('p', 'nm-hint', 'Swipe to explore the details →'), link('View all projects ↗', '/projects', 'nm-button'));
  const process = section('Inside the studio', 'From first sketch to final detail.');
  source.querySelectorAll('.other-card').forEach(card => {
    const title = text('h4', card);
    const body = text('p', card);
    if (!title || !body) return;
    const detail = el('details', 'nm-detail');
    detail.append(el('summary', '', title), el('p', '', body));
    process.append(detail);
  });
  const contact = section('Let’s create something enduring', 'Tell us about your space.', 'nm-contact');
  contact.id = 'contact';
  source.querySelectorAll('.contact-cms_list_item').forEach(person => {
    const card = el('div', 'nm-person');
    card.append(el('h3', '', text('.c1', person)));
    person.querySelectorAll('a[href^="tel:"],a[href^="mailto:"]').forEach(original => card.append(link(original.textContent.trim(), original.getAttribute('href'))));
    contact.append(card);
  });
  const footer = el('footer', 'nm-footer');
  footer.append(el('span', '', 'Nouvelle Spaces'), link('Back to top ↑', '#hero'));
  content.append(hero, reasons, studio, design, interiors, projects, process, contact);
  main.append(header, content, footer);
  source.before(main);
  source.hidden = true;
  source.inert = true;
  // Only the visible layout owns fragment targets and accessible content.
  source.querySelectorAll('#hero,#studio,#contact').forEach(node => { node.dataset.desktopId = node.id; node.removeAttribute('id'); });
  document.documentElement.classList.add('nm-active');
  const loader = el('div', 'nm-loader');
  loader.setAttribute('aria-hidden', 'true');
  const loaderLogo = source.querySelector('.construct-house-svg')?.cloneNode(true);
  if (loaderLogo) loader.append(loaderLogo);
  main.append(loader);
  setTimeout(() => loader.remove(), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1500);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('nm-arrived'); observer.unobserve(entry.target); }
    }), { threshold: .06 });
    main.querySelectorAll('.nm-section').forEach(node => observer.observe(node));
  }
}
buildMobileHome();
(() => {
  const mobileHome = document.querySelector('#mobile-home');
  const videos = [...(mobileHome || document).querySelectorAll('[data-hero-video]')];
  const hero = mobileHome?.querySelector('.nm-hero') || document.querySelector('.hero-w');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true;
  let paused = reduced.matches;
  let active = 'day';
  const videoOrder = ['day', 'night'];
  const playback = document.createElement('button');
  playback.className = 'ns-video-control';
  playback.type = 'button';
  playback.textContent = paused ? 'Play film' : 'Pause film';
  playback.setAttribute('aria-pressed', String(paused));
  hero?.append(playback);
  function syncVideos() {
    videos.forEach(video => {
      if (mobileHome) video.hidden = video.dataset.heroVideo !== active;
      if (video.dataset.heroVideo === active && visible && !document.hidden && !paused) {
        video.play().catch(() => { playback.textContent = 'Play film'; paused = true; playback.setAttribute('aria-pressed', 'true'); });
      } else video.pause();
    });
  }
  function activateVideo(key, useTabAnimation = true) {
    if (!videoOrder.includes(key)) return;
    active = key;
    const nextVideo = videos.find(video => video.dataset.heroVideo === key);
    if (nextVideo) nextVideo.currentTime = 0;
    if (useTabAnimation) hero?.querySelector(`[data-tab-trigger="${key}"]`)?.click();
    requestAnimationFrame(syncVideos);
  }
  videos.forEach(video => {
    video.loop = false;
    video.addEventListener('ended', () => {
      if (video.dataset.heroVideo !== active) return;
      const currentIndex = videoOrder.indexOf(active);
      activateVideo(videoOrder[(currentIndex + 1) % videoOrder.length]);
    });
  });
  playback.addEventListener('click', () => {
    paused = !paused;
    playback.textContent = paused ? 'Play film' : 'Pause film';
    playback.setAttribute('aria-pressed', String(paused));
    syncVideos();
  });
  hero?.querySelectorAll('[data-tab-trigger]').forEach(button => button.addEventListener('click', () => {
    active = button.dataset.tabTrigger || active;
    requestAnimationFrame(() => {
      syncVideos();
    });
  }));
  if (hero) new IntersectionObserver(entries => { visible = entries[0].isIntersecting; syncVideos(); }).observe(hero);
  document.addEventListener('visibilitychange', syncVideos);
  reduced.addEventListener('change', () => { paused = reduced.matches; playback.textContent = paused ? 'Play film' : 'Pause film'; playback.setAttribute('aria-pressed', String(paused)); syncVideos(); });
  const progress = document.querySelector('.ns-reading-progress');
  let queued = false;
  function updateProgress() {
    const distance = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${distance > 0 ? Math.min(1, scrollY / distance) : 0})`;
    queued = false;
  }
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(updateProgress); } }, { passive: true });
  addEventListener('resize', updateProgress);
  updateProgress();

  // Keep the existing inquiry design, but never claim an unconfigured backend sent it.
  const form = document.querySelector('#wf-form-Book-a-call');
  form?.addEventListener('submit', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!form.reportValidity()) return;
    let result = form.querySelector('.ns-email-result');
    if (!result) {
      result = document.createElement('div');
      result.className = 'ns-email-result';
      result.setAttribute('role', 'status');
      form.querySelector('.form_block_b').append(result);
    }
    const fields = new FormData(form);
    const body = `Hello Nouvelle Spaces,\n\n${fields.get('message') || ''}\n\nName: ${fields.get('name')}\nEmail: ${fields.get('email')}\nPhone: ${fields.get('phone')}`;
    const link = document.createElement('a');
    link.textContent = 'Open your email draft';
    link.href = `mailto:${document.body.dataset.inquiryEmail || 'Syedain9988@gmail.com'}?subject=${encodeURIComponent('Project inquiry')}&body=${encodeURIComponent(body)}`;
    result.replaceChildren('Your draft is ready. Nothing has been sent. ', link);
    form.querySelectorAll('[data-form-btn] [hover="text"]').forEach(label => { label.textContent = 'Prepare email'; });
    link.focus();
  }, true);
})();
