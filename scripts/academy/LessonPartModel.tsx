import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Maximize, Minimize, RotateCcw } from 'lucide-react';

type Kind = 'compressor'|'condenser'|'evaporator'|'valve'|'capillary';
type Detail = {name:string; info:string};
const catalog:Record<Kind,{title:string;desc:string;details:Detail[]}> = {
 compressor:{title:'Герметичный компрессор',desc:'Типичный поршневой компрессор бытового холодильника. Внешний вид корпуса, креплений и патрубков.',details:[{name:'Герметичный корпус',info:'Закрывает электродвигатель и механизм сжатия.'},{name:'Патрубки',info:'Соединяют компрессор с холодильным контуром.'},{name:'Клеммная коробка',info:'Защищает электрические соединения.'},{name:'Опоры',info:'Крепят корпус и снижают передачу вибраций.'}]},
 condenser:{title:'Проволочно-трубчатый конденсатор',desc:'Открытая решётка на задней стенке бытового холодильника.',details:[{name:'Змеевик',info:'По трубке проходит хладагент, отдающий тепло.'},{name:'Металлическая проволока',info:'Увеличивает поверхность теплообмена с воздухом.'},{name:'Крепления',info:'Удерживают теплообменник на корпусе.'},{name:'Патрубки',info:'Связывают конденсатор с остальными узлами контура.'}]},
 evaporator:{title:'Пластинчатый испаритель',desc:'Пример алюминиевой пластины с формованными каналами, применяемой в бытовых холодильниках.',details:[{name:'Алюминиевая пластина',info:'Передаёт тепло от охлаждаемой камеры к рабочему веществу.'},{name:'Каналы хладагента',info:'В них хладагент поглощает тепло и испаряется.'},{name:'Патрубки',info:'Соединяют испаритель с контуром.'}]},
 valve:{title:'Терморегулирующий вентиль (ТРВ)',desc:'Внешнее устройство вентиля с выносным чувствительным элементом, по типу Danfoss T2/TE2.',details:[{name:'Корпус вентиля',info:'Содержит механизм регулирования расхода хладагента.'},{name:'Мембранная головка',info:'Воспринимает усилия, определяющие положение регулирующего механизма.'},{name:'Чувствительный баллон',info:'Реагирует на температуру в месте измерения.'},{name:'Импульсная трубка',info:'Связывает чувствительный элемент с мембранной головкой.'}]},
 capillary:{title:'Капиллярная трубка',desc:'Тонкая медная трубка — один из вариантов дросселирующего устройства бытовых холодильников.',details:[{name:'Трубка',info:'Малое внутреннее сечение создаёт сопротивление потоку.'},{name:'Витки трубки',info:'На модели показана компактная форма размещения; реальная геометрия зависит от конструкции.'}]}
};
const routes:Record<string,Kind>={'c1-l4':'compressor','c1-l5':'condenser','c1-l6':'evaporator','c1-l8':'valve'};
const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
function build(kind:Kind){
 const root=new THREE.Group();
 const materials=new Map<number,THREE.MeshStandardMaterial[]>();
 const selectable:THREE.Mesh[]=[];
 const mat=(c:number,m=0,r=.36)=>new THREE.MeshStandardMaterial({color:c,metalness:m,roughness:r});
 const black=mat(0x202327,.48,.3), steel=mat(0xb5bcc2,.78,.29), copper=mat(0xb67843,.72,.32), brass=mat(0xb29354,.7,.33), rubber=mat(0x292b2e,0,.85), aluminum=mat(0xbac2c7,.68,.36);
 const add=(g:THREE.BufferGeometry,m:THREE.MeshStandardMaterial,p:THREE.Vector3,id:number)=>{
   const own=m.clone();const mesh=new THREE.Mesh(g,own);mesh.position.copy(p);mesh.userData.detail=id;root.add(mesh);selectable.push(mesh);
   const list=materials.get(id)||[];list.push(own);materials.set(id,list);return mesh;
 };
 const box=(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.MeshStandardMaterial,id:number,r=.03)=>add(new RoundedBoxGeometry(w,h,d,3,r),m,V(x,y,z),id);
 const rod=(a:THREE.Vector3,b:THREE.Vector3,r:number,m:THREE.MeshStandardMaterial,id:number,sides=24)=>{
   const o=add(new THREE.CylinderGeometry(r,r,a.distanceTo(b),sides),m,a.clone().add(b).multiplyScalar(.5),id);
   o.quaternion.setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize());return o;
 };
 const tube=(points:THREE.Vector3[],r:number,m:THREE.MeshStandardMaterial,id:number)=>{
   const curve=new THREE.CurvePath<THREE.Vector3>();
   for(let i=1;i<points.length;i++)curve.add(new THREE.LineCurve3(points[i-1],points[i]));
   return add(new THREE.TubeGeometry(curve,Math.max(32,points.length*2),r,10,false),m,V(0,0,0),id);
 };
 const snake=(left:number,right:number,top:number,bottom:number,z:number,rows:number)=>{
   const out:THREE.Vector3[]=[];const dy=(top-bottom)/(rows-1),r=dy/2;
   for(let i=0;i<rows;i++){const y=top-i*dy,edge=i%2?left:right,sign=i%2?-1:1;
     out.push(V(i%2?right:left,y,z),V(edge,y,z));
     if(i<rows-1)for(let j=1;j<=16;j++){const t=j*Math.PI/16;out.push(V(edge+sign*r*Math.sin(t),y-r+r*Math.cos(t),z));}
   }return out;
 };
 const ring=(radius:number,thick:number,p:THREE.Vector3,m:THREE.MeshStandardMaterial,id:number)=>{
   const o=add(new THREE.TorusGeometry(radius,thick,12,64),m,p,id);o.rotation.x=Math.PI/2;return o;
 };
 if(kind==='compressor'){
   const profile=[[0,-.63],[.56,-.63],[.79,-.54],[.91,-.35],[.96,-.05],[.95,.25],[.88,.48],[.73,.64],[.51,.73],[.24,.77],[0,.78]].map(p=>new THREE.Vector2(p[0],p[1]));
   const shell=add(new THREE.LatheGeometry(profile,64),black,V(0,0,0),0);shell.scale.z=.83;
   const seam=ring(.94,.034,V(0,-.02,0),black,0);seam.scale.y=.83;
   box(1.95,.12,1.48,0,-.66,0,black,3);
   for(const x of [-.83,.83])for(const z of [-.64,.64]){
     box(.42,.07,.35,x,-.70,z,black,3);
     rod(V(x,-.82,z),V(x,-.62,z),.145,rubber,3);
     rod(V(x,-.64,z),V(x,-.58,z),.065,steel,3,6);
   }
   tube([V(-.86,.18,.1),V(-1.12,.18,.1),V(-1.25,.30,.1),V(-1.25,.65,.1)],.075,copper,1);
   tube([V(.9,-.18,-.05),V(1.17,-.18,-.05),V(1.35,-.02,-.05),V(1.35,.33,-.05)],.05,copper,1);
   rod(V(-.9,-.30,-.15),V(-1.16,-.30,-.15),.046,copper,1);
   box(.47,.55,.40,.66,-.11,.66,rubber,2,.06);
   box(.38,.43,.075,.66,-.11,.88,black,2,.035);
   box(.49,.18,.012,-.12,.19,.80,aluminum,0,.008);
   for(let i=0;i<4;i++)box(.36,.008,.008,-.12,.14+i*.027,.809,black,0,.002);
 }
 if(kind==='condenser'){
   const pts=snake(-.72,.72,1.2,-1.2,0,10);
   tube(pts,.037,black,0);
   for(let i=0;i<48;i++){const x=-.76+i*1.52/47;rod(V(x,-1.31,.045),V(x,1.31,.045),.008,black,1,8);rod(V(x,-1.31,-.045),V(x,1.31,-.045),.008,black,1,8);}
   for(const x of [-.79,.79]){box(.10,2.65,.08,x,0,-.075,black,2,.012);for(const y of [-1.1,1.1]){box(.22,.15,.065,x,y,-.12,steel,2);rod(V(x,y,-.16),V(x,y,-.19),.028,black,2,6);}}
   tube([pts[0],V(-.94,1.2,0),V(-1.08,1.07,0),V(-1.08,.72,0)],.036,copper,3);
   tube([pts[pts.length-1],V(-.99,-1.2,0),V(-1.14,-1.34,0),V(-1.14,-1.52,0)],.036,copper,3);
 }
 if(kind==='evaporator'){
   box(2.35,1.72,.085,0,0,0,aluminum,0,.10);
   box(2.18,1.56,.045,0,0,.053,steel,0,.08);
   const pts=snake(-.80,.80,.60,-.60,.085,6);
   tube(pts,.048,aluminum,1);
   for(const x of [-1.04,1.04])for(const y of [-.70,.70])rod(V(x,y,.045),V(x,y,.08),.037,black,0);
   tube([pts[0],V(-1.15,.60,.085),V(-1.32,.42,.085),V(-1.32,.18,.085)],.039,copper,2);
   tube([pts[pts.length-1],V(-1.16,-.60,.085),V(-1.34,-.78,.085),V(-1.34,-1.00,.085)],.048,copper,2);
 }
 if(kind==='valve'){
   box(.65,.78,.62,.48,-.05,0,brass,0,.075);
   rod(V(.48,-.42,0),V(.48,-.70,0),.20,brass,0,6);
   rod(V(.48,-.70,0),V(.48,-.94,0),.12,copper,0);
   rod(V(.76,-.12,0),V(1.05,-.12,0),.21,brass,0,6);
   rod(V(1.05,-.12,0),V(1.28,-.12,0),.13,copper,0);
   rod(V(.48,.28,0),V(.48,.46,0),.28,brass,1,6);
   rod(V(.48,.46,0),V(.48,.59,0),.46,steel,1,64);
   const dome=add(new THREE.SphereGeometry(.45,40,20),steel,V(.48,.59,0),1);dome.scale.y=.25;
   ring(.45,.025,V(.48,.51,0),steel,1);
   const coil:THREE.Vector3[]=[V(.36,.66,0),V(.10,.90,0)];
   for(let i=0;i<=100;i++){const a=i/100*Math.PI*5;coil.push(V(-.29+.28*Math.cos(a),.83+.28*Math.sin(a),-.03+i*.0015));}
   coil.push(V(-.72,.62,.12),V(-.94,.27,.12),V(-.94,.10,.12));tube(coil,.018,steel,3);
   rod(V(-.94,-.64,.12),V(-.94,.10,.12),.105,steel,2);
   for(const y of [-.64,.10])add(new THREE.SphereGeometry(.105,24,16),steel,V(-.94,y,.12),2);
 }
 if(kind==='capillary'){
   const pts:THREE.Vector3[]=[];
   pts.push(V(-1.55,.82,0),V(-.8,.82,0),V(-.63,.70,0));
   for(let i=0;i<=240;i++){const t=i/240*Math.PI*10;pts.push(V(.63*Math.cos(t),.63*Math.sin(t),-.20+i/240*.40));}
   pts.push(V(.80,-.64,.20),V(1.25,-.64,.20),V(1.5,-.45,.20));
   tube(pts.slice(0,3),.024,copper,0);tube(pts.slice(2,-2),.024,copper,1);tube(pts.slice(-3),.024,copper,0);
 }
 // normalize the viewing size; geometry is illustrative, not manufacturing dimensions.
 const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(V(0,0,0)),center=bounds.getCenter(V(0,0,0));
 const scale=3.2/Math.max(size.x,size.y,size.z);root.position.copy(center.multiplyScalar(-scale));root.scale.setScalar(scale);
 const select=(id:number)=>{for(const [key,ms] of materials)for(const m of ms){m.emissive.setHex(key===id?0x3d75d8:0);m.emissiveIntensity=key===id?.35:0;}};
 [black,steel,copper,brass,rubber,aluminum].forEach(m=>m.dispose());
 return {root,select,selectable};
}
const btn='rounded-full border border-line bg-white px-3 py-2 text-xs font-bold text-paper hover:border-accent';
function PartViewer({kind}:{kind:Kind}){
 const [selected,setSelected]=useState(-1);
 const [expanded,setExpanded]=useState(false);
 const [available,setAvailable]=useState(true);
 const host=useRef<HTMLDivElement>(null), outer=useRef<HTMLElement>(null);
 const controller=useRef<{select:(id:number)=>void;reset:()=>void}|null>(null);
 const data=catalog[kind];
 useEffect(()=>{
   const el=host.current;if(!el)return;
   let renderer:THREE.WebGLRenderer;
   try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch{setAvailable(false);return;}
   renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setClearColor(0,0);
   renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
   renderer.domElement.style.cssText='display:block;width:100%;height:100%;touch-action:none';
   renderer.domElement.setAttribute('aria-label','Интерактивная 3D-модель: '+data.title);el.appendChild(renderer.domElement);
   const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(36,1,.1,50);
   const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),reflection=pmrem.fromScene(room,.04);
   scene.environment=reflection.texture;room.dispose();pmrem.dispose();
   scene.add(new THREE.HemisphereLight(0xffffff,0x818a97,2));
   const key=new THREE.DirectionalLight(0xffffff,2.8);key.position.set(4,6,4);scene.add(key);
   const model=build(kind);scene.add(model.root);
   const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=2.8;controls.maxDistance=13;
   const ray=new THREE.Raycaster();let down:{x:number;y:number}|null=null;
   let frame=0,disposed=false;
   const render=()=>{frame=0;if(disposed)return;controls.update();renderer.render(scene,camera);};
   const invalidate=()=>{if(!frame&&!disposed)frame=requestAnimationFrame(render);};
   const reset=()=>{camera.position.copy(V(3.9,2.4,6.6));controls.target.set(0,0,0);controls.update();invalidate();};
   const resize=()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);invalidate();};
   const select=(id:number)=>{model.select(id);invalidate();};
   controller.current={reset,select};
   controls.addEventListener('change',invalidate);
   const onDown=(e:PointerEvent)=>{down={x:e.clientX,y:e.clientY};};
   const onUp=(e:PointerEvent)=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6){down=null;return;}down=null;const r=el.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hit=ray.intersectObjects(model.selectable)[0];if(hit)setSelected(hit.object.userData.detail as number);};
   renderer.domElement.addEventListener('pointerdown',onDown);renderer.domElement.addEventListener('pointerup',onUp);
   const ro=new ResizeObserver(resize);ro.observe(el);reset();resize();
   return ()=>{disposed=true;cancelAnimationFrame(frame);ro.disconnect();controls.removeEventListener('change',invalidate);controls.dispose();renderer.domElement.removeEventListener('pointerdown',onDown);renderer.domElement.removeEventListener('pointerup',onUp);model.root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(o.material as THREE.Material).dispose();}});reflection.dispose();renderer.dispose();renderer.domElement.remove();controller.current=null;};
 },[kind,data.title]);
 useEffect(()=>controller.current?.select(selected),[selected]);
 useEffect(()=>{if(!expanded)return;const old=document.body.style.overflow;document.body.style.overflow='hidden';const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setExpanded(false);};window.addEventListener('keydown',key);return()=>{window.removeEventListener('keydown',key);document.body.style.overflow=old;};},[expanded]);
 return <section ref={outer} data-testid="lesson-part-viewer" data-kind={kind} className="rounded-2xl border border-line bg-steel p-4" style={expanded?{position:'fixed',inset:0,zIndex:10000,overflow:'auto',borderRadius:0,background:'#f3f2ef',padding:'clamp(12px,2vw,30px)'}:undefined}>
   <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
     <div><h3 className="font-display text-lg font-bold text-paper">{data.title}</h3><p className="mt-1 text-xs text-fog">{data.desc}</p></div>
     <div className="flex flex-wrap gap-2"><button type="button" className={btn} onClick={()=>{setSelected(-1);controller.current?.reset();}}><RotateCcw size={14} className="mr-1 inline"/>Сброс</button><button type="button" className={btn} aria-pressed={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded?<Minimize size={14} className="mr-1 inline"/>:<Maximize size={14} className="mr-1 inline"/>}{expanded?'Свернуть':'На весь экран'}</button></div>
   </div>
   <div ref={host} className="relative overflow-hidden rounded-xl border border-line" style={{height:expanded?'max(320px,calc(100dvh - 280px))':'clamp(280px,42vw,440px)',background:'radial-gradient(ellipse at 50% 42%, #dedede 0%, #bfc0c1 53%, #77797c 100%)'}}>
     {!available&&<p className="grid h-full place-items-center p-6 text-center text-sm">3D недоступно в этом браузере. Ниже доступны названия деталей и их назначение.</p>}
   </div>
   <p className="my-3 text-xs text-fog">Вращайте мышью, приближайте колесом или жестом. Нажмите на деталь или название, чтобы выделить её.</p>
   <div className="flex flex-wrap gap-2">{data.details.map((d,i)=><button key={d.name} type="button" aria-pressed={selected===i} onClick={()=>setSelected(selected===i?-1:i)} className={btn+(selected===i?' !border-accent !bg-accent !text-white':'')}>{d.name}</button>)}</div>
   <p aria-live="polite" className="mt-3 min-h-10 text-sm text-silver">{selected>=0?data.details[selected]?.info:'Выберите компонент, чтобы увидеть его назначение.'}</p>
   <p className="mt-2 text-xs text-fog">Учебная 3D-реконструкция типовой детали, не заводская CAD-модель. Форма и пропорции могут отличаться у разных производителей.</p>
 </section>;
}
export function LessonPartModel({lessonId}:{lessonId:string}){
 const initial=routes[lessonId];
 if(!initial)return null;
 return <LessonPartSection key={lessonId} initial={initial}/>;
}
function LessonPartSection({initial}:{initial:Kind}){
 const [kind,setKind]=useState(initial);
 return <div className="my-6 space-y-3" data-testid="lesson-part-model">
   <h3 className="font-display text-xl font-bold text-paper">Рассмотрите деталь в 3D</h3>
   {initial==='valve'&&<div className="flex flex-wrap gap-2">{(['valve','capillary'] as const).map(k=><button key={k} type="button" aria-pressed={kind===k} onClick={()=>setKind(k)} className={btn+(kind===k?' !bg-accent !text-white':'')}>{k==='valve'?'ТРВ':'Капиллярная трубка'}</button>)}</div>}
   <PartViewer key={kind} kind={kind}/>
 </div>;
}
