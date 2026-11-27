/* NORDIX route curtain: one shared transition for the homepage and Academy. */
(() => {
  const root = new URL('../', document.currentScript.src);
  const key = 'nordix-route-curtain-v1';
  const artwork = new URL('nordix-transition-v2.webp', root).href;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const preload = new Image();
  preload.src = artwork;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const duration = 520, hold = 700;
  const ease = 'cubic-bezier(.76,0,.24,1)';
  let panel = null, busy = false, replay = false, oldOverflow = null;
  const mount = () => {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.dataset.testid = 'nordix-route-curtain';
    panel.setAttribute('aria-hidden', 'true');
    Object.assign(panel.style, {
      position:'fixed', inset:'0', width:'100vw', height:'100dvh', zIndex:'2147483647',
      backgroundColor:'#000', backgroundImage:'url("' + artwork + '")',
      backgroundSize:'cover', backgroundPosition:'center', backgroundRepeat:'no-repeat',
      transform:'translate3d(0,0,0)', margin:'0', pointerEvents:'auto',
      touchAction:'none', willChange:'transform'
    });
    oldOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.appendChild(panel);
    return panel;
  };
  const cleanup = () => {
    panel?.remove(); panel = null;
    if (oldOverflow !== null) document.documentElement.style.overflow = oldOverflow;
    oldOverflow = null; busy = false;
  };
  const animate = async (from, to) => {
    const el = mount();
    el.style.transform = 'translate3d(' + from + '%,0,0)';
    if (typeof el.animate !== 'function') {
      el.style.transform = 'translate3d(' + to + '%,0,0)'; return;
    }
    const a = el.animate([
      {transform:'translate3d(' + from + '%,0,0)'},
      {transform:'translate3d(' + to + '%,0,0)'}
    ],{duration,easing:ease,fill:'forwards'});
    await a.finished.catch(()=>{});
    el.style.transform = 'translate3d(' + to + '%,0,0)';
    a.cancel();
  };
  const reveal = async () => {
    if (!panel) return;
    panel.dataset.phase = 'leaving';
    await animate(0,100);
    cleanup();
  };
  const storeArrival = url => {
    try {
      sessionStorage.setItem(key,JSON.stringify({href:url.href,created:Date.now()}));
      return true;
    } catch { return false; }
  };
  const open = async (destination, action) => {
    const url = new URL(destination,location.href);
    if (busy) return;
    if (motion.matches) { action ? action() : location.assign(url.href); return; }
    busy = true;
    mount().dataset.phase = 'entering';
    await animate(-100,0);
    if (!panel) return;
    panel.dataset.phase = 'covered';
    const cross = url.pathname !== location.pathname || url.search !== location.search;
    if (cross) {
      if (storeArrival(url)) { location.assign(url.href); return; }
      await wait(hold); location.assign(url.href); cleanup(); return;
    }
    if (action) action(); else location.assign(url.href);
    await wait(hold);
    await reveal();
  };
  // The existing course-card buttons use this, without changing their destination.
  window.nordixNavigate = href => { void open(href); };
  document.addEventListener('click',event=>{
    if (replay || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor=event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return;
    const url=new URL(anchor.href,location.href);
    if (url.origin !== location.origin || url.href === location.href) return;
    const academyPath=new URL('academy/',root).pathname;
    const academyRoute=url.pathname === academyPath && /^#\/(?:lab(?:\/|$)|learn\/)/.test(url.hash);
    const catalog=url.pathname === root.pathname && url.hash === '#directions';
    const insideAcademy=location.pathname === academyPath;
    if (!catalog && !(academyRoute && (!insideAcademy || anchor.closest('[data-testid="academy-navbar"]')))) return;
    if (motion.matches) return;
    event.preventDefault(); event.stopImmediatePropagation();
    void open(url.href,()=>{
      if(catalog){
        replay=true;try{anchor.click();}finally{replay=false;}
        const section=document.getElementById('directions');
        if(section) {
          const old=document.documentElement.style.scrollBehavior;
          document.documentElement.style.scrollBehavior='auto';
          section.scrollIntoView({behavior:'instant',block:'start'});
          document.documentElement.style.scrollBehavior=old;
        }
      } else {
        replay=true;try{anchor.click();}finally{replay=false;}
      }
    });
  },true);
  // Carry the fully closed curtain across the two independent HTML documents.
  let arrival=null;
  try { arrival=JSON.parse(sessionStorage.getItem(key)||'null'); sessionStorage.removeItem(key); } catch {}
  if (arrival && arrival.href===location.href && Date.now()-arrival.created<20000 && !motion.matches) {
    busy=true;mount().dataset.phase='covered';
    const onReady=async()=>{
      // Wait for the new React root, but never trap the user on a loading overlay.
      for(let i=0;i<30&&!document.querySelector('#root > *');i++)await wait(50);
      await wait(hold);await reveal();
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void onReady(),{once:true});
    else void onReady();
  }
  window.addEventListener('pageshow',event=>{if(event.persisted)cleanup();});
})();
