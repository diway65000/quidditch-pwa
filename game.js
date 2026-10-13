'use strict';
const cv=document.getElementById('c'),g=cv.getContext('2d'),W=1280,H=720;
const A={},keys={};
const FILES={fond:'stade.jpg',vif:'vif_or.png',harry:'harry.png',drago:'drago.png',hermione:'hermione.png',elise:'elise.png',foret:'foret.jpg',tribune:'tribune.jpg'};
const VS=130/90;
const CH=[
 {id:'harry',nom:'Harry',vit:8,h:90,cap:'Turbo',desc:'Vitesse x1.6 (2 s)',nat:1},
 {id:'hermione',nom:'Hermione',vit:7,h:90,cap:'Bouclier',desc:'Immunité cognards (3 s)',nat:1},
 {id:'elise',nom:'Elise',vit:9,h:90,cap:'Petrificus',desc:'Fige rival + cognards (2 s)',nat:1}];
const DIF=[{n:'Facile',v:4.5,err:150,bl:2,sn:.8},{n:'Normal',v:5.6,err:90,bl:2,sn:1},{n:'Difficile',v:6.8,err:45,bl:3,sn:1.2}];
const MENUS=['menu','qmenu','smenu','rmenu','board','lobby'];
let diff=1,state='menu',G=null,last=0,muted=false,musicOn=false,touch=null,music,S={};
const rand=(a,b)=>a+Math.random()*(b-a),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const hit=(r,p)=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;
const cardR=i=>({x:(W-3*220-60)/2+i*250,y:200,w:220,h:290});
const difR=i=>({x:W/2-255+i*175,y:540,w:160,h:50});
const COARSE=matchMedia('(pointer:coarse)').matches,Z=COARSE?72:50;
const pauseR={x:W/2+120,y:14,w:Z,h:Z},muteR={x:W/2+130+Z,y:14,w:Z,h:Z},abP={x:W-110,y:H-110,r:55};
const crR={x:W/2-150,y:280,w:300,h:60},joR={x:W/2-150,y:370,w:300,h:60},backR={x:W/2-100,y:640,w:200,h:50},onR={x:W/2-390,y:625,w:380,h:50},qbackR={x:W/2+10,y:625,w:380,h:50},m0R={x:W/2-300,y:100,w:290,h:56},m1R={x:W/2+10,y:100,w:290,h:56};
const GOAL=600,GOAL2=600,BOSS_T=16;let rmode=0,btab=0;
const nameR={x:W/2-320,y:575,w:300,h:56},boardR={x:W/2+20,y:575,w:300,h:56},homeR=i=>({x:100+i*370,y:205,w:340,h:340}),tabR=i=>({x:W/2-345+i*235,y:100,w:220,h:50});
let pname='';try{pname=localStorage.getItem('quid_name')||''}catch(e){}
function askName(){const n=(prompt('Ton nom de joueur :',pname)||'').trim().slice(0,12);if(n){pname=n;try{localStorage.setItem('quid_name',n)}catch(e){}}}
function needName(){if(net.role==='guest')return;if(!pname)askName();if(!pname)pname='Joueur'}
const swapR={x:W/2-150,y:645,w:300,h:44};

// Configuration par défaut : Joystick à gauche, boutons à droite
let swap=false;try{const s=localStorage.getItem('quid_swap');if(s!==null)swap=(s==='1')}catch(e){}
function setSwap(v){
  swap=v;
  document.body.classList.toggle('swap',v);
  try{localStorage.setItem('quid_swap',v?'1':'0')}catch(e){}
}
setSwap(swap);

// Gestion des paliers de vitesse (0 = standard, 1, 2, 3)
let speedLevel=0;
const SPEED_MULTS=[1.0, 1.25, 1.5, 1.75];
function setSpeedLevel(lvl){
  speedLevel=Math.max(0,Math.min(3,lvl));
  const disp=document.getElementById('spd-lvl');
  if(disp)disp.textContent=`+${speedLevel}`;
}

