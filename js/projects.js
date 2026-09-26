/* Nouvelle Spaces: progressive enhancement, shared across both static pages. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 700px)');
  let lenis;
  let motionContext;
  let motionPaused = false;
  function setupMotion() {
    motionContext?.revert();
    lenis?.destroy();
    lenis = null;
    if (reduced.matches || motionPaused) return;
    if (window.Lenis && matchMedia('(pointer: fine)').matches) {
      lenis = new Lenis({ duration: 1, autoRaf: true, anchors: true });
    }
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    motionContext = gsap.context(() => {
      gsap.from('.hero-copy, .gallery-heading', { y: 24, duration: 1.1, ease: 'power2.out', clearProps: 'transform' });
      gsap.utils.toArray('.studio-body, .section-heading, .approach > div').forEach(el => {
        gsap.from(el, { y: 24, duration: .8, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true }, clearProps: 'transform' });
      });
    });
  }
  setupMotion();
  reduced.addEventListener('change', setupMotion);
  const motionButton = document.querySelector('#motion-toggle');
  if (motionButton) {
    motionButton.hidden = reduced.matches;
    reduced.addEventListener('change', () => { motionButton.hidden = reduced.matches; });
    motionButton.addEventListener('click', () => {
      motionPaused = !motionPaused;
      document.body.classList.toggle('motion-paused', motionPaused);
      motionButton.setAttribute('aria-pressed', String(motionPaused));
      motionButton.textContent = motionPaused ? 'Resume motion' : 'Pause motion';
      setupMotion();
    });
  }
  const entrance = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    if (!reduced.matches && !motionPaused) entry.target.classList.add('is-entering');
    entrance.unobserve(entry.target);
  }), { threshold: .08 });
  document.querySelectorAll('.project-card').forEach(card => {
    entrance.observe(card);
    card.addEventListener('animationend', () => card.classList.remove('is-entering'));
    const surface = card.querySelector('.project-image');
    surface.addEventListener('pointermove', event => {
      if (reduced.matches || motionPaused || event.pointerType !== 'mouse') return;
      const box = surface.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width;
      const y = (event.clientY - box.top) / box.height;
      surface.style.setProperty('--tilt-x', `${(0.5 - y) * 5}deg`);
      surface.style.setProperty('--tilt-y', `${(x - 0.5) * 6}deg`);
      surface.style.setProperty('--light-x', `${x * 100}%`);
      surface.style.setProperty('--light-y', `${y * 100}%`);
    });
    surface.addEventListener('pointerleave', () => {
      surface.style.setProperty('--tilt-x', '0deg');
      surface.style.setProperty('--tilt-y', '0deg');
    });
  });

  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#navigation');
  menuButton.hidden = false;
  function closeMenu() { menuButton.setAttribute('aria-expanded', 'false'); nav.hidden = mobile.matches; }
  closeMenu();
  mobile.addEventListener('change', closeMenu);
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    nav.hidden = !open;
  });
  nav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') { closeMenu(); menuButton.focus(); }
  });

  let opener;
  function showDialog(dialog, trigger) {
    opener = trigger || document.activeElement;
    dialog.showModal();
    document.body.classList.add('modal-open');
    lenis?.stop();
  }
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog && dialog.id !== 'project-viewer') {
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    }});
    dialog.addEventListener('close', () => {
      document.body.classList.remove('modal-open');
      lenis?.start();
      opener?.focus({ preventScroll: true });
    });
  });

  const inquiry = document.querySelector('#inquiry');
  document.querySelectorAll('[data-inquiry]').forEach(button => button.addEventListener('click', () => showDialog(inquiry, button)));
  const form = document.querySelector('#inquiry-form');
  let draft = '';
  form.addEventListener('submit', event => {
    event.preventDefault();
    const values = new FormData(form);
    draft = `Hello Nouvelle Spaces,\n\n${values.get('message')}\n\nName: ${values.get('name')}\nEmail: ${values.get('email')}\nPhone: ${values.get('phone') || 'Not provided'}`;
    const link = document.querySelector('#draft-link');
    link.href = `mailto:${document.body.dataset.inquiryEmail || 'Syedain9988@gmail.com'}?subject=${encodeURIComponent('Project inquiry — ' + values.get('name'))}&body=${encodeURIComponent(draft)}`;
    document.querySelector('#email-result').hidden = false;
    document.querySelector('#copy-inquiry').textContent = 'Copy message';
    link.focus();
  });
  document.querySelector('#copy-inquiry').addEventListener('click', async event => {
    try { await navigator.clipboard.writeText(draft); event.target.textContent = 'Message copied'; }
    catch { event.target.textContent = 'Use the email draft link above'; }
  });

  const viewer = document.querySelector('#project-viewer');
  if (!viewer) return;
  let projects;
  let current;
  let index = 0;
  const picture = document.querySelector('#viewer-image');
  const previous = document.querySelector('#previous-image');
  const next = document.querySelector('#next-image');
  const thumbnails = document.querySelector('.thumbnails');
  function renderImage() {
    const item = current.images[index];
    picture.src = item.src;
    picture.alt = item.alt;
    picture.width = item.width;
    picture.height = item.height;
    document.querySelector('#viewer-count').textContent = `${String(index + 1).padStart(2, '0')} / ${String(current.images.length).padStart(2, '0')}`;
    document.querySelector('#original-image').href = item.src;
    document.querySelector('#viewer-caption').textContent = item.alt;
    previous.disabled = next.disabled = current.images.length < 2;
    thumbnails.querySelectorAll('button').forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
  }
  function step(delta) { index = (index + delta + current.images.length) % current.images.length; renderImage(); }
  function openProject(project, trigger) {
    current = project;
    index = 0;
    document.querySelector('#viewer-title').textContent = current.title;
    document.querySelector('#viewer-category').textContent = `${current.category} / Nouvelle Spaces`;
    document.querySelector('#viewer-description').textContent = current.description;
    thumbnails.replaceChildren();
    current.images.forEach((item, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `View image ${i + 1}: ${item.alt}`);
      const img = document.createElement('img');
      img.src = item.variants[0]?.src || item.src;
      img.alt = '';
      img.loading = 'lazy';
      button.append(img);
      button.addEventListener('click', () => { index = i; renderImage(); });
      thumbnails.append(button);
    });
    renderImage();
    showDialog(viewer, trigger);
  }
  previous.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); step(event.key === 'ArrowLeft' ? -1 : 1); }
  });
  let touchStart;
  picture.addEventListener('touchstart', event => { touchStart = [event.changedTouches[0].clientX, event.changedTouches[0].clientY]; }, { passive: true });
  picture.addEventListener('touchend', event => {
    if (!touchStart) return;
    const dx = event.changedTouches[0].clientX - touchStart[0];
    const dy = event.changedTouches[0].clientY - touchStart[1];
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
    touchStart = null;
  }, { passive: true });
  // Gallery links remain usable as full-size image links if the manifest cannot load.
  const projectData = window.__NOUVELLE_PROJECTS__ ? Promise.resolve(window.__NOUVELLE_PROJECTS__) : fetch('/assets/projects.json' + (document.body.dataset.preview ? '?preview=1' : '')).then(response => { if (!response.ok) throw new Error('Project manifest unavailable'); return response.json(); });
  projectData.then(data => {
    projects = data;
    document.querySelectorAll('[data-project]').forEach(link => link.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const project = projects.find(item => item.id === link.dataset.project);
      if (project) { event.preventDefault(); openProject(project, link); }
    }));
    const aliases = { 'stone-villa': 'global-village', 'living-spaces': 'ocean-one', 'waterfront-villas': 'global-village', 'syed-ain-villa': 'asfar-residences', 'lakhani-residence': 'amir-lakhani-house', 'rooftop-retreat': 'zero-life', 'exhibition-spaces': 'recorded-future', 'recordati': 'recorded-future' };
    const id = aliases[location.hash.slice(1)] || location.hash.slice(1);
    const project = projects.find(item => item.id === id);
    if (project) openProject(project, document.querySelector(`[data-project="${project.id}"]`));
  }).catch(() => { /* Keep the fully rendered collection and direct image links. */ });

  const filters = document.querySelector('.filter-bar');
  const cards = [...document.querySelectorAll('.project-card')];
  filters.hidden = false;
  filters.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    filters.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    let count = 0;
    cards.forEach(card => { card.hidden = button.dataset.filter !== 'All' && card.dataset.category !== button.dataset.filter; if (!card.hidden) count++; });
    document.querySelector('.project-grid').classList.toggle('is-filtered', button.dataset.filter !== 'All');
    document.querySelector('#result-count').textContent = `${String(count).padStart(2, '0')} projects`;
    if (window.ScrollTrigger) ScrollTrigger.refresh();
    lenis?.resize();
  }));
})();
