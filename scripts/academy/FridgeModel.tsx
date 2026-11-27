import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const PARTS = [
  { id:'evaporator', label:'Испаритель', role:'Холодная сторона контура: хладагент поглощает тепло внутри камеры и испаряется.', facts:['На модели расположен в верхней части камеры.','Забирает тепло у продуктов и воздуха.','Форма испарителя зависит от конструкции холодильника.'] },
  { id:'compressor', label:'Компрессор', role:'Сердце холодильника: обеспечивает циркуляцию хладагента и повышает давление его пара.', facts:['Герметичный корпус закрывает двигатель и механизм сжатия.','Обычно расположен в нижнем машинном отсеке.','Компрессор предназначен для сжатия пара, а не жидкости.'] },
  { id:'condenser', label:'Конденсатор', role:'Сбрасывает тепло наружу: в обычном цикле пар охлаждается и конденсируется.', facts:['В этой конструкции теплообменник находится сзади.','Трубки и металлические рёбра увеличивают площадь теплообмена.','В других моделях конденсатор может быть скрыт в стенках.'] },
  { id:'capillary', label:'Капиллярная трубка', role:'Капиллярка — тонкая трубка, создающая сопротивление потоку и перепад давления перед испарителем.', facts:['Относится к дросселирующим устройствам.','Расход зависит от свойств хладагента и режима работы.','На учебной модели трубка выделена цветом для наглядности.'] },
  { id:'filter', label:'Фильтр-осушитель', role:'Помогает удерживать влагу и загрязнения в замкнутом холодильном контуре.', facts:['Располагается перед дросселирующим устройством.','Внутри содержится влагопоглощающий материал.','Это герметичный компонент, не предназначенный для самостоятельного вскрытия.'] },
  { id:'thermostat', label:'Термостат', role:'Помогает холодильнику держать заданную температуру, управляя охлаждением.', facts:['В модели показан механический регулятор внутри камеры.','В современных холодильниках его функции часто выполняет электронный контроллер.','Не является частью трубопровода хладагента.'] },
] as const;
type PartId = typeof PARTS[number]['id'];
type View = 'front' | 'back' | 'reset';
const V = (x:number,y:number,z:number) => new THREE.Vector3(x,y,z);
const positions:Record<PartId,THREE.Vector3> = {
  evaporator:V(-.38,3.02,-.44), compressor:V(-.40,.30,-.60), condenser:V(.46,1.65,-.91),
  capillary:V(.72,1.06,-.78), filter:V(.55,.44,-.77), thermostat:V(.53,3.31,.65)
};
const buttonStyle='rounded-full border border-line bg-white px-3 py-2 text-xs font-bold text-paper transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent';
export function FridgeModel(){
  const [selected,setSelected]=useState<PartId>('compressor');
  const [cutaway,setCutaway]=useState(false);
  const [available,setAvailable]=useState(true);
  const host=useRef<HTMLDivElement>(null);
  const markerRefs=useRef<Partial<Record<PartId,HTMLButtonElement|null>>>({});
  const lineRefs=useRef<Partial<Record<PartId,SVGLineElement|null>>>({});
  const dotRefs=useRef<Partial<Record<PartId,SVGCircleElement|null>>>({});
  const controller=useRef<{view:(v:View)=>void;select:(id:PartId)=>void;cutaway:(on:boolean)=>void}|null>(null);
  const part=PARTS.find(p=>p.id===selected)!;
  const choosePart=(id:PartId)=>{setSelected(id);if(id==='evaporator'||id==='thermostat'){setCutaway(true);controller.current?.view('front');}};

  useEffect(()=>{
    const el=host.current;
    if(!el)return;
    let renderer:THREE.WebGLRenderer;
    try { renderer=new THREE.WebGLRenderer({antialias:true,alpha:false}); }
    catch { setAvailable(false); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    renderer.setClearColor(0xf5f4f2,1);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.05;
    renderer.domElement.style.cssText='display:block;width:100%;height:100%;touch-action:none;';
    renderer.domElement.setAttribute('aria-label','Вращаемая трёхмерная модель холодильника');
    el.prepend(renderer.domElement);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(36,1,.1,50);
    const controls=new OrbitControls(camera,renderer.domElement);
    controls.target.set(0,1.78,0);
    controls.enableDamping=true;
    controls.enablePan=false;
    controls.minDistance=2.6;
    controls.maxDistance=11;
    controls.minPolarAngle=.18;
    controls.maxPolarAngle=Math.PI*.51;
    const view=(v:View)=>{
      camera.position.copy(v==='front'?V(2.8,2.5,7.5):v==='back'?V(0,2.25,-8.1):V(2.6,2.8,-7.7));
      controls.target.set(0,1.78,0); controls.update();
    };
    view('reset');
    scene.add(new THREE.HemisphereLight(0xffffff,0x92959a,2.0));
    const light=new THREE.DirectionalLight(0xffffff,3.2);light.position.set(4,7,4);scene.add(light);
    const rim=new THREE.DirectionalLight(0xd3e3ff,1.7);rim.position.set(-4,5,-5);scene.add(rim);
    const groups=new Map<PartId,THREE.Group>();
    const pickable:THREE.Mesh[]=[];
    const selectableMaterials=new Map<PartId,Set<THREE.MeshStandardMaterial>>();
    for(const p of PARTS){const g=new THREE.Group();g.name=p.id;groups.set(p.id,g);scene.add(g);selectableMaterials.set(p.id,new Set());}
    const mat=(color:number,metalness=0,roughness=.45)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
    const enamel=mat(0xecebe4,.10,.32), inner=mat(0xe5e6e2,.06,.43), dark=mat(0x202326,.42,.34), copper=mat(0xa87343,.5,.38);
    const steel=mat(0x8998a5,.65,.35), rubber=mat(0x30363c,0,.85);
    const panel=mat(0xe9edf0,.1,.42);
    panel.transparent=true;panel.opacity=1;panel.depthWrite=true;panel.side=THREE.DoubleSide;
    const glass=mat(0xc6e3e8,.1,.22);glass.transparent=true;glass.opacity=.25;glass.depthWrite=false;
    const mesh=(geometry:THREE.BufferGeometry,material:THREE.MeshStandardMaterial,at:THREE.Vector3,id?:PartId)=>{
      const m=new THREE.Mesh(geometry,id?material.clone():material);m.position.copy(at);
      if(id){groups.get(id)!.add(m);m.userData.part=id;pickable.push(m);selectableMaterials.get(id)!.add(m.material as THREE.MeshStandardMaterial);}else scene.add(m);
      return m;
    };
    const box=(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.MeshStandardMaterial,id?:PartId)=>mesh(new THREE.BoxGeometry(w,h,d),m,V(x,y,z),id);
    const rounded=(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.MeshStandardMaterial,r=.055,id?:PartId)=>mesh(new RoundedBoxGeometry(w,h,d,5,r),m,V(x,y,z),id);
    const ellipsoid=(x:number,y:number,z:number,rx:number,ry:number,rz:number,m:THREE.MeshStandardMaterial,id:PartId)=>{
      const o=mesh(new THREE.SphereGeometry(1,40,24),m,V(x,y,z),id);o.scale.set(rx,ry,rz);return o;
    };
    const cylinder=(radius:number,length:number,from:THREE.Vector3,to:THREE.Vector3,m:THREE.MeshStandardMaterial,id?:PartId)=>{
      const obj=mesh(new THREE.CylinderGeometry(radius,radius,length,20),m,from.clone().add(to).multiplyScalar(.5),id);
      obj.quaternion.setFromUnitVectors(V(0,1,0),to.clone().sub(from).normalize());return obj;
    };
    const tube=(points:THREE.Vector3[],radius:number,m:THREE.MeshStandardMaterial,id?:PartId)=>{
      const curve=new THREE.CurvePath<THREE.Vector3>();
      for(let i=1;i<points.length;i++)curve.add(new THREE.LineCurve3(points[i-1],points[i]));
      return mesh(new THREE.TubeGeometry(curve,Math.max(32,points.length*3),radius,10,false),m,V(0,0,0),id);
    };
    const snake=(left:number,right:number,bottom:number,top:number,z:number,rows:number)=>{
      const out:THREE.Vector3[]=[];const dy=(top-bottom)/(rows-1);const radius=dy/2;
      for(let i=0;i<rows;i++){
        const y=top-i*dy,edge=i%2===0?right:left,sign=i%2===0?1:-1;
        out.push(V(i%2===0?left:right,y,z),V(edge,y,z));
        if(i<rows-1)for(let j=1;j<=12;j++){const angle=j*Math.PI/12;out.push(V(edge+sign*radius*Math.sin(angle),y-radius+radius*Math.cos(angle),z));}
      }return out;
    };
    // Rounded vintage single-door cabinet, reconstructed from the supplied video.
    // This is educational geometry, not a manufacturer's CAD or service model.
    const shellColor=mat(0xe4e3de,.10,.35);
    const backMetal=mat(0xbec0bc,.30,.52);
    const blackPanel=mat(0x202123,.18,.35);
    const trim=mat(0x777b7b,.50,.38);
    rounded(1.75,.23,1.46,0,3.46,0,enamel,.105);
    rounded(1.75,.12,1.46,0,.61,0,enamel,.045);
    rounded(.12,2.85,1.45,-.815,2.04,0,panel,.055);
    rounded(.12,2.85,1.45,.815,2.04,0,panel,.055);
    rounded(1.66,2.90,.095,0,2.03,-.69,panel,.045);
    for(const x of [-.80,.80]){
      rounded(.13,2.91,.10,x,2.06,.69,enamel,.04);
      rounded(.13,2.85,.13,x,2.03,-.68,shellColor,.04);
      rounded(.15,.57,1.37,x,.32,.01,shellColor,.04);
    }
    const rearCover=rounded(1.43,.80,.095,0,2.99,-.755,blackPanel,.075);
    const rearCoverTrim=rounded(1.51,.89,.055,0,2.99,-.735,trim,.075);
    for(const x of [-.65,.65])for(const y of [2.65,3.34])
      cylinder(.025,.025,V(x,y,-.805),V(x,y,-.830),steel);
    rounded(.33,.13,.014,0,3.43,-.75,mat(0x927c46,.40,.5),.012);
    for(let i=0;i<4;i++)box(.25,.008,.009,0,3.39+i*.024,-.761,blackPanel);
    for(const x of [-.59,.59]){
      cylinder(.041,.015,V(x,3.43,-.74),V(x,3.43,-.755),blackPanel);
      box(.075,.03,.01,x+.04,3.43,-.76,blackPanel);
    }
    box(1.58,.065,1.25,0,2.58,0,inner);
    const shelfMat=mat(0xe6e7e3,.25,.42);
    for(const y of [1.10,1.56,2.04]){
      for(let i=0;i<19;i++){
        const x=-.72+i*1.44/18;
        cylinder(.013,1.13,V(x,y,-.56),V(x,y,.57),shelfMat);
      }
      for(const z of [-.57,.57])cylinder(.027,1.51,V(-.755,y,z),V(.755,y,z),shelfMat);
      for(const x of [-.75,.75])cylinder(.022,1.14,V(x,y,-.57),V(x,y,.57),shelfMat);
    }
    rounded(1.52,.31,1.11,0,.80,.03,glass,.05);
    rounded(1.64,.09,1.42,0,.09,0,backMetal,.03);
    for(const x of [-.66,.66])for(const z of [-.5,.5])rounded(.18,.12,.18,x,.04,z,rubber,.035);
    const door=rounded(1.70,2.97,.20,0,2.06,.76,enamel,.095);
    const gasket=rounded(1.62,2.87,.04,0,2.06,.65,rubber,.02);
    const doorHandle=rounded(.42,.10,.095,-.43,2.36,.89,steel,.04);
    const frontBadge=rounded(.38,.045,.025,0,3.14,.87,mat(0x9a8652,.6,.35),.013);
    const doorParts=[door,gasket,doorHandle,frontBadge];
        // Upper internal evaporator: plate and visible teaching representation of tube.
    const evapMat=mat(0x9cb8c6,.65,.32);
    rounded(1.46,.09,1.13,0,2.71,-.02,evapMat,.035,'evaporator');
    rounded(1.46,.60,.07,0,3.03,-.54,evapMat,.035,'evaporator');
    const evapPoints=snake(-.56,.56,2.78,3.28,-.48,5);
    tube(evapPoints,.026,mat(0x6088b5,.64,.28),'evaporator');
    // Compressor shell, mounting feet and electrical cover (visual only).
    ellipsoid(-.40,.32,-.37,.39,.29,.33,dark,'compressor');
    box(.79,.07,.65,-.40,.13,-.37,dark,'compressor');
    const seam=mesh(new THREE.TorusGeometry(.36,.015,10,48),steel,V(-.40,.30,-.37),'compressor');
    seam.rotation.x=Math.PI/2;seam.scale.set(1,.85,1);
    box(.19,.21,.22,-.04,.29,-.38,rubber,'compressor');
    // External wire-tube condenser.
    const condenserPoints=snake(-.65,.65,.63,2.43,-.87,10);
    const condenserMat=mat(0x26282a,.38,.42);
    tube(condenserPoints,.027,condenserMat,'condenser');
    for(let group=0;group<7;group++)for(let wire=0;wire<7;wire++){
      const x=-.59+group*.193+wire*.020;
      cylinder(.0065,1.93,V(x,.53,-.91),V(x,2.46,-.91),condenserMat,'condenser');
    }
    for(const x of [-.65,.65]){
      rounded(.075,1.97,.045,x,1.53,-.80,dark,.012,'condenser');
      for(const y of [.80,2.14])cylinder(.026,.04,V(x,y,-.835),V(x,y,-.875),steel,'condenser');
    }
    rounded(1.56,.13,.12,0,.52,-.82,dark,.022,'condenser');
    // Filter-drier and simplified capillary representation.
    const f1=V(.55,.31,-.77),f2=V(.55,.59,-.77);
    cylinder(.085,.28,f1,f2,copper,'filter');
    ellipsoid(.55,.31,-.77,.085,.045,.085,copper,'filter');
    ellipsoid(.55,.59,-.77,.085,.045,.085,copper,'filter');
    const cap=[V(.55,.59,-.77),V(.65,.73,-.77)];
    for(let i=0;i<=64;i++){const angle=i/64*Math.PI*4;cap.push(V(.65+.085*Math.cos(angle),.76+i/64*.24,-.78+.085*Math.sin(angle)));}
    cap.push(V(.70,1.12,-.76),V(.70,2.68,-.72),V(.64,2.78,-.48),evapPoints[evapPoints.length-1]);
    tube(cap,.014,copper,'capillary');
    // Conceptual closed-loop connections. No service dimensions or settings.
    tube([V(-.24,.53,-.45),V(-.13,.70,-.72),V(-.76,.75,-.75),V(-.76,2.43,-.87),condenserPoints[0]],.024,copper);
    tube([condenserPoints[condenserPoints.length-1],V(-.64,.60,-.87),V(.55,.24,-.77),f1],.024,copper);
    tube([evapPoints[0],V(-.74,3.28,-.54),V(-.74,.71,-.64),V(-.57,.54,-.38)],.031,mat(0x7d98b2,.5,.45));
    // Mechanical temperature dial in the front of the cabinet.
    box(.30,.18,.29,.53,3.34,.42,inner,'thermostat');
    cylinder(.09,.075,V(.53,3.31,.55),V(.53,3.31,.625),rubber,'thermostat');
    box(.022,.065,.008,.53,3.33,.666,steel,'thermostat');
    const floor=mesh(new THREE.CircleGeometry(2.3,64),mat(0xe3e1de,0,.95),V(0,-.03,0));floor.rotation.x=-Math.PI/2;
    const select=(id:PartId)=>{
      for(const [key,materials] of selectableMaterials)for(const m of materials){
        m.emissive.setHex(key===id?0x3d75d8:0x000000);m.emissiveIntensity=key===id?.65:0;
      }
    };
    let isCutaway=false;
    const toggleCutaway=(on:boolean)=>{isCutaway=on;panel.opacity=on?.13:1;panel.depthWrite=!on;rearCover.visible=!on;rearCoverTrim.visible=!on;for(const o of doorParts)o.visible=!on;};
    controller.current={view,select,cutaway:toggleCutaway};
    select('compressor');
    const raycaster=new THREE.Raycaster();
    let down:{x:number;y:number}|null=null;
    const pointerDown=(e:PointerEvent)=>{down={x:e.clientX,y:e.clientY};};
    const pointerUp=(e:PointerEvent)=>{
      if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6){down=null;return;}
      down=null;const rect=renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);
      const hit=raycaster.intersectObjects(pickable,false)[0];
      if(hit){const id=hit.object.userData.part as PartId;if(isCutaway||!(id==='thermostat'||id==='evaporator'))setSelected(id);}
    };
    renderer.domElement.addEventListener('pointerdown',pointerDown);
    renderer.domElement.addEventListener('pointerup',pointerUp);
    const resize=()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
    const observer=new ResizeObserver(resize);observer.observe(el);resize();
    const projected=new THREE.Vector3();
    let frame=0;
    const render=()=>{
      frame=requestAnimationFrame(render);controls.update();renderer.render(scene,camera);
      const width=el.clientWidth,height=el.clientHeight;
      const left:{id:PartId;x:number;y:number}[]=[],right:{id:PartId;x:number;y:number}[]=[];
      for(const p of PARTS){
        const marker=markerRefs.current[p.id],line=lineRefs.current[p.id],dot=dotRefs.current[p.id];if(!marker||!line||!dot)continue;
        projected.copy(positions[p.id]).project(camera);
        const internal=p.id==='evaporator'||p.id==='thermostat';
        const inside=projected.z<1&&Math.abs(projected.x)<.96&&Math.abs(projected.y)<.96&&(!internal||isCutaway);
        marker.style.visibility=inside?'visible':'hidden';line.style.visibility=inside?'visible':'hidden';dot.style.visibility=inside?'visible':'hidden';
        if(!inside)continue;
        const x=(projected.x+1)*width/2,y=(1-projected.y)*height/2;
        (x<width/2?left:right).push({id:p.id,x,y});
      }
      for(const [items,isLeft] of [[left,true],[right,false]] as const){
        items.sort((a,b)=>a.y-b.y);
        let previous=8;
        for(const item of items){
          const marker=markerRefs.current[item.id]!,line=lineRefs.current[item.id]!,dot=dotRefs.current[item.id]!;
          const h=marker.offsetHeight||28,w=marker.offsetWidth||100;
          const top=Math.max(previous,Math.min(height-h-8,item.y-h/2));
          const x=isLeft?8:Math.max(8,width-w-8);
          previous=top+h+5;
          marker.style.left=x+'px';marker.style.top=top+'px';
          line.setAttribute('x1',String(item.x));line.setAttribute('y1',String(item.y));
          line.setAttribute('x2',String(isLeft?x+w:x));line.setAttribute('y2',String(top+h/2));
          dot.setAttribute('cx',String(item.x));dot.setAttribute('cy',String(item.y));
        }
      }
    };render();
    return ()=>{
      cancelAnimationFrame(frame);observer.disconnect();controls.dispose();
      renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);
      const materials=new Set<THREE.Material>();
      scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
      materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();controller.current=null;
    };
  },[]);
  useEffect(()=>controller.current?.select(selected),[selected]);
  useEffect(()=>controller.current?.cutaway(cutaway),[cutaway]);
  const changeView=(v:View)=>controller.current?.view(v);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-2xl border border-line bg-steel p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="mr-auto text-xs font-extrabold uppercase tracking-widest text-accent">3D · Интерактив</span>
          <button type="button" className={buttonStyle} onClick={()=>changeView('front')} disabled={!available}>Спереди</button>
          <button type="button" className={buttonStyle} onClick={()=>changeView('back')} disabled={!available}>Сзади</button>
          <button type="button" className={buttonStyle} onClick={()=>changeView('reset')} disabled={!available}>Сброс</button>
        </div>
        <div ref={host} data-testid="fridge-3d" className="relative isolate h-[480px] overflow-hidden rounded-xl border border-line bg-[#f5f4f2] sm:h-[560px]">
          {available && <svg aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5] h-full w-full overflow-hidden">
            {PARTS.map(p=><g key={p.id}><line ref={node=>{lineRefs.current[p.id]=node;}} stroke={selected===p.id?'#3D75D8':'#656b72'} strokeWidth={selected===p.id?2:1.2}/><circle ref={node=>{dotRefs.current[p.id]=node;}} r="4" fill={selected===p.id?'#3D75D8':'#fff'} stroke="#3D75D8" strokeWidth="1.5"/></g>)}
          </svg>}
          {available ? PARTS.map(p=><button key={p.id} type="button" ref={node=>{markerRefs.current[p.id]=node;}} onClick={()=>choosePart(p.id)} aria-label={p.label+' — точка модели'} aria-pressed={selected===p.id} title={p.label} style={{visibility:'hidden',maxWidth:'43%'}} className={'absolute z-10 rounded-lg border px-2 py-1.5 text-left text-[10px] font-extrabold leading-tight shadow-sm sm:text-xs '+(selected===p.id?'border-accent bg-accent text-white':'border-[#a9adb5] bg-white/95 text-[#22262b]')}>{p.label}</button>):<div className="grid h-full place-items-center p-8 text-center text-sm text-fog">WebGL недоступен. Выберите узел в списке справа, чтобы прочитать объяснение.</div>}

        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button type="button" className={buttonStyle} onClick={()=>setCutaway(v=>!v)} aria-pressed={cutaway} disabled={!available}>{cutaway?'Корпус: прозрачный':'Корпус: закрытый'}</button>
          <p className="text-xs text-fog">Перетаскивайте · масштаб колесом или жестом</p>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-fog">Нажмите на деталь или подпись. Для внутренних узлов включите прозрачный корпус. Модель воссоздана по видеореференсу; расположение скрытых узлов условное.</p>
      </div>
      <div className="rounded-2xl border border-line bg-coal p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-fog">Выбранный узел</p>
        <div aria-live="polite">
          <h3 className="mt-1 font-display text-2xl font-bold text-paper">{part.label}</h3>
          <p className="mt-3 leading-relaxed text-silver">{part.role}</p>
          <ul className="mt-4 space-y-2">{part.facts.map(fact=><li key={fact} className="flex gap-3 rounded-lg border border-line bg-steel px-4 py-2.5 text-sm text-silver"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"/>{fact}</li>)}</ul>
        </div>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">{PARTS.map((p,i)=><button key={p.id} type="button" aria-pressed={selected===p.id} onClick={()=>choosePart(p.id)} className={'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-bold '+(selected===p.id?'border-accent bg-accent text-white':'border-line bg-steel text-paper hover:border-accent')}><span className="opacity-80">{i+1}.</span>{p.label}</button>)}</div>
        <p className="mt-5 text-xs leading-relaxed text-fog">Модель предназначена для изучения функций узлов. Не является инструкцией по разборке или обслуживанию реального оборудования.</p>
        <a href="https://www.danfoss.com/en/about-danfoss/our-businesses/cooling/the-fridge-how-it-works" target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-bold text-accent underline">Принцип работы: Danfoss</a>
      </div>
    </div>
  );
}