const net={role:null,conn:null,peer:null,code:'',msg:'',ready:false,inp:{ax:0,ay:0},acc:0};

/* ---------- audio (Web Audio API + assets) ---------- */
let actx=null;
function getAudioCtx(){
  if(!actx)actx=new(window.AudioContext||window.webkitAudioContext)();
  if(actx.state==='suspended')actx.resume();
  return actx;
}
function playTone(freq,start,dur,type='square',gainVal=0.22){
  const c=getAudioCtx(),osc=c.createOscillator(),gain=c.createGain(),t=c.currentTime+start;
  osc.type=type;osc.frequency.setValueAtTime(freq,t);
  gain.gain.setValueAtTime(gainVal,t);
  gain.gain.exponentialRampToValueAtTime(0.001,t+dur);
  osc.connect(gain);gain.connect(c.destination);
  osc.start(t);osc.stop(t+dur+0.02);
}
function sfxWinLong(){
  if(muted)return;
  const seq=[
    {f:392.00,d:0.12,t:0.00},{f:523.25,d:0.12,t:0.13},{f:659.25,d:0.12,t:0.26},{f:783.99,d:0.14,t:0.39},
    {f:659.25,d:0.12,t:0.54},{f:783.99,d:0.35,t:0.68},
    {f:698.46,d:0.12,t:1.10},{f:880.00,d:0.12,t:1.23},{f:1046.50,d:0.14,t:1.36},
    {f:880.00,d:0.12,t:1.52},{f:1046.50,d:0.35,t:1.66},
    {f:987.77,d:0.14,t:2.10},{f:1174.66,d:0.18,t:2.26},{f:1318.51,d:0.18,t:2.46},
    {f:1046.50,d:0.75,t:2.66}
  ];
  seq.forEach(n=>{
    playTone(n.f,n.t,n.d,'square',0.22);
    playTone(n.f/2,n.t,n.d,'triangle',0.28);
  });
}
function sfxLoseLong(){
  if(muted)return;
  const seq=[
    {f:523.25,d:0.16,t:0.00},{f:392.00,d:0.16,t:0.20},{f:329.63,d:0.18,t:0.40},
    {f:440.00,d:0.18,t:0.65},{f:493.88,d:0.18,t:0.88},{f:440.00,d:0.20,t:1.10},
    {f:415.30,d:0.24,t:1.35},{f:466.16,d:0.24,t:1.64},{f:415.30,d:0.26,t:1.92},
    {f:369.99,d:0.32,t:2.24},{f:329.63,d:0.36,t:2.60},{f:261.63,d:0.75,t:3.00}
  ];
  seq.forEach(n=>playTone(n.f,n.t,n.d,'sawtooth',0.24));
}

/* ---------- chargement ---------- */
const loadImg=u=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(i);i.src='assets/'+u});
async function aud(u){const b=await(await fetch('assets/'+u)).blob();return new Audio(URL.createObjectURL(b))}
async function boot(){
  g.fillStyle='#0a0a14';g.fillRect(0,0,W,H);txt('Chargement…',W/2,H/2,44,'#ffd700');
  await Promise.all(Object.keys(FILES).map(async k=>{A[k]=await loadImg(FILES[k])}));
  setupControlsUI();
  requestAnimationFrame(loop);
  aud('musique_magie.mp3').then(a=>{
    music=a;music.loop=true;music.volume=.4;music.muted=muted;
    if(wantMusic)startMusic();
  }).catch(()=>{});
  aud('attrape.mp3').then(a=>S.attrape=a).catch(()=>{});
  aud('collision.wav').then(a=>S.collision=a).catch(()=>{});
}
const sfx=n=>{if(muted||!S[n])return;const a=S[n].cloneNode();a.volume=.8;a.play().catch(()=>{})};
function setMute(m){
  muted=m;
  if(music)music.muted=m;
}
let wantMusic=true;
function startMusic(){
  wantMusic=true;
  if(!musicOn&&music){
    music.play().then(()=>{musicOn=true}).catch(()=>{});
  }
}

