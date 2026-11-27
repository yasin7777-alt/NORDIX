import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Maximize, Minimize } from 'lucide-react';

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
const cycleOrder:PartId[]=['compressor','condenser','filter','capillary','evaporator'];
const processOrder:PartId[]=[...cycleOrder,'thermostat'];
const processes:Record<PartId,{action:string;input:string;output:string;color:string;note:string}>={
 compressor:{action:'Компрессор принимает пар с низким давлением, сжимает его и направляет к конденсатору. При сжатии давление и температура пара обычно растут.',input:'Пар низкого давления',output:'Горячий пар высокого давления',color:'#dc603c',note:'Оранжевые точки показывают движение пара после сжатия.'},
 condenser:{action:'Горячий хладагент отдаёт тепло воздуху комнаты. В обычном цикле пар постепенно превращается в жидкость.',input:'Пар высокого давления',output:'Жидкость высокого давления',color:'#d77a33',note:'Стрелки показывают, как тепло уходит от решётки наружу.'},
 filter:{action:'Жидкий хладагент проходит через фильтр-осушитель. Он удерживает влагу и загрязнения; это не основной этап изменения давления.',input:'Жидкий хладагент',output:'Жидкость с меньшим содержанием влаги и загрязнений',color:'#d7a040',note:'Точки проходят через корпус фильтра к капиллярной трубке.'},
 capillary:{action:'Капиллярка создаёт сопротивление потоку. Давление снижается, часть жидкости превращается в пар, и температура насыщения становится ниже.',input:'Жидкость высокого давления',output:'Смесь жидкости и пара низкого давления',color:'#498be4',note:'Переход от тёплого к синему цвету обозначает смену области давления, а не измеренную температуру.'},
 evaporator:{action:'В испарителе хладагент поглощает тепло камеры и кипит. Пар возвращается к компрессору. Так холодильник переносит тепло наружу.',input:'Смесь жидкости и пара',output:'Пар низкого давления',color:'#498be4',note:'Синие точки движутся к выходу; стрелки показывают приток тепла из камеры к испарителю.'},
 thermostat:{action:'Термостат сравнивает температуру камеры с заданной. В этой учебной модели он включает охлаждение, когда камера нагревается, и выключает его после достижения нужного режима.',input:'Температура камеры',output:'Команда на охлаждение или остановку',color:'#3d75d8',note:'Пульсация регулятора и смена состояния условны. Термостат не является участком движения хладагента.'}
};
const V = (x:number,y:number,z:number) => new THREE.Vector3(x,y,z);
const positions:Record<PartId,THREE.Vector3> = {
  evaporator:V(-.38,3.02,-.44), compressor:V(-.40,.30,-.60), condenser:V(.46,1.65,-.91),
  capillary:V(.72,1.06,-.78), filter:V(.55,.44,-.77), thermostat:V(.53,3.31,.65)
};
const buttonStyle='rounded-full border border-line bg-white px-3 py-2 text-xs font-bold text-paper transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent';
export function FridgeModel(){
  const [selected,setSelected]=useState<PartId>('compressor');
  const [working,setWorking]=useState(false);
  const [playing,setPlaying]=useState(false);
  const [fullCycle,setFullCycle]=useState(false);
  const [thermostatOn,setThermostatOn]=useState(true);
  const activity=useRef({working:false,playing:false,fullCycle:false,selected:'compressor' as PartId,thermostatOn:true});
  const [cutaway,setCutaway]=useState(false);
  const [available,setAvailable]=useState(true);
  const host=useRef<HTMLDivElement>(null);
  const viewer=useRef<HTMLDivElement>(null);
  const nativeFullscreen=useRef(false);
  const [expanded,setExpanded]=useState(false);
  const [labels,setLabels]=useState(true);
  const closeFullscreen=()=>{
    setExpanded(false);
    if(document.fullscreenElement===viewer.current)void document.exitFullscreen().catch(()=>{});
  };
  const toggleFullscreen=()=>{
    if(expanded){closeFullscreen();return;}
    const element=viewer.current;
    if(!element)return;
    setExpanded(true);
    if(element.requestFullscreen)void element.requestFullscreen().then(()=>{nativeFullscreen.current=document.fullscreenElement===element;}).catch(()=>{});
  };
  useEffect(()=>{
    const onChange=()=>{
      if(document.fullscreenElement===viewer.current){nativeFullscreen.current=true;setExpanded(true);}
      else if(nativeFullscreen.current){nativeFullscreen.current=false;setExpanded(false);}
    };
    document.addEventListener('fullscreenchange',onChange);
    return ()=>document.removeEventListener('fullscreenchange',onChange);
  },[]);
  useEffect(()=>{
    if(!expanded)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'){setExpanded(false);if(document.fullscreenElement===viewer.current)void document.exitFullscreen().catch(()=>{});}};
    document.addEventListener('keydown',onKey);
    return ()=>{document.body.style.overflow=previous;document.removeEventListener('keydown',onKey);};
  },[expanded]);
  const markerRefs=useRef<Partial<Record<PartId,HTMLButtonElement|null>>>({});
  const lineRefs=useRef<Partial<Record<PartId,SVGLineElement|null>>>({});
  const dotRefs=useRef<Partial<Record<PartId,SVGCircleElement|null>>>({});
  const controller=useRef<{view:(v:View)=>void;select:(id:PartId)=>void;cutaway:(on:boolean)=>void;invalidate:()=>void}|null>(null);
  const part=PARTS.find(p=>p.id===selected)!;
  const focusProcess=(id:PartId)=>{
    setSelected(id);
    const internal=id==='evaporator'||id==='thermostat';
    setCutaway(true);
    controller.current?.view(internal?'front':'back');
  };
  const choosePart=(id:PartId)=>{
    if(working){setFullCycle(false);focusProcess(id);return;}
    setSelected(id);if(id==='evaporator'||id==='thermostat'){setCutaway(true);controller.current?.view('front');}
  };
  const changeMode=(on:boolean)=>{
    setWorking(on);setPlaying(on);setFullCycle(false);
    if(on){setLabels(false);focusProcess('compressor');}
    else{setLabels(true);setCutaway(false);setSelected('compressor');controller.current?.view('reset');}
  };
  const stepProcess=(delta:number)=>{
    setFullCycle(false);
    focusProcess(processOrder[(processOrder.indexOf(selected)+delta+processOrder.length)%processOrder.length]);
  };
  const startFullCycle=()=>{
    setWorking(true);setFullCycle(true);setPlaying(true);setLabels(false);setCutaway(true);
    setSelected('compressor');controller.current?.view('back');
  };
  useEffect(()=>{
    activity.current={working,playing,fullCycle,selected,thermostatOn};
    controller.current?.invalidate();
  },[working,playing,fullCycle,selected,thermostatOn]);
  useEffect(()=>{
    if(!working||!playing||!fullCycle)return;
    const timer=window.setInterval(()=>{
      setSelected(id=>cycleOrder[(cycleOrder.indexOf(id)+1)%cycleOrder.length]);
    },5500);
    return()=>window.clearInterval(timer);
  },[working,playing,fullCycle]);
  useEffect(()=>{
    if(working&&fullCycle){
      setCutaway(true);controller.current?.view(selected==='evaporator'?'front':'back');
    }
  },[working,fullCycle,selected]);
  useEffect(()=>{
    if(!working||!playing||selected!=='thermostat')return;
    const timer=window.setInterval(()=>setThermostatOn(on=>!on),3200);
    return()=>window.clearInterval(timer);
  },[working,playing,selected]);

  useEffect(()=>{
    const el=host.current;
    if(!el)return;
    let renderer:THREE.WebGLRenderer;
    try { renderer=new THREE.WebGLRenderer({antialias:true,alpha:true}); }
    catch { setAvailable(false); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    renderer.setClearColor(0x000000,0);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.05;
    renderer.domElement.style.cssText='display:block;width:100%;height:100%;touch-action:none;';
    renderer.domElement.setAttribute('aria-label','Вращаемая трёхмерная модель холодильника');
    el.prepend(renderer.domElement);
    const scene=new THREE.Scene();
    const environment=new RoomEnvironment();
    const pmrem=new THREE.PMREMGenerator(renderer);
    const reflection=pmrem.fromScene(environment,.045);
    scene.environment=reflection.texture;scene.environmentIntensity=.65;
    environment.dispose();pmrem.dispose();
    const camera=new THREE.PerspectiveCamera(36,1,.1,50);
    const controls=new OrbitControls(camera,renderer.domElement);
    let invalidate=()=>{};
    controls.target.set(0,1.78,0);
    controls.enableDamping=true;
    controls.enablePan=false;
    controls.minDistance=2.6;
    controls.maxDistance=11;
    controls.minPolarAngle=.18;
    controls.maxPolarAngle=Math.PI*.51;
    const view=(v:View)=>{
      camera.position.copy(v==='front'?V(2.8,2.5,7.5):v==='back'?V(0,2.25,-8.1):V(2.6,2.8,-7.7));
      controls.target.set(0,1.78,0); controls.update();invalidate();
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
    const enamel=mat(0xe7e7e2,.18,.30), inner=mat(0xe5e6e2,.06,.43), dark=mat(0x202326,.52,.30), copper=mat(0xa87343,.72,.34);
    // Procedural finish: restrained surface variation, not a photograph.
    const textureCanvas=document.createElement('canvas');textureCanvas.width=512;textureCanvas.height=512;
    const ctx=textureCanvas.getContext('2d')!;
    ctx.fillStyle='#e7e7e2';ctx.fillRect(0,0,512,512);
    let seed=173;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<13000;i++){const shade=170+Math.floor(random()*75);ctx.fillStyle='rgba('+shade+','+shade+','+shade+',0.09)';ctx.fillRect(random()*512,random()*512,1+random()*2,1);}
    const enamelTexture=new THREE.CanvasTexture(textureCanvas);enamelTexture.colorSpace=THREE.SRGBColorSpace;enamel.map=enamelTexture;enamel.color.setHex(0xffffff);
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
    const rearCoverInset=rounded(1.28,.64,.060,0,2.99,-.815,mat(0x292a2c,.38,.28),.065);
    const rearCoverDetails:THREE.Object3D[]=[rearCover,rearCoverTrim,rearCoverInset];
    // Stamped perimeter and recessed fasteners, visible in the reference.
    const screwMat=mat(0x969896,.65,.35);
    for(const x of [-.64,0,.64])for(const y of [2.63,3.35]){
      rearCoverDetails.push(cylinder(.019,.012,V(x,y,-.81),V(x,y,-.822),screwMat));
      rearCoverDetails.push(box(.024,.004,.004,x,y,-.83,blackPanel));
    }
    for(const x of [-.70,.70]){
      rearCoverDetails.push(cylinder(.019,.012,V(x,2.99,-.81),V(x,2.99,-.822),screwMat));
    }
    // Narrow cabinet edge seams and lower machine-compartment sheet metal.
    for(const x of [-.76,.76]){
      box(.014,2.69,.014,x,1.99,-.749,trim);
      rounded(.18,.44,.09,x,.30,-.67,backMetal,.025);
      for(const y of [.20,.48])cylinder(.022,.014,V(x,y,-.724),V(x,y,-.738),steel);
    }
    rounded(1.45,.095,.23,0,.13,-.54,backMetal,.016);
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
    const handleMounts=[-.58,-.29].map(x=>rounded(.095,.13,.10,x,2.36,.86,steel,.025));
    const doorParts=[door,gasket,doorHandle,frontBadge,...handleMounts];
    // Subtle pressed trim on the front and two cabinet hinges.
    doorParts.push(rounded(1.54,.018,.018,0,2.80,.862,trim,.008));
    for(const y of [1.0,3.08]){
      rounded(.075,.22,.12,.845,y,.65,steel,.026);
      cylinder(.032,.18,V(.855,y-.09,.73),V(.855,y+.09,.73),steel);
    }
        // Upper internal evaporator: plate and visible teaching representation of tube.
    const evapMat=mat(0x9cb8c6,.65,.32);
    rounded(1.46,.09,1.13,0,2.71,-.02,evapMat,.035,'evaporator');
    rounded(1.46,.60,.07,0,3.03,-.54,evapMat,.035,'evaporator');
    const evapPoints=snake(-.56,.56,2.78,3.28,-.48,5);
    tube(evapPoints,.026,mat(0x6088b5,.64,.28),'evaporator');
    // Compressor shell, mounting feet and electrical cover (visual only).
    // Black welded metal shell, feet, isolation mounts and terminal cover.
    const profile=[V(0,-.27,0),V(.23,-.27,0),V(.33,-.22,0),V(.37,-.10,0),V(.38,.03,0),V(.36,.13,0),V(.29,.23,0),V(.17,.28,0),V(0,.29,0)].map(p=>new THREE.Vector2(p.x,p.y));
    const shell=mesh(new THREE.LatheGeometry(profile,64),dark,V(-.40,.32,-.49),'compressor');shell.scale.z=.87;
    rounded(.79,.065,.65,-.40,.11,-.49,dark,.025,'compressor');
    for(const x of [-.68,-.12])for(const z of [-.72,-.26]){
      cylinder(.065,.075,V(x,.09,z),V(x,.165,z),rubber,'compressor');
      cylinder(.029,.025,V(x,.165,z),V(x,.19,z),steel,'compressor');
    }
    rounded(.24,.095,.012,-.40,.40,-.816,mat(0xa5a6a3,.35,.5),.008,'compressor');
    for(let i=0;i<3;i++)box(.17,.006,.004,-.40,.38+i*.022,-.824,mat(0x4e5152,.1,.7),'compressor');
    const seam=mesh(new THREE.TorusGeometry(.36,.015,10,48),steel,V(-.40,.30,-.49),'compressor');
    seam.rotation.x=Math.PI/2;seam.scale.set(1,.85,1);
    rounded(.19,.21,.22,-.04,.29,-.49,rubber,.03,'compressor');
    rounded(.12,.12,.075,.055,.29,-.60,dark,.018,'compressor');
    // External wire-tube condenser.
    const condenserPoints=snake(-.65,.65,.63,2.43,-.87,10);
    const condenserMat=mat(0x26282a,.38,.42);
    tube(condenserPoints,.027,condenserMat,'condenser');
    for(let group=0;group<7;group++)for(let wire=0;wire<9;wire++){
      const x=-.62+group*.194+wire*.015;
      cylinder(.0045,1.93,V(x,.53,-.91),V(x,2.46,-.91),condenserMat,'condenser');
    }
    for(const x of [-.65,.65]){
      rounded(.075,1.97,.045,x,1.53,-.80,dark,.012,'condenser');
      for(const y of [.80,2.14])cylinder(.026,.04,V(x,y,-.835),V(x,y,-.875),steel,'condenser');
    }
    rounded(1.56,.13,.12,0,.52,-.82,dark,.022,'condenser');
    for(const x of [-.71,.71]){
      rounded(.15,.18,.055,x,.52,-.88,blackPanel,.014,'condenser');
      cylinder(.027,.022,V(x,.52,-.913),V(x,.52,-.935),steel,'condenser');
    }
    // Visible power lead and plug are decorative, without wiring instructions.
    const cordMat=mat(0x272a2e,0,.75);
    tube([V(-.69,.22,-.71),V(-.93,.10,-.72),V(-1.20,.055,-.65),V(-1.46,.045,-.48)],.019,cordMat);
    rounded(.15,.09,.12,-1.49,.055,-.45,cordMat,.025);
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
    const discharge=[V(-.24,.53,-.45),V(-.13,.70,-.72),V(-.76,.75,-.75),V(-.76,2.43,-.87),condenserPoints[0]];
    const liquidLine=[condenserPoints[condenserPoints.length-1],V(-.64,.60,-.87),V(.55,.24,-.77),f1];
    const suction=[evapPoints[0],V(-.74,3.28,-.54),V(-.74,.71,-.64),V(-.57,.54,-.49)];
    tube(discharge,.024,copper);
    tube(liquidLine,.024,copper);
    tube(suction,.031,mat(0x7d98b2,.5,.45));
    // Mechanical temperature dial in the front of the cabinet.
    box(.30,.18,.29,.53,3.34,.42,inner,'thermostat');
    cylinder(.09,.075,V(.53,3.31,.55),V(.53,3.31,.625),rubber,'thermostat');
    box(.022,.065,.008,.53,3.33,.666,steel,'thermostat');
    // Conceptual flow overlays share the original geometry. They depict functions, not service parameters.
    const flowRoot=new THREE.Group();flowRoot.visible=false;scene.add(flowRoot);
    const curveOf=(points:THREE.Vector3[])=>{
      const curve=new THREE.CurvePath<THREE.Vector3>();
      for(let i=1;i<points.length;i++)if(points[i].distanceToSquared(points[i-1])>1e-9)curve.add(new THREE.LineCurve3(points[i-1],points[i]));
      return curve;
    };
    const hot=new THREE.Color(0xf46d31),warm=new THREE.Color(0xeab24c),cold=new THREE.Color(0x389bff);
    const flowPaths=[
      {id:'compressor' as PartId,points:[...suction.slice(-1),V(-.40,.32,-.49),...discharge],from:hot,to:hot},
      {id:'condenser' as PartId,points:condenserPoints,from:hot,to:warm},
      {id:'filter' as PartId,points:[...liquidLine,f2],from:warm,to:warm},
      {id:'capillary' as PartId,points:cap,from:warm,to:cold},
      {id:'evaporator' as PartId,points:[...evapPoints.slice().reverse(),...suction.slice(1)],from:cold,to:cold}
    ].map(p=>{
      const curve=curveOf(p.points);
      const lineMaterial=new THREE.MeshBasicMaterial({color:p.from,transparent:true,opacity:.75,depthTest:false,depthWrite:false});
      const line=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(40,p.points.length*3),.014,8,false),lineMaterial);
      line.renderOrder=12;flowRoot.add(line);
      const particles=Array.from({length:Math.min(22,Math.max(6,Math.ceil(curve.getLength()*3)))},()=>{
        const m=new THREE.Mesh(new THREE.SphereGeometry(.033,12,8),new THREE.MeshBasicMaterial({color:p.from,depthTest:false,depthWrite:false}));
        m.renderOrder=13;flowRoot.add(m);return m;
      });
      return {...p,curve,line,particles};
    });
    const heatArrows:Array<{id:PartId;origin:THREE.Vector3;dir:THREE.Vector3;arrow:THREE.ArrowHelper}>=[];
    for(const id of ['condenser','evaporator'] as const){
      for(let i=0;i<4;i++){
        const origin=id==='condenser'?V(-.43+i*.28,1.03+i*.29,-.97):V(-.49+i*.30,2.45,-.15);
        const dir=id==='condenser'?V(0,.12,-1).normalize():V(0,1,0);
        const arrow=new THREE.ArrowHelper(dir,origin,.35,0xf48a36,.10,.075);
        arrow.line.material.depthTest=false;arrow.cone.material.depthTest=false;
        arrow.line.renderOrder=14;arrow.cone.renderOrder=14;flowRoot.add(arrow);heatArrows.push({id,origin,dir,arrow});
      }
    }
    let phase=0,lastTime=0;
    const animateProcess=(time:number)=>{
      const a=activity.current;flowRoot.visible=a.working;
      const dt=lastTime?Math.min(.08,(time-lastTime)/1000):0;lastTime=time;
      if(a.working&&a.playing)phase+=dt;
      for(const p of flowPaths){
        const active=p.id===a.selected,visible=a.working&&(active||a.fullCycle);
        p.line.visible=visible;p.line.material.opacity=active?.78:.24;
        p.particles.forEach((m,i)=>{
          m.visible=visible&&(active||a.fullCycle);
          if(!m.visible)return;
          const u=(i/p.particles.length+phase*.65/Math.max(.5,p.curve.getLength()))%1;
          m.position.copy(p.curve.getPointAt(u));
          m.material.color.copy(p.from).lerp(p.to,u);
          m.scale.setScalar(active?1:.72);
        });
      }
      for(const h of heatArrows){
        h.arrow.visible=a.working&&a.selected===h.id;
        if(h.arrow.visible)h.arrow.position.copy(h.origin).addScaledVector(h.dir,(phase*.38)% .26);
      }
      if(a.working&&a.selected==='thermostat'){
        for(const m of selectableMaterials.get('thermostat')||[]){
          m.emissive.setHex(a.thermostatOn?0x3d75d8:0x64748b);
          m.emissiveIntensity=a.thermostatOn?.45+.25*Math.sin(phase*5):.12;
        }
      }
    };
    // Soft contact shadow without a visible circular platform, as in the reference viewer.
    const shadowCanvas=document.createElement('canvas');shadowCanvas.width=256;shadowCanvas.height=256;
    const shadowCtx=shadowCanvas.getContext('2d')!;
    const gradient=shadowCtx.createRadialGradient(128,128,15,128,128,128);
    gradient.addColorStop(0,'rgba(0,0,0,0.30)');gradient.addColorStop(.48,'rgba(0,0,0,0.14)');gradient.addColorStop(1,'rgba(0,0,0,0)');
    shadowCtx.fillStyle=gradient;shadowCtx.fillRect(0,0,256,256);
    const shadowTexture=new THREE.CanvasTexture(shadowCanvas);
    const shadowMaterial=new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false});
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(3.5,3.0),shadowMaterial);
    floor.position.set(0,-.025,0);floor.rotation.x=-Math.PI/2;scene.add(floor);
    const select=(id:PartId)=>{
      for(const [key,materials] of selectableMaterials)for(const m of materials){
        m.emissive.setHex(key===id?0x3d75d8:0x000000);m.emissiveIntensity=key===id?.65:0;
      }
      invalidate();
    };
    let isCutaway=false;
    const toggleCutaway=(on:boolean)=>{isCutaway=on;panel.opacity=on?.13:1;panel.depthWrite=!on;for(const o of rearCoverDetails)o.visible=!on;for(const o of doorParts)o.visible=!on;invalidate();};
    controller.current={view,select,cutaway:toggleCutaway,invalidate:()=>invalidate()};
    select('compressor');
    const raycaster=new THREE.Raycaster();
    let down:{x:number;y:number}|null=null;
    const pointerDown=(e:PointerEvent)=>{down={x:e.clientX,y:e.clientY};};
    const pointerUp=(e:PointerEvent)=>{
      if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6){down=null;return;}
      down=null;const rect=renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);
      const hit=raycaster.intersectObjects(pickable,false)[0];
      if(hit){const id=hit.object.userData.part as PartId;if(isCutaway||!(id==='thermostat'||id==='evaporator')){if(activity.current.working){setFullCycle(false);setCutaway(true);view(id==='evaporator'||id==='thermostat'?'front':'back');}setSelected(id);}}
    };
    renderer.domElement.addEventListener('pointerdown',pointerDown);
    renderer.domElement.addEventListener('pointerup',pointerUp);
    const resize=()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);invalidate();};
    const observer=new ResizeObserver(resize);observer.observe(el);resize();
    const projected=new THREE.Vector3();
    let frame=0;
    let disposed=false;
    // Render on demand: an idle refrigerator should consume no continuous GPU time.
    // OrbitControls change events keep the animation alive during drag and damping.
    const render=(time:number)=>{
      frame=0;
      if(disposed)return;
      controls.update();animateProcess(time);renderer.render(scene,camera);
      if(activity.current.working&&activity.current.playing)invalidate();
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
    };
    invalidate=()=>{if(!disposed&&!frame)frame=requestAnimationFrame(render);};
    controls.addEventListener('change',invalidate);
    invalidate();
    return ()=>{
      disposed=true;cancelAnimationFrame(frame);observer.disconnect();controls.removeEventListener('change',invalidate);controls.dispose();
      renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);
      const materials=new Set<THREE.Material>();
      scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
      for(const h of heatArrows){h.arrow.line.geometry.dispose();h.arrow.cone.geometry.dispose();h.arrow.line.material.dispose();h.arrow.cone.material.dispose();}
      materials.forEach(m=>m.dispose());enamelTexture.dispose();shadowTexture.dispose();reflection.dispose();renderer.dispose();renderer.domElement.remove();controller.current=null;
    };
  },[]);
  useEffect(()=>controller.current?.select(selected),[selected]);
  useEffect(()=>controller.current?.cutaway(cutaway),[cutaway]);
  useEffect(()=>controller.current?.invalidate(),[labels,expanded,selected]);
  const changeView=(v:View)=>controller.current?.view(v);
  return (
    <div ref={viewer} data-testid="fridge-viewer" data-expanded={expanded} style={expanded?{position:'fixed',inset:0,zIndex:9999,background:'#dedede',padding:'clamp(12px,2vw,28px)',overflow:'auto',width:'100%',height:'100%',alignItems:'start'}:undefined} className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]" data-working={working}>
      <div className="flex flex-wrap items-center gap-2 lg:col-span-2" aria-label="Режим лаборатории">
        <button type="button" aria-pressed={!working} onClick={()=>changeMode(false)} className={buttonStyle+(!working?' !bg-accent !text-white':'')}>Изучить модель</button>
        <button type="button" data-testid="fridge-working-mode" aria-pressed={working} onClick={()=>changeMode(true)} className={buttonStyle+(working?' !bg-accent !text-white':'')}>Как работает холодильник</button>
        {working&&<span className="text-xs text-fog">Учебная анимация · не реальные измерения</span>}
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-steel p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
          <button type="button" className={buttonStyle} onClick={()=>changeView('front')} disabled={!available}>Спереди</button>
          <button type="button" className={buttonStyle} onClick={()=>changeView('back')} disabled={!available}>Сзади</button>
          <button type="button" className={buttonStyle} onClick={()=>changeView('reset')} disabled={!available}>Сброс</button>
          <button type="button" className={buttonStyle} onClick={()=>setLabels(v=>!v)} aria-pressed={labels}>Подписи</button>
          <button type="button" className={buttonStyle+' inline-flex items-center gap-1.5'} onClick={toggleFullscreen} aria-pressed={expanded} aria-label={expanded?'Выйти из полноэкранного режима':'На весь экран'}>{expanded?<Minimize size={16}/>:<Maximize size={16}/>}<span>{expanded?'Свернуть':'На весь экран'}</span></button>
        </div>
        <div ref={host} data-testid="fridge-3d" style={{background:'radial-gradient(ellipse at 50% 42%, #dedede 0%, #bfc0c1 53%, #77797c 100%)',...(expanded?{height:working?'max(300px,calc(100dvh - 230px))':'max(360px,calc(100dvh - 200px))'}:{})}} className="relative isolate h-[480px] overflow-hidden rounded-xl border border-line sm:h-[560px]">
          {available && labels && <svg aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5] h-full w-full overflow-hidden">
            {PARTS.map(p=><g key={p.id}><line ref={node=>{lineRefs.current[p.id]=node;}} stroke={selected===p.id?'#3D75D8':'#656b72'} strokeWidth={selected===p.id?2:1.2}/><circle ref={node=>{dotRefs.current[p.id]=node;}} r="4" fill={selected===p.id?'#3D75D8':'#fff'} stroke="#3D75D8" strokeWidth="1.5"/></g>)}
          </svg>}
          {available && labels ? PARTS.map(p=><button key={p.id} type="button" ref={node=>{markerRefs.current[p.id]=node;}} onClick={()=>choosePart(p.id)} aria-label={p.label+' — точка модели'} aria-pressed={selected===p.id} title={p.label} style={{visibility:'hidden',maxWidth:'43%'}} className={'absolute z-10 rounded-lg border px-2 py-1.5 text-left text-[10px] font-extrabold leading-tight shadow-sm sm:text-xs '+(selected===p.id?'border-accent bg-accent text-white':'border-[#a9adb5] bg-white/95 text-[#22262b]')}>{p.label}</button>):!available?<div className="grid h-full place-items-center p-8 text-center text-sm text-fog">WebGL недоступен. Выберите узел в списке справа, чтобы прочитать объяснение.</div>:null}

        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button type="button" className={buttonStyle} onClick={()=>setCutaway(v=>!v)} aria-pressed={cutaway} disabled={!available}>{cutaway?'Корпус: прозрачный':'Корпус: закрытый'}</button>
          <p className="text-xs text-fog">Перетаскивайте · масштаб колесом или жестом</p>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-fog">Нажмите на деталь или подпись. Для внутренних узлов включите прозрачный корпус. Модель воссоздана по видеореференсу; расположение скрытых узлов условное.</p>
      </div>
      <div className="rounded-2xl border border-line bg-coal p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-fog">{working?'Действующая функция':'Выбранный узел'}</p>
        <div aria-live="polite">
          <h3 className="mt-1 font-display text-2xl font-bold text-paper">{part.label}</h3>
          <p className="mt-3 leading-relaxed text-silver" data-testid="fridge-process-description">{working?processes[selected].action:part.role}</p>
          {working?<div className="mt-4 space-y-2">
            <div className="rounded-xl border border-line bg-steel p-3"><p className="text-xs font-bold text-fog">На входе</p><p className="mt-1 text-sm font-bold text-paper">{processes[selected].input}</p></div>
            <div className="rounded-xl border border-line bg-steel p-3"><p className="text-xs font-bold text-fog">На выходе</p><p className="mt-1 text-sm font-bold text-paper">{processes[selected].output}</p></div>
            <p className="flex items-start gap-2 text-xs leading-relaxed text-fog"><span style={{background:processes[selected].color}} className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"/>{processes[selected].note}</p>
            {selected==='thermostat'&&<p data-testid="thermostat-state" className="rounded-xl border border-line bg-steel p-3 text-sm font-bold text-paper">{thermostatOn?'Охлаждение включено':'Охлаждение остановлено'}</p>}
          </div>:<ul className="mt-4 space-y-2">{part.facts.map(fact=><li key={fact} className="flex gap-3 rounded-lg border border-line bg-steel px-4 py-2.5 text-sm text-silver"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"/>{fact}</li>)}</ul>}
        </div>
        {working&&<div className="mt-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" data-testid="fridge-play" disabled={!available} onClick={()=>setPlaying(v=>!v)} className={buttonStyle+' !bg-accent !text-white'}>{playing?'Пауза':'Пуск'}</button>
            <button type="button" onClick={()=>stepProcess(-1)} className={buttonStyle}>← Назад</button>
            <button type="button" onClick={()=>stepProcess(1)} className={buttonStyle}>Далее →</button>
            <button type="button" data-testid="fridge-full-cycle" disabled={!available} aria-pressed={fullCycle} onClick={startFullCycle} className={buttonStyle+(fullCycle?' !bg-accent !text-white':'')}>Полный цикл</button>
          </div>
          <p className="text-xs text-fog">{fullCycle?'Полный цикл · автоматическая смена этапов': 'Этап '+(processOrder.indexOf(selected)+1)+' из '+processOrder.length}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-fog"><span className="h-2 w-2 rounded-full bg-[#f46d31]"/>Горячий пар <span className="h-2 w-2 rounded-full bg-[#eab24c]"/>Жидкость высокого давления <span className="h-2 w-2 rounded-full bg-[#389bff]"/>Низкое давление</div>
        </div>}
        <div className="mt-6 grid gap-2 sm:grid-cols-2">{(working?processOrder.map(id=>PARTS.find(p=>p.id===id)!):PARTS).map((p,i)=><button key={p.id} type="button" aria-pressed={selected===p.id} onClick={()=>choosePart(p.id)} className={'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-bold '+(selected===p.id?'border-accent bg-accent text-white':'border-line bg-steel text-paper hover:border-accent')}><span className="opacity-80">{i+1}.</span>{p.label}</button>)}</div>
        <p className="mt-5 text-xs leading-relaxed text-fog">Модель предназначена для изучения функций узлов. Не является инструкцией по разборке или обслуживанию реального оборудования.</p>
        <a href="https://www.danfoss.com/en/about-danfoss/our-businesses/cooling/the-fridge-how-it-works" target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-bold text-accent underline">Принцип работы: Danfoss</a>
      </div>
    </div>
  );
}
