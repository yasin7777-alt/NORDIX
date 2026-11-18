// NORDIX original client behavior, preserved during gradual React migration.
(function () {
  const viewport = document.getElementById('hero-marquee');
  const track = viewport.querySelector('.animate-marquee');
  const original = track.firstElementChild.cloneNode(true);
  function rebuildTicker() {
    const group = original.cloneNode(true);
    track.replaceChildren(group);
    // Each half must cover the viewport so the translated track never reveals its end.
    while (group.getBoundingClientRect().width < viewport.clientWidth + 100) {
      Array.from(original.children).forEach(item => group.appendChild(item.cloneNode(true)));
    }
    const duplicate = group.cloneNode(true);
    duplicate.setAttribute('aria-hidden', 'true');
    track.appendChild(duplicate);
    track.style.setProperty('--ticker-duration', (group.getBoundingClientRect().width / 45) + 's');
  }
  rebuildTicker();
  if (document.fonts) document.fonts.ready.then(rebuildTicker);
  let lastWidth = viewport.clientWidth;
  new ResizeObserver(() => {
    if (viewport.clientWidth !== lastWidth) {
      lastWidth = viewport.clientWidth;
      rebuildTicker();
    }
  }).observe(viewport);
})();