/* ---------- scores ---------- */
const hist=()=>{try{return JSON.parse(localStorage.getItem('quid_hist'))||[]}catch(e){return[]}};
function saveScore(e){try{const h=hist();h.push(e);localStorage.setItem('quid_hist',JSON.stringify(h.slice(-200)))}catch(e){}}
const best=()=>hist().reduce((m,e)=>Math.max(m,e.p),0);

/* ---------- partie match ---------- */
function newGame(ch){
  needName();startMusic();const d=DIF[diff];
  G={ch,d,t:60,cnt:3.99,el:0,cc:0,parts:[],trail:[],endT:0,win:null,
   p:{x:150,y:360,h:ch.h,face:1,stun:0,inv:0,boost:0,shield:0,dash:0,cd:0,score:0,stamina:100,accel:1},
   r:{x:1130,y:360,h:90,face:-1,stun:0,inv:0,score:0,tx:640,ty:360,nt:0},
   s:{x:640,y:360,ang:rand(0,6.28),fade:0},
   bl:Array.from({length:d.bl},(_,i)=>{const a=rand(0,6.28);return{x:rand(300,980),y:i%2?150:570,vx:Math.cos(a)*5,vy:Math.sin(a)*5}})};
  G.ev=[];G.me='p';G.frz=0;state='count';
}
function ability(){
  if(state!=='play')return;
  if(net.role==='guest'){net.conn&&net.conn.send({t:'ab'});return}
  useAb(G.p,G.ch.id);
}
function useAb(o,id){
  if(o.cd>0)return;o.cd=6;
  if(id==='harry')o.boost=2;
  else if(id==='hermione')o.shield=3;
  else if(id==='elise'){
    if(G.mode==='spider'){
      for(const q of G.obs)if(q.t!=='l'&&q.x<W+20)burst(q.x,q.t==='p'?H/2:q.y);
      G.obs=G.obs.filter(q=>q.t==='l'||q.x>=W+20);
    }else G.frz=2;
    o.cd=10;
  }else o.dash=.25;
}
function pop(x,y,t,col){if(!G.pops)G.pops=[];G.pops.push({x,y,t:1,txt:t,col})}
function popTick(dt){if(G.pops){for(const q of G.pops)q.t-=dt*.8;G.pops=G.pops.filter(q=>q.t>0)}}
function drawPops(){if(G.pops)for(const q of G.pops){g.globalAlpha=Math.min(1,q.t*1.5);txt(q.txt,q.x,q.y-(1-q.t)*60,34,q.col)}g.globalAlpha=1}
function burst(x,y,col='#ffe96a'){
  for(let i=0;i<26;i++){
    const a=rand(0,6.28),v=rand(2,11);
    G.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:rand(.5,1.1),col});
  }
}
function respawn(){
  const s=G.s;s.x=Math.random()<.5?60:W-60;s.y=rand(80,H-80);
  s.ang=Math.atan2(H/2-s.y,W/2-s.x);s.fade=.9;G.trail=[];
}
function endGame(){
  const {p,r,ch,d}=G;
  saveScore({j:pname,n:ch.nom,dn:d.n,p:p.score,r:r.score});
  const isW=G.me==='r'?r.score>p.score:p.score>r.score;
  G.win=isW?'p':(p.score===r.score?'tie':'r');
  G.endT=0;state='ending';
  if(isW)sfxWinLong();else if(p.score!==r.score)sfxLoseLong();
  if(net.role==='host')sendSnap();
}

