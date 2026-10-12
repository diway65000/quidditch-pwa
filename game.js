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
let swap=false;try{swap=localStorage.getItem('quid_swap')==='1'}catch(e){}
function setSwap(v){swap=v;document.body.classList.toggle('swap',v);try{localStorage.setItem('quid_swap',v?'1':'0')}catch(e){}}
const net={role:null,conn:null,peer:null,code:'',msg:'',ready:false,inp:{ax:0,ay:0},acc:0};

/* ---------- synthétiseur audio (jingles rétro Mario ~3 s) ---------- */
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
    {f:392.00,d:0.12,t:0.00},{f:523.25,d:0.12,t:0.14},{f:659.25,d:0.12,t:0.28},{f:783.99,d:0.14,t:0.42},
    {f:659.25,d:0.12,t:0.58},{f:783.99,d:0.32,t:0.72},
    {f:698.46,d:0.12,t:1.15},{f:880.00,d:0.12,t:1.30},{f:1046.50,d:0.14,t:1.45},
    {f:880.00,d:0.12,t:1.62},{f:1046.50,d:0.35,t:1.76},
    {f:1174.66,d:0.18,t:2.18},{f:1046.50,d:0.55,t:2.38}
  ];
  seq.forEach(n=>playTone(n.f,n.t,n.d,'triangle',0.28));
}
function sfxLoseLong(){
  if(muted)return;
  const seq=[
    {f:523.25,d:0.14,t:0.00},{f:392.00,d:0.14,t:0.18},{f:329.63,d:0.16,t:0.36},
    {f:440.00,d:0.18,t:0.58},{f:493.88,d:0.18,t:0.78},{f:440.00,d:0.20,t:0.98},
    {f:415.30,d:0.24,t:1.24},{f:466.16,d:0.24,t:1.52},{f:415.30,d:0.26,t:1.80},
    {f:369.99,d:0.35,t:2.12},{f:329.63,d:0.35,t:2.50},{f:261.63,d:0.65,t:2.90}
  ];
  seq.forEach(n=>playTone(n.f,n.t,n.d,'sawtooth',0.24));
}

/* ---------- chargement ---------- */
const loadImg=u=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(i);i.src='assets/'+u});
async function aud(u){const b=await(await fetch('assets/'+u)).blob();return new Audio(URL.createObjectURL(b))}
async function boot(){
  g.fillStyle='#0a0a14';g.fillRect(0,0,W,H);txt('Chargement…',W/2,H/2,44,'#ffd700');
  await Promise.all(Object.keys(FILES).map(async k=>{A[k]=await loadImg(FILES[k])}));
  requestAnimationFrame(loop);
  aud('musique_magie.mp3').then(a=>{music=a;music.loop=true;music.volume=.4;music.muted=muted;if(wantMusic)startMusic()}).catch(()=>{});
  aud('attrape.mp3').then(a=>S.attrape=a).catch(()=>{});
  aud('collision.wav').then(a=>S.collision=a).catch(()=>{});
}
const sfx=n=>{if(muted||!S[n])return;const a=S[n].cloneNode();a.volume=.8;a.play().catch(()=>{})};
function setMute(m){muted=m;if(music)music.muted=m}
let wantMusic=false;
function startMusic(){wantMusic=true;if(!musicOn&&music){musicOn=true;music.play().catch(()=>musicOn=false)}}

/* ---------- scores ---------- */
const hist=()=>{try{return JSON.parse(localStorage.getItem('quid_hist'))||[]}catch(e){return[]}};
function saveScore(e){try{const h=hist();h.push(e);localStorage.setItem('quid_hist',JSON.stringify(h.slice(-200)))}catch(e){}}
const best=()=>hist().reduce((m,e)=>Math.max(m,e.p),0);

/* ---------- partie match ---------- */
function newGame(ch){
  needName();const d=DIF[diff];
  G={ch,d,t:60,cnt:3.99,el:0,cc:0,parts:[],trail:[],endT:0,win:null,
   p:{x:150,y:360,h:ch.h,face:1,stun:0,inv:0,boost:0,shield:0,dash:0,cd:0,score:0},
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
    const a=rand(0,6.28),v=rand(2,11