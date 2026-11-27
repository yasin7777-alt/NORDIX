import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import academyWordmark from '../assets/academy-wordmark.png';
import labWordmark from '../assets/lab-wordmark.png';
import './academy-navigation.css';

const base = import.meta.env.BASE_URL.replace(/academy\/$/, '');
const items = [
  {to:'/learn/course-1/c1-l1', label:'Курс'},
  {to:'/lab', label:'Лаборатория'},
  {to:'/progress', label:'Мой прогресс'},
];
export function Header() {
  const [open,setOpen] = useState(false);
  const [compact,setCompact] = useState(() => window.scrollY > 64);
  const {pathname} = useLocation();
  const isLab = pathname === '/lab';
  useEffect(() => {
    let frame = 0;
    const sync = () => { frame = 0; setCompact(window.scrollY > 64); };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(sync); };
    window.addEventListener('scroll', onScroll, { passive:true });
    window.addEventListener('pageshow', onScroll);
    sync();
    return () => { if(frame) cancelAnimationFrame(frame); window.removeEventListener('scroll',onScroll); window.removeEventListener('pageshow',onScroll); };
  }, []);
  useEffect(() => {setOpen(false);}, [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event:KeyboardEvent) => {if(event.key === 'Escape') setOpen(false);};
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);
  const active = (to:string) => to === items[0].to ? pathname.startsWith('/learn/') : pathname === to;
  return <header data-testid="academy-navbar" className={'academy-navbar no-print'+(compact?' is-compact':'')}>
    <div className="academy-nav-shell">
      <a href={base} aria-label="NORDIX — главная" className="academy-nav-brand">
        <span className="academy-brand-lockup inline-flex items-center select-none">
          <span className="academy-brand-tile flex h-10 w-14 shrink-0 items-center justify-center rounded-xl bg-black">
            <img src={base+'favicon.svg'} className="h-8 w-10 object-contain" alt=""/>
          </span>
          <span className="academy-brand-name">
            <img data-testid="section-wordmark" src={isLab?labWordmark:academyWordmark} alt={isLab?'LAB':'Academy'} style={{height:28,width:'auto',maxWidth:'min(150px,45vw)',objectFit:'contain'}}/>
          </span>
        </span>
      </a>
      <nav className="academy-nav-links hidden items-center md:flex" aria-label="Учебная навигация">
        <a href={base+'#directions'}>Все курсы</a>
        {items.map(item=><NavLink key={item.to} to={item.to} className={active(item.to)?'is-active':''} aria-current={active(item.to)?'page':undefined}>{item.label}</NavLink>)}
      </nav>
      <button type="button" className="academy-mobile-toggle rounded-xl border border-line p-2 md:hidden" aria-label={open?'Закрыть меню':'Открыть меню'} aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
    </div>
    {open&&<nav className="academy-mobile-panel grid gap-2 border border-line p-4 md:hidden" aria-label="Мобильная учебная навигация">
      <a href={base+'#directions'} className="p-3 font-bold">Все курсы</a>
      {items.map(item=><NavLink key={item.to} to={item.to} className={'rounded-xl p-3 font-bold '+(active(item.to)?'bg-accent/10 text-accent':'')} onClick={()=>setOpen(false)}>{item.label}</NavLink>)}
    </nav>}
  </header>;
}
