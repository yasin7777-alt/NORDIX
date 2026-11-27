// NORDIX original client behavior, preserved during gradual React migration.
(() => {
 const header=document.getElementById('navbar');
 const links=Array.from(header.querySelectorAll('.nav-links a'));
 const sections=links.map(link=>{const href=link.getAttribute('href');return href?.startsWith('#') ? document.querySelector(href) : null;});
 let queued=false;
 function updateNavigation(){
  queued=false;
  header.classList.toggle('is-compact',window.scrollY>64);
  let active=-1;
  sections.forEach((section,i)=>{if(section && section.getBoundingClientRect().top<=160)active=i;});
  links.forEach((link,i)=>{
   link.classList.toggle('is-active',i===active);
   if(i===active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
  });
 }
 window.addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(updateNavigation);}},{passive:true});
 window.addEventListener('pageshow',updateNavigation);
 updateNavigation();
})();
