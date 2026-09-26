/* Small enhancements independent of the original animation engine. */
(() => {
  const videos = [...document.querySelectorAll('[data-hero-video]')];
  const hero = document.querySelector('.hero-w');
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