/* ---------- gestion dynamique de l'accélération / stamina ---------- */
function tickSpeed(p,ax,ay,dt){
  const pushing=joy.on?(joy.len>.7):(Math.hypot(ax,ay)>.5);
  if(pushing&&p.stamina>0){
    p.stamina=Math.max(0,p.stamina-dt*30);
    p.accel=Math.min(1.35,(p.accel||1)+dt*1.2);
  }else{
    p.stamina=Math.min(100,p.stamina+dt*22);
    p.accel=Math.max(0.85,(p.accel||1)-dt*1.6);
  }
}
function drawStamina(p){
  if(!p||p.stamina===undefined)return;
  const w=70,h=7,x=p.x,y=p.y-p.h*.7;
  g.save();
  g.fillStyle='rgba(10,10,20,.65)';g.beginPath();g.roundRect(x-w/2,y,w,h,3);g.fill();
  g.strokeStyle='rgba(255,215,0,.7)';g.lineWidth=1.5;g.stroke();
  const pct=Math.max(0,p.stamina/100);
  g.fillStyle=pct>.25?'#ffd700':'#ff4040';
  g.beginPath();g.roundRect(x-w/2+1,y+1,(w-2)*pct,h-2,2);g.fill();
  g.restore();
}

function update(dt){
  const k=dt*60,{p,r,s,d}=G;
  if(state==='count'){G.cnt-=dt;if(G.cnt<=0){state='play'}return}
  if(G.mode==='race')return updateRace(dt);
  if(G.mode==='spider')return updateSpider(dt);

  if(state==='ending'){
    G.endT+=dt;
    for(const q of G.parts){q.x+=q.vx*k;q.y+=q.vy*k;q.l-=dt}
    G.parts=G.parts.filter(q=>q.l>0);
    popTick(dt);
    if(G.endT>=3.5)state='match_res';
    return;
  }

  G.t-=dt;G.el+=dt;G.cc-=dt;if(G.frz>0)G.frz-=dt;const fz=G.frz>0;
  if(G.t<=0){G.t=0;endGame();return}
  for(const o of[p,r])for(const f of['stun','inv','boost','shield','dash','cd'])if(o[f]>0)o[f]-=dt;

  const [ax,ay]=readInput(p);
  tickSpeed(p,ax,ay,dt);
  const sp=G.ch.vit*(p.accel||1)*(p.stun>0?.3:1)*(p.boost>0?1.6:1)*(p.dash>0?3:1);
  p.x=Math.min(W-40,Math.max(40,p.x+ax*sp*k));p.y=Math.min(H-40,Math.max(40,p.y+ay*sp*k));
  if(ax)p.face=ax>0?1:-1;

  if(fz){}else if(net.role==='host'){const i=net.inp,v=6.5*(r.stun>0?.3:1)*(r.dash>0?3:1);
    r.x=Math.min(W-40,Math.max(40,r.x+i.ax*v*k));r.y=Math.min(H-40,Math.max(40,r.y+i.ay*v*k));if(i.ax)r.face=i.ax>0?1:-1}else{
  r.nt-=dt;if(r.nt<=0){r.nt=.3;r.tx=s.x+Math.cos(s.ang)*45+rand(-d.err,d.err)*.9;r.ty=s.y+Math.sin(s.ang)*45+rand(-d.err,d.err)*.9}
  {const dx=r.tx-r.x,dy=r.ty-r.y,l=Math.hypot(dx,dy)||1,v=d.v*(r.stun>0?.3:1)*Math.min(1,l/20);
   r.x+=dx/l*v*k;r.y+=dy/l*v*k;if(Math.abs(dx)>4)r.face=dx>0?1:-1}}
  const dd=dist(p,r),min=(p.h+r.h)*.35;
  if(dd<min){const nx=(p.x-r.x)/(dd||1),ny=(p.y-r.y)/(dd||1);
    p.x+=nx*6*k;p.y+=ny*6*k;r.x-=nx*6*k;r.y-=ny*6*k;
    if(G.cc<=0){fx('c');G.cc=.5}}

  s.ang+=(Math.random()-.5)*.25*k;
  if(Math.random()<.012*k)s.ang+=(Math.random()<.5?-1:1)*1.2;
  for(const o of[p,r]){const dx=s.x-o.x,dy=s.y-o.y;
    if(Math.hypot(dx,dy)<230){let df=Math.atan2(dy,dx)-s.ang;df=Math.atan2(Math.sin(df),Math.cos(df));s.ang+=df*.12*k}}
  const ss=(5+G.el*.04)*d.sn*(s.fade>0?.5:1);
  s.x+=Math.cos(s.ang)*ss*k;s.y+=Math.sin(s.ang)*ss*k;
  if(s.fade>0)s.fade-=dt;
  if(s.x<40){s.x=40;s.ang=Math.PI-s.ang}if(s.x>W-40){s.x=W-40;s.ang=Math.PI-s.ang}
  if(s.y<40){s.y=40;s.ang=-s.ang}if(s.y>H-40){s.y=H-40;s.ang=-s.ang}
  G.trail.push({x:s.x,y:s.y});if(G.trail.length>14)G.trail.shift();
  if(s.fade<=0)for(const o of[p,r]){
    const rad=o.h*.4+10+(o===p&&G.ch.id==='harry'?15:0);
    if(dist(o,s)<rad){o.score+=10;fx('a',s.x,s.y);respawn();break}}

  for(const b of G.bl){
    b.x+=b.vx*k*(fz?0:1);b.y+=b.vy*k*(fz?0:1);
    if(b.x<20||b.x>W-20)b.vx*=-1;if(b.y<20||b.y>H-20)b.vy*=-1;
    b.x=Math.min(W-20,Math.max(20,b.x));b.y=Math.min(H-20,Math.max(20,b.y));
    for(const o of[p,r]){
      if(!fz&&dist(o,b)<o.h*.35+18){
        const a=Math.atan2(b.y-o.y,b.x-o.x),v=Math.hypot(b.vx,b.vy);b.vx=Math.cos(a)*v;b.vy=Math.sin(a)*v;
        if(o.inv<=0&&!(o===p&&p.shield>0)){o.stun=1.5;o.inv=2.5;o.score-=5;pop(o.x,o.y-60,'-5','#ff5050');fx('c')}
      }}}
  for(const q of G.parts){q.x+=q.vx*k;q.y+=q.vy*k;q.l-=dt}
  G.parts=G.parts.filter(q=>q.l>0);popTick(dt);
}

