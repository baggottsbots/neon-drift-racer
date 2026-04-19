{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"}}

import * as THREE from 'three';
const state={running:false,speed:0,maxSpeed:140,boostMax:200,accel:55,brake:85,friction:18,steer:0,steerTarget:0,heading:0,pos:new THREE.Vector3(0,0.9,0),trackLen:0,lap:1,totalLaps:3,lapStart:0,raceStart:0,bestLap:Infinity,topSpeed:0,boostFuel:1,boosting:false,crossedHalf:false};
const keys={};
const touch={left:false,right:false,gas:false,brake:false};
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x05060a);
scene.fog=new THREE.FogExp2(0x05060a,0.012);
const camera=new THREE.PerspectiveCamera(78,window.innerWidth/window.innerHeight,0.1,2000);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.1;
document.getElementById('game').appendChild(renderer.domElement);
scene.add(new THREE.AmbientLight(0x222244,0.5));
const moon=new THREE.DirectionalLight(0x8899ff,0.6);
moon.position.set(-50,80,-30);
scene.add(moon);
const TRACK_POINTS=[];
const R=300,variance=0.35,segments=42;
let seed=13;
function rand(){seed=(seed*9301+49297)%233280;return seed/233280}
for(let i=0;i<segments;i++){
  const a=(i/segments)*Math.PI*2;
  const r=R*(1+(rand()-0.5)*variance*1.2);
  const bend=Math.sin(a*2.3)*40+Math.cos(a*1.7)*30;
  TRACK_POINTS.push(new THREE.Vector3(Math.cos(a)*r+bend,0,Math.sin(a)*r-bend*0.5));
}
const trackCurve=new THREE.CatmullRomCurve3(TRACK_POINTS,true,'catmullrom',0.5);
state.trackLen=trackCurve.getLength();
const ground=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),new THREE.MeshBasicMaterial({color:0x06080d}));
ground.rotation.x=-Math.PI/2;ground.position.y=-0.01;
scene.add(ground);
const gridHelper=new THREE.GridHelper(3000,150,0x14342e,0x0a1a17);
scene.add(gridHelper);
const ROAD_WIDTH=14,roadSamples=800;
const roadGeo=new THREE.BufferGeometry();
const rv=[],ru=[],ri=[];
for(let i=0;i<=roadSamples;i++){
  const t=i/roadSamples;
  const p=trackCurve.getPointAt(t);
  const tan=trackCurve.getTangentAt(t).normalize();
  const side=new THREE.Vector3(-tan.z,0,tan.x).normalize();
  const L=p.clone().add(side.clone().multiplyScalar(-ROAD_WIDTH/2));
  const R2=p.clone().add(side.clone().multiplyScalar(ROAD_WIDTH/2));
  rv.push(L.x,0.02,L.z,R2.x,0.02,R2.z);
  ru.push(0,t*roadSamples*0.5,1,t*roadSamples*0.5);
  if(i<roadSamples){const b=i*2;ri.push(b,b+1,b+2,b+1,b+3,b+2)}
}
roadGeo.setAttribute('position',new THREE.Float32BufferAttribute(rv,3));
roadGeo.setAttribute('uv',new THREE.Float32BufferAttribute(ru,2));
roadGeo.setIndex(ri);
roadGeo.computeVertexNormals();
const rc=document.createElement('canvas');rc.width=64;rc.height=128;
const rctx=rc.getContext('2d');
rctx.fillStyle='#0b0d14';rctx.fillRect(0,0,64,128);
rctx.fillStyle='#36D6B5';rctx.fillRect(2,0,2,128);rctx.fillRect(60,0,2,128);
rctx.fillStyle='#ffb020';rctx.fillRect(31,20,2,30);rctx.fillRect(31,78,2,30);
const roadTex=new THREE.CanvasTexture(rc);
roadTex.wrapS=roadTex.wrapT=THREE.RepeatWrapping;
roadTex.magFilter=THREE.NearestFilter;
scene.add(new THREE.Mesh(roadGeo,new THREE.MeshBasicMaterial({map:roadTex})));
function buildRail(off,col){
  const pts=[];
  for(let i=0;i<=roadSamples;i++){
    const t=i/roadSamples;
    const p=trackCurve.getPointAt(t);
    const tan=trackCurve.getTangentAt(t).normalize();
    const side=new THREE.Vector3(-tan.z,0,tan.x).normalize();
    pts.push(p.clone().add(side.multiplyScalar(off)).setY(0.3));
  }
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:col}));
}
scene.add(buildRail(-ROAD_WIDTH/2-0.2,0x36D6B5));
scene.add(buildRail(ROAD_WIDTH/2+0.2,0xff2e88));
for(let i=0;i<roadSamples;i+=6){
  const t=i/roadSamples;
  const p=trackCurve.getPointAt(t);
  const tan=trackCurve.getTangentAt(t).normalize();
  const side=new THREE.Vector3(-tan.z,0,tan.x).normalize();
  for(const s of [-1,1]){
    const pos=p.clone().add(side.clone().multiplyScalar(s*(ROAD_WIDTH/2+4)));
    const h=2+Math.random()*1.5;
    const pyl=new THREE.Mesh(new THREE.BoxGeometry(0.2,h,0.2),new THREE.MeshBasicMaterial({color:s>0?0xff2e88:0x36D6B5}));
    pyl.position.set(pos.x,h/2,pos.z);
    scene.add(pyl);
  }
}
for(let i=0;i<120;i++){
  const a=Math.random()*Math.PI*2;
  const dist=500+Math.random()*800;
  const w=15+Math.random()*40,h=30+Math.random()*180,d=15+Math.random()*40;
  const bldg=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({color:new THREE.Color().setHSL(0.5+Math.random()*0.2,0.3,0.04)}));
  bldg.position.set(Math.cos(a)*dist,h/2,Math.sin(a)*dist);
  scene.add(bldg);
  const wc=Math.random()>0.5?0xff2e88:0x36D6B5;
  const ws=new THREE.Mesh(new THREE.BoxGeometry(w*0.8,0.8,d*0.8),new THREE.MeshBasicMaterial({color:wc,transparent:true,opacity:0.6}));
  ws.position.set(bldg.position.x,h*0.6+Math.random()*h*0.3,bldg.position.z);
  scene.add(ws);
}
const sg=new THREE.BufferGeometry();
const sv=[];
for(let i=0;i<1500;i++){sv.push((Math.random()-0.5)*2000,200+Math.random()*400,(Math.random()-0.5)*2000)}
sg.setAttribute('position',new THREE.Float32BufferAttribute(sv,3));
scene.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0xaaccff,size:1.5,sizeAttenuation:false})));
const sun=new THREE.Mesh(new THREE.CircleGeometry(120,64),new THREE.MeshBasicMaterial({transparent:true,opacity:0.7,color:0xff2e88}));
sun.position.set(0,80,-900);
scene.add(sun);
const dashScene=new THREE.Scene();
const dashCam=new THREE.OrthographicCamera(-1,1,1,-1,0,10);
const dc=document.createElement('canvas');dc.width=1024;dc.height=256;
function drawDash(s){
  const ctx=dc.getContext('2d');
  ctx.clearRect(0,0,1024,256);
  const g=ctx.createLinearGradient(0,0,0,256);
  g.addColorStop(0,'rgba(8,10,18,0)');g.addColorStop(0.3,'rgba(8,10,18,0.65)');g.addColorStop(1,'rgba(12,18,28,0.95)');
  ctx.fillStyle=g;ctx.beginPath();
  ctx.moveTo(0,256);ctx.lineTo(0,140);
  ctx.bezierCurveTo(200,70,400,50,512,50);
  ctx.bezierCurveTo(624,50,824,70,1024,140);
  ctx.lineTo(1024,256);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(54,214,181,0.55)';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(0,140);
  ctx.bezierCurveTo(200,70,400,50,512,50);
  ctx.bezierCurveTo(624,50,824,70,1024,140);ctx.stroke();
  ctx.save();ctx.translate(512,220);ctx.rotate(s*0.5);
  ctx.strokeStyle='rgba(54,214,181,0.9)';ctx.lineWidth=5;
  ctx.beginPath();ctx.arc(0,0,85,Math.PI*1.15,Math.PI*1.85);ctx.stroke();
  ctx.lineWidth=3;ctx.beginPath();
  ctx.moveTo(-79,15);ctx.lineTo(-15,5);
  ctx.moveTo(79,15);ctx.lineTo(15,5);
  ctx.moveTo(0,85);ctx.lineTo(0,20);ctx.stroke();
  ctx.fillStyle='#0a1018';ctx.beginPath();ctx.arc(0,0,18,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#36D6B5';ctx.lineWidth=1.5;ctx.stroke();
  ctx.restore();
  for(let i=0;i<8;i++){
    ctx.fillStyle=i<3?'#36D6B5':(i<6?'#ffb020':'#ff2e88');
    ctx.globalAlpha=0.3+(i/8)*0.5;
    ctx.fillRect(40+i*18,180-i*5,12,30+i*5);
    ctx.fillRect(1024-52-i*18,180-i*5,12,30+i*5);
  }
  ctx.globalAlpha=1;
}
drawDash(0);
const dashTex=new THREE.CanvasTexture(dc);
const dashPlane=new THREE.Mesh(new THREE.PlaneGeometry(2,0.5),new THREE.MeshBasicMaterial({map:dashTex,transparent:true}));
dashPlane.position.set(0,-0.75,0);
dashScene.add(dashPlane);
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key===' ')e.preventDefault()});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});
function bt(id,p){
  const el=document.getElementById(id);
  const on=e=>{e.preventDefault();touch[p]=true};
  const off=e=>{e.preventDefault();touch[p]=false};
  el.addEventListener('touchstart',on,{passive:false});
  el.addEventListener('touchend',off,{passive:false});
  el.addEventListener('touchcancel',off,{passive:false});
  el.addEventListener('mousedown',on);el.addEventListener('mouseup',off);el.addEventListener('mouseleave',off);
}
bt('tLeft','left');bt('tRight','right');bt('tGas','gas');bt('tBrake','brake');
if('ontouchstart' in window||navigator.maxTouchPoints>0){document.getElementById('touch').classList.add('active')}
let lastT=performance.now();
let trackPosition=0;
function resetCar(){
  trackPosition=0;
  state.pos.copy(trackCurve.getPointAt(0)).setY(0.9);
  const tan=trackCurve.getTangentAt(0);
  state.heading=Math.atan2(tan.x,tan.z);
  state.speed=0;state.steer=0;state.steerTarget=0;state.boostFuel=1;state.crossedHalf=false;
}
resetCar();
function fmt(ms){
  if(!isFinite(ms))return '—:—.—';
  const m=Math.floor(ms/60000),s=Math.floor((ms%60000)/1000),mm=Math.floor(ms%1000);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(mm).padStart(3,'0')}`;
}
function flash(text,col,dur=900){
  const f=document.getElementById('flash');
  f.textContent=text;
  f.style.color=col||'#ffb020';
  f.style.textShadow=`0 0 30px ${col||'#ffb020'}`;
  f.classList.remove('show');void f.offsetWidth;f.classList.add('show');
  setTimeout(()=>f.classList.remove('show'),dur);
}
async function startCountdown(){
  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('endScreen').classList.add('hidden');
  resetCar();
  state.lap=1;state.topSpeed=0;
  document.getElementById('lap').textContent=`1 / ${state.totalLaps}`;
  for(const n of ['3','2','1']){flash(n,'#36D6B5',800);await new Promise(r=>setTimeout(r,800))}
  flash('GO','#ffb020',700);
  state.running=true;
  state.raceStart=performance.now();
  state.lapStart=state.raceStart;
}
document.getElementById('startBtn').addEventListener('click',startCountdown);
document.getElementById('restartBtn').addEventListener('click',startCountdown);
function endRace(ms){
  state.running=false;
  document.getElementById('finalTime').textContent=fmt(ms);
  document.getElementById('finalBest').textContent=fmt(state.bestLap);
  document.getElementById('finalTop').textContent=Math.round(state.topSpeed*2)+' KM/H';
  const v=state.bestLap<25000?'LEGEND':state.bestLap<32000?'PRO DRIVER':state.bestLap<42000?'SOLID RUN':'FINISHED';
  document.getElementById('finalVerdict').textContent=v;
  document.getElementById('endScreen').classList.remove('hidden');
}
function update(dt){
  const left=keys['a']||keys['arrowleft']||touch.left;
  const right=keys['d']||keys['arrowright']||touch.right;
  const gas=keys['w']||keys['arrowup']||touch.gas;
  const brake=keys['s']||keys['arrowdown']||touch.brake;
  const bk=keys['shift'];
  if(keys['r']){resetCar();keys['r']=false}
  state.steerTarget=(left?-1:0)+(right?1:0);
  state.steer+=(state.steerTarget-state.steer)*Math.min(1,dt*7);
  state.boosting=false;
  if(bk&&state.boostFuel>0.02&&state.speed>30){state.boosting=true;state.boostFuel=Math.max(0,state.boostFuel-dt*0.35)}
  else{state.boostFuel=Math.min(1,state.boostFuel+dt*0.15)}
  const top=state.boosting?state.boostMax:state.maxSpeed;
  if(state.running){
    if(gas){state.speed+=(state.boosting?state.accel*1.8:state.accel)*dt}
    if(brake){state.speed-=state.brake*dt}
    if(!gas&&!brake){state.speed-=state.friction*dt*Math.sign(state.speed);if(Math.abs(state.speed)<1)state.speed=0}
  }else{state.speed*=(1-Math.min(1,dt*2))}
  state.speed=Math.max(0,Math.min(top,state.speed));
  trackPosition=(trackPosition+state.speed*dt)%state.trackLen;
  const lateral=state.steer*ROAD_WIDTH*0.38;
  const np=trackCurve.getPointAt(trackPosition/state.trackLen);
  const nt=trackCurve.getTangentAt(trackPosition/state.trackLen).normalize();
  const ns=new THREE.Vector3(-nt.z,0,nt.x).normalize();
  state.pos.copy(np).add(ns.multiplyScalar(lateral)).setY(0.9);
  if(Math.abs(lateral)>ROAD_WIDTH*0.42)state.speed*=(1-dt*1.5);
  if(state.running&&state.speed>state.topSpeed)state.topSpeed=state.speed;
  if(state.running){
    const np2=trackPosition/state.trackLen;
    if(!state.crossedHalf&&np2>0.45&&np2<0.55)state.crossedHalf=true;
    if(state.crossedHalf&&np2<0.05){
      const now=performance.now();
      const lapTime=now-state.lapStart;
      state.lapStart=now;state.crossedHalf=false;
      if(lapTime<state.bestLap){state.bestLap=lapTime;document.getElementById('best').textContent=fmt(lapTime);flash('BEST LAP','#36D6B5',900)}
      else{flash(`LAP ${state.lap}`,'#ffb020',900)}
      state.lap++;
      if(state.lap>state.totalLaps){endRace(now-state.raceStart);return}
      document.getElementById('lap').textContent=`${Math.min(state.lap,state.totalLaps)} / ${state.totalLaps}`;
    }
  }
  camera.position.set(state.pos.x,1.2,state.pos.z);
  const lt=trackCurve.getTangentAt(((trackPosition+15)%state.trackLen)/state.trackLen);
  const lp=trackCurve.getPointAt(((trackPosition+15)%state.trackLen)/state.trackLen);
  const ls=new THREE.Vector3(-lt.z,0,lt.x);
  lp.add(ls.multiplyScalar(lateral*0.5));lp.y=0.96;
  const shake=Math.min(0.02,state.speed*0.0001)*(state.boosting?3:1);
  camera.position.x+=(Math.random()-0.5)*shake;
  camera.position.y+=(Math.random()-0.5)*shake;
  camera.lookAt(lp);
  camera.rotation.z=-state.steer*0.04;
  drawDash(state.steer);
  dashTex.needsUpdate=true;
  const kmh=Math.round(state.speed*2);
  document.getElementById('speed').textContent=String(kmh).padStart(3,'0');
  document.getElementById('rpm').style.width=Math.min(100,(state.speed/state.maxSpeed)*100)+'%';
  document.getElementById('gear').textContent=state.speed<40?1:state.speed<80?2:state.speed<120?3:state.speed<160?4:5;
  document.getElementById('boost').textContent=state.boosting?'ACTIVE':(state.boostFuel>0.9?'READY':`${Math.round(state.boostFuel*100)}%`);
  if(state.running)document.getElementById('timer').textContent=fmt(performance.now()-state.raceStart);
  scene.fog.density=0.012-(state.boosting?0.003:0);
  sun.material.color.setHex(state.boosting?0x36D6B5:0xff2e88);
}
function animate(){
  const now=performance.now();
  const dt=Math.min(0.05,(now-lastT)/1000);
  lastT=now;
  update(dt);
  renderer.autoClear=true;
  renderer.render(scene,camera);
  renderer.autoClear=false;
  renderer.clearDepth();
  renderer.render(dashScene,dashCam);
  requestAnimationFrame(animate);
}
animate();
addEventListener('resize',()=>{
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
});
addEventListener('contextmenu',e=>{if(e.target.classList&&e.target.classList.contains('tbtn'))e.preventDefault()});