/* ---------- réseau (PeerJS / WebRTC) ---------- */
function readInput(o){
  let ax=(keys.arrowright||keys.d?1:0)-(keys.arrowleft||keys.q||keys.a?1:0),ay=(keys.arrowdown||keys.s?1:0)-(keys.arrowup||keys.z||keys.w?1:0);
  if(joy.on){ax=joy.x;ay=joy.y}else if(touch){const dx=touch.x-o.x,dy=touch.y-o.y,l=Math.hypot(dx,dy);if(l>14){ax=dx/l;ay=dy/l}}
  const l=Math.hypot(ax,ay);if(l>1){ax/=l;ay/=l}return[ax,ay];
}
function fx(n,x,y){if(n==='a'){sfx('attrape');burst(x,y)}else sfx('collision');if(net.role==='host')G.ev.push([n,x,y])}
function leave(){const p=net.peer;net.role=null;net.conn=null;net.peer=null;net.ready=false;net.msg='';try{p&&p.destroy()}catch(e){}}
function fail(m){if(!net.role)return;leave();net.msg=m;state='qmenu'}
function hostGame(){
  try{leave();net.role='host';net.msg='';
  net.code=Array.from({length:4},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random()*24|0]).join('');
  net.peer=new Peer('qcpwa-'+net.code);
  net.peer.on('error',e=>e.type==='unavailable-id'?hostGame():fail('Erreur réseau'));
  net.peer.on('connection',c=>{if(net.conn){c.close();return}net.conn=c;c.on('open',()=>net.ready=true);c.on('data',onData);c.on('close',()=>fail('Connexion perdue'))});
  }catch(e){fail('Réseau indisponible')}
}
function joinGame(){
  const c=(prompt('Code de la partie (4 lettres) :')||'').trim().toUpperCase();if(c.length!==4)return;
  try{leave();net.role='guest';net.msg='Connexion…';net.peer=new Peer();
  net.peer.on('open',()=>{const cn=net.peer.connect('qcpwa-'+c,{reliable:true});net.conn=cn;
    cn.on('open',()=>net.msg='Connecté ! L\'hôte choisit son personnage…');cn.on('data',