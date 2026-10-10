'use strict';
const cv=document.getElementById('c'),g=cv.getContext('2d'),W=1280,H=720;
const A={},keys={};
const FILES={fond:'stade.png',vif:'vif_or.png',harry:'harry.png',drago:'drago.png',hermione:'hermione.png',elise:'elise.png',foret:'foret.jpg'};
const CH=[
 {id:'harry',nom:'Harry',vit:8,h:90,cap:'Turbo',desc:'Vitesse x1.6 (2 s)',nat:1},
 {id:'hermione',nom:'Hermione',vit:7,h:90,cap:'Bouclier',desc:'Immunité cognards (3 s)',nat:1},
 {id:'elise',nom:'Elise',vit:9,h:130,cap:'Petrificus',desc:'Fige rival + cognards (2 s)',nat:1}];
const DIF=[{n:'Facile',v:4.2,err:170,bl:2,sn:.8},{n:'Normal',v:5.6,err:90,bl:2,sn:1},{n:'Difficile',v:7,err:35,bl:3,sn:1.2}];
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

/* ---------- chargement ---------- */
const loadImg=u=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(i);i.src='assets/'+u});
async function aud(u){const b=await(await fetch('assets/'+u)).blob();return new Audio(URL.createObjectURL(b))}
async function boot(){
  draw();
  for(const k in FILES)A[k]=await loadImg(FILES[k]);
  try{music=await aud('musique_magie.mp3');music.loop=true;music.volume=.4;
      S.attrape=await aud('attrape.wav');S.collision=await aud('collision.wav')}catch(e){}
  requestAnimationFrame(loop);
}
const sfx=n=>{if(muted||!S[n])return;const a=S[n].cloneNode();a.volume=.8;a.play().catch(()=>{})};
function setMute(m){muted=m;if(music)music.muted=m}
function startMusic(){if(!musicOn&&music){musicOn=true;music.play().catch(()=>musicOn=false)}}

/* ---------- scores ---------- */
const hist=()=>{try{return JSON.parse(localStorage.getItem('quid_hist'))||[]}catch(e){return[]}};
function saveScore(e){try{const h=hist();h.push(e);localStorage.setItem('quid_hist',JSON.stringify(h.slice(-200)))}catch(e){}}
const best=()=>hist().reduce((m,e)=>Math.max(m,e.p),0);

/* ---------- partie ---------- */
function newGame(ch){
  needName();const d=DIF[diff];
  G={ch,d,t:60,cnt:3.99,el:0,cc:0,parts:[],trail:[],
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
function useAb(o,id){if(o.cd>0)return;o.cd=6;if(id==='harry')o.boost=2;else if(id==='hermione')o.shield=3;else if(id==='elise'){if(G.mode==='spider'){for(const q of G.obs)if(q.t!=='s'&&q.x<W+20)burst(q.x,q.t==='p'?H/2:q.y);G.obs=G.obs.filter(q=>q.t==='s'||q.x>=W+20)}else G.frz=2;o.cd=10}else o.dash=.25}
function burst(x,y){for(let i=0;i<30;i++){const a=rand(0,6.28),v=rand(2,9);G.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:rand(.4,.9)})}}
function respawn(){
  const s=G.s;s.x=Math.random()<.5?60:W-60;s.y=rand(80,H-80);
  s.ang=Math.atan2(H/2-s.y,W/2-s.x);s.fade=.9;G.trail=[];
}
function endGame(){
  const {p,r,ch,d}=G;
  saveScore({j:pname,n:ch.nom,dn:d.n,p:p.score,r:r.score});
  state='result';G.endT=0;if(net.role==='host')sendSnap();
}

function update(dt){
  const k=dt*60,{p,r,s,d}=G;
  if(state==='count'){G.cnt-=dt;if(G.cnt<=0){state='play'}return}
  if(G.mode==='race')return updateRace(dt);
  if(G.mode==='spider')return updateSpider(dt);
  G.t-=dt;G.el+=dt;G.cc-=dt;if(G.frz>0)G.frz-=dt;const fz=G.frz>0;
  if(G.t<=0){G.t=0;endGame();return}
  for(const o of[p,r])for(const f of['stun','inv','boost','shield','dash','cd'])if(o[f]>0)o[f]-=dt;

  /* joueur */
  const [ax,ay]=readInput(p);
  const sp=G.ch.vit*(p.stun>0?.3:1)*(p.boost>0?1.6:1)*(p.dash>0?3:1);
  p.x=Math.min(W-40,Math.max(40,p.x+ax*sp*k));p.y=Math.min(H-40,Math.max(40,p.y+ay*sp*k));
  if(ax)p.face=ax>0?1:-1;

  /* Drago */
  if(fz){}else if(net.role==='host'){const i=net.inp,v=6.5*(r.stun>0?.3:1)*(r.dash>0?3:1);
    r.x=Math.min(W-40,Math.max(40,r.x+i.ax*v*k));r.y=Math.min(H-40,Math.max(40,r.y+i.ay*v*k));if(i.ax)r.face=i.ax>0?1:-1}else{
  r.nt-=dt;if(r.nt<=0){r.nt=.5;r.tx=s.x+rand(-d.err,d.err);r.ty=s.y+rand(-d.err,d.err)}
  {const dx=r.tx-r.x,dy=r.ty-r.y,l=Math.hypot(dx,dy)||1,v=d.v*(r.stun>0?.3:1)*Math.min(1,l/20);
   r.x+=dx/l*v*k;r.y+=dy/l*v*k;if(Math.abs(dx)>4)r.face=dx>0?1:-1}}
  const dd=dist(p,r),min=(p.h+r.h)*.35;
  if(dd<min){const nx=(p.x-r.x)/(dd||1),ny=(p.y-r.y)/(dd||1);
    p.x+=nx*6*k;p.y+=ny*6*k;r.x-=nx*6*k;r.y-=ny*6*k;
    if(G.cc<=0){fx('c');G.cc=.5}}

  /* vif d'or : fuit, zigzag, accélère */
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

  /* cognards */
  for(const b of G.bl){
    b.x+=b.vx*k*(fz?0:1);b.y+=b.vy*k*(fz?0:1);
    if(b.x<20||b.x>W-20)b.vx*=-1;if(b.y<20||b.y>H-20)b.vy*=-1;
    b.x=Math.min(W-20,Math.max(20,b.x));b.y=Math.min(H-20,Math.max(20,b.y));
    for(const o of[p,r]){
      if(!fz&&dist(o,b)<o.h*.35+18){
        const a=Math.atan2(b.y-o.y,b.x-o.x),v=Math.hypot(b.vx,b.vy);b.vx=Math.cos(a)*v;b.vy=Math.sin(a)*v;
        if(o.inv<=0&&!(o===p&&p.shield>0)){o.stun=1.5;o.inv=2.5;fx('c')}
      }}}
  for(const q of G.parts){q.x+=q.vx*k;q.y+=q.vy*k;q.l-=dt}
  G.parts=G.parts.filter(q=>q.l>0);
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
    cn.on('open',()=>net.msg='Connecté ! L\'hôte choisit son personnage…');cn.on('data',onData);cn.on('close',()=>fail('Connexion perdue'))});
  net.peer.on('error',e=>fail(e.type==='peer-unavailable'?'Code introuvable':'Erreur réseau'));
  }catch(e){fail('Réseau indisponible')}
}
function sendSnap(){
  if(!net.conn||!net.conn.open)return;const {p,r,s}=G;
  const f=o=>({x:o.x|0,y:o.y|0,face:o.face,stun:o.stun,boost:o.boost,shield:o.shield,dash:o.dash,cd:o.cd,score:o.score});
  net.conn.send({t:'s',st:state,tm:G.t,fz:G.frz,cnt:G.cnt,el:G.el,p:f(p),r:f(r),s:{x:s.x|0,y:s.y|0,fade:s.fade},bl:G.bl.map(b=>({x:b.x|0,y:b.y|0})),ev:G.ev.splice(0)});
}
function netTick(dt){net.acc+=dt;if(net.acc>=.033){net.acc=0;sendSnap()}}
function guestTick(dt){
  const k=dt*60;for(const q of G.parts){q.x+=q.vx*k;q.y+=q.vy*k;q.l-=dt}G.parts=G.parts.filter(q=>q.l>0);
  G.trail.push({x:G.s.x,y:G.s.y});if(G.trail.length>14)G.trail.shift();
  net.acc+=dt;if(net.acc>=.033&&net.conn&&net.conn.open){net.acc=0;const[ax,ay]=readInput(G.r);net.conn.send({t:'i',ax,ay})}
}
function onData(m){
  if(m.t==='i')net.inp=m;
  else if(m.t==='ab'&&G&&state==='play')useAb(G.r,'dash');
  else if(m.t==='start'&&net.role==='guest'){diff=m.diff;newGame(CH.find(c=>c.id===m.ch));G.me='r';net.msg=''}
  else if(m.t==='s'&&net.role==='guest'&&G&&state!=='lobby'){
    const was=state;G.t=m.tm;G.frz=m.fz;G.cnt=m.cnt;G.el=m.el;Object.assign(G.p,m.p);Object.assign(G.r,m.r);Object.assign(G.s,m.s);G.bl=m.bl;
    m.ev.forEach(e=>fx(e[0],e[1],e[2]));if(m.st==='result'&&was!=='result')G.endT=0;state=m.st}
}
function lobbyClick(m){
  if(hit(backR,m)){leave();state='qmenu';return}
  if(!net.role){if(hit(crR,m))hostGame();else if(hit(joR,m))joinGame()}
  else if(net.role==='host'&&net.ready)CH.forEach((c,i)=>{if(hit(cardR(i),m)){newGame(c);net.inp={ax:0,ay:0};net.conn.send({t:'start',ch:c.id,diff})}});
}
function drawLobby(){
  bg(W/2,H/2,.7);txt('JEU EN LIGNE',W/2,50,44,'#ffd700');
  if(!net.role){
    rbox(crR,'#ffd700');txt('Créer une partie',W/2,crR.y+30,26,'#0a0a14');
    rbox(joR,'#32324a');txt('Rejoindre avec un code',W/2,joR.y+30,26,'#fff');
    txt('Chacun son téléphone : le créateur joue le sorcier, l\'invité joue Drago.',W/2,510,20,'#ccc');
  }else if(net.role==='host'){
    txt('Code : '+net.code,W/2,net.ready?115:260,64,'#fff');
    txt(net.ready?'Joueur connecté ! Choisis ton personnage :':'Donne ce code à l\'autre joueur… en attente',W/2,net.ready?175:340,24,'#ffd700');
    if(net.ready)CH.forEach((c,i)=>{const r=cardR(i);rbox(r,'rgba(30,30,55,.9)','#ffd700');spr(A[c.id],r.x+110,r.y+110,c.h>100?150:110,false);txt(c.nom,r.x+110,r.y+220,30,'#fff');txt(c.cap,r.x+110,r.y+256,22,'#ffd700')});
  }else txt(net.msg,W/2,300,30,'#fff');
  if(net.msg&&net.role!=='guest')txt(net.msg,W/2,580,22,'#ff8080');
  rbox(backR,'#32324a');txt(net.role?'Annuler':'Retour',W/2,backR.y+25,24,'#fff');
}

/* ---------- COURSE CONTRE DRAGO ---------- */
const cl=(v,a,b)=>Math.min(b,Math.max(a,v));
const rbest=()=>{try{return JSON.parse(localStorage.getItem('quid_race'))||{}}catch(e){return{}}};
function newRace(c){
  needName();
  const mk=(x,y,h)=>({x,y,h,face:1,stun:0,inv:0,boost:0,shield:0,dash:0,cd:0,score:0,vx:0,vy:0,kx:0,ky:0});
  G={mode:'race',rm:1,ch:c,d:DIF[diff],cnt:3.99,el:0,dist:0,scroll:0,spawn:1.2,obs:[],parts:[],ev:[],me:'p',frz:0,cc:0,rec:rbest(),win:null,sn:null,sw:0,
     p:mk(250,300,c.h),r:Object.assign(mk(250,440,90),{tx:600,ty:360,mode:0,mt:2,nt:0,ex:0,ey:0})};
  state='count';
}
function crashR(o){fx('c');o.inv=2;o.stun=.6;o.x=cl(o.x-80,40,W-40);o.kx=0;o.ky=0}
function endRace(w){
  G.win=w;
  if(w==='p'){try{const b=rbest();b.time=Math.min(b.time||1e9,G.el);localStorage.setItem('quid_race',JSON.stringify(b));
    const l=JSON.parse(localStorage.getItem('quid_rl'))||[];l.push({j:pname,rm:1,v:G.el,c:G.ch.nom});localStorage.setItem('quid_rl',JSON.stringify(l.slice(-200)))}catch(e){}}
  G.rec=rbest();state='result';G.endT=0;
}
function updateRace(dt){
  const k=dt*60,{p,r,d}=G;G.el+=dt;G.cc-=dt;if(G.frz>0)G.frz-=dt;
  for(const o of[p,r])for(const f of['stun','inv','boost','shield','cd'])if(o[f]>0)o[f]-=dt;
  const dc=Math.pow(.9,k);
  /* joueur */
  const[ax,ay]=readInput(p),sp=G.ch.vit*.9*(p.stun>0?.4:1)*(p.boost>0?1.6:1);
  p.vx=ax*sp;p.vy=ay*sp;if(ax)p.face=ax>0?1:-1;
  /* défilement + obstacles */
  const rv=Math.min(900,450+G.el*8);G.scroll+=rv*dt;G.dist=G.scroll/40;
  if(!G.sn&&G.dist>=GOAL){G.sn={x:W-80,y:rand(200,H-200),ang:Math.PI,fade:1}}
  if(!G.sn&&(G.spawn-=dt)<=0){G.spawn=Math.max(.5,1.2-G.el*.008)/d.sn;const ig=Math.random()<[.35,.15,.03][diff];
    G.obs.push(Math.random()<.45?{t:'b',x:W+30,y:0,y0:rand(80,H-80),r:20,ph:rand(0,6),amp:rand(0,90),ig}:{t:'p',x:W+40,w:70,h:rand(150,300),top:Math.random()<.5,ig})}
  for(const o of G.obs){o.x-=(rv+(o.t==='b'?120:0))*dt;if(o.t==='b')o.y=cl(o.y0+Math.sin(G.el*3+o.ph)*o.amp,20,H-20)}
  G.obs=G.obs.filter(o=>o.x>-120);
  /* Drago (IA) */
  if(G.frz>0){r.vx=r.vy=0}else{
    const ag=[.3,.6,1][diff];
    if((r.mt-=dt)<=0){r.mt=rand(2,4);r.mode=Math.random()<ag*.7?1:0}
    let tx,ty;
    if(G.sn){if((r.nt-=dt)<=0){r.nt=.5;r.ex=rand(-d.err,d.err);r.ey=rand(-d.err,d.err)}tx=G.sn.x+r.ex;ty=G.sn.y+r.ey}
    else if(r.mode&&Math.abs(p.x-r.x)<520){tx=p.x;ty=p.y}
    else{tx=cl(p.x+160,400,W-100);ty=H/2+Math.sin(G.el)*120}
    for(const o of G.obs){if(o.ig||o.x<r.x-30||o.x>r.x+130+d.v*20)continue;
      if(o.t==='p'){if(o.top?r.y<o.h+70:r.y>H-o.h-70){ty=o.top?o.h+110:H-o.h-110}}
      else if(Math.abs(r.y-o.y)<70)ty=o.y+(r.y>=o.y?1:-1)*110}
    ty=cl(ty,60,H-60);
    const dx=tx-r.x,dy=ty-r.y,l=Math.hypot(dx,dy)||1,v=d.v*(r.stun>0?.4:1)*Math.min(1,l/20);
    r.vx=dx/l*v;r.vy=dy/l*v;if(Math.abs(dx)>4)r.face=dx>0?1:-1}
  /* poussées entre joueurs */
  const dd=dist(p,r),mn=(p.h+r.h)*.33;
  if(dd<mn){const nx=(p.x-r.x)/(dd||1),ny=(p.y-r.y)/(dd||1);
    const ap=Math.max(0,-(p.vx*nx+p.vy*ny)),ar=Math.max(0,r.vx*nx+r.vy*ny);
    r.kx-=nx*(5+ap*1.6);r.ky-=ny*(5+ap*1.6);p.kx+=nx*(5+ar*1.6);p.ky+=ny*(5+ar*1.6);
    if(G.cc<=0){fx('c');G.cc=.5}}
  for(const o of[p,r]){o.kx=cl(o.kx,-20,20);o.ky=cl(o.ky,-20,20);
    o.x=cl(o.x+(o.vx+o.kx)*k,40,W-40);o.y=cl(o.y+(o.vy+o.ky)*k,40,H-40);o.kx*=dc;o.ky*=dc}
  /* chocs contre les obstacles (joueur ET Drago) */
  for(const o of G.obs)for(const q of[p,r]){
    if(q.inv>0||(q===p&&p.shield>0))continue;
    const h=o.t==='b'?dist(q,o)<q.h*.33+o.r:Math.abs(q.x-o.x)<o.w/2+q.h*.28&&(o.top?q.y<o.h+q.h*.28:q.y>H-o.h-q.h*.28);
    if(h)crashR(q)}
  /* Vif d'or */
  if(G.sn){const s=G.sn;G.sw+=dt;
    s.ang+=(Math.random()-.5)*.25*k;if(Math.random()<.012*k)s.ang+=(Math.random()<.5?-1:1)*1.2;
    for(const o of[p,r]){const dx=s.x-o.x,dy=s.y-o.y;
      if(Math.hypot(dx,dy)<230){let df=Math.atan2(dy,dx)-s.ang;df=Math.atan2(Math.sin(df),Math.cos(df));s.ang+=df*.12*k}}
    const ss=(5+G.sw*.1)*d.sn*(s.fade>0?.5:1);
    s.x+=Math.cos(s.ang)*ss*k;s.y+=Math.sin(s.ang)*ss*k;if(s.fade>0)s.fade-=dt;
    if(s.x<40){s.x=40;s.ang=Math.PI-s.ang}if(s.x>W-40){s.x=W-40;s.ang=Math.PI-s.ang}
    if(s.y<40){s.y=40;s.ang=-s.ang}if(s.y>H-40){s.y=H-40;s.ang=-s.ang}
    if(s.fade<=0)for(const o of[p,r]){const rad=o.h*.4+10+(o===p&&G.ch.id==='harry'?15:0);
      if(dist(o,s)<rad){fx('a',s.x,s.y);endRace(o===p?'p':'r');return}}
    if(G.sw>=25){endRace(null);return}}
  for(const q of G.parts){q.x+=q.vx*k;q.y+=q.vy*k;q.l-=dt}G.parts=G.parts.filter(q=>q.l>0);
}
function drawRace(){
  const{p,r}=G,sc=G.scroll*.6,n=Math.floor(sc/W);
  for(let i=n;i<=n+1;i++){g.save();g.translate(i*W-sc+(i%2?W:0),0);if(i%2)g.scale(-1,1);if(A.fond.width)g.drawImage(A.fond,0,0,W,H);g.restore()}
  g.fillStyle='rgba(255,255,255,.25)';for(let i=0;i<8;i++)g.fillRect(((i*197-G.scroll*1.6)%W+W)%W,(i*89+60)%H,70,2);
  for(const o of G.obs){
    if(o.t==='p'){const y=o.top?0:H-o.h,x=o.x-o.w/2;g.fillStyle='#8a7a5a';g.fillRect(x,y,o.w,o.h);g.strokeStyle='#4a3f2a';g.lineWidth=4;g.strokeRect(x,y,o.w,o.h);g.fillStyle='#c33';g.fillRect(x,o.top?o.h-26:y,o.w,26)}
    else{g.beginPath();g.arc(o.x,o.y,o.r,0,7);g.fillStyle='#222';g.fill();g.strokeStyle='#e33';g.lineWidth=3;g.stroke()}}
  if(G.sn){const s=G.sn;g.save();g.shadowColor='#ffd700';g.shadowBlur=22;
    spr(A.vif,s.x,s.y,50,false,s.fade>0?.4+.3*Math.sin(G.el*40):1,1+.15*Math.sin(G.el*45));g.restore()}
  for(const o of[r,p]){
    const im=o===p?A[G.ch.id]:A.drago,fl=o===p?p.face*G.ch.nat<0:r.face<0;
    if(o.boost>0){g.fillStyle='rgba(255,215,0,.25)';g.beginPath();g.arc(o.x-40,o.y,o.h*.45,0,7);g.fill()}
    spr(im,o.x,o.y,o.h,fl,o.inv>0?.5+.4*Math.sin(G.el*30):1);
    if(o.shield>0){g.beginPath();g.arc(o.x,o.y,o.h*.7,0,7);g.strokeStyle='rgba(120,200,255,.9)';g.lineWidth=5;g.stroke()}
    if(o.stun>0)txt('★ ★ ★',o.x,o.y-o.h*.6,22,'#ffd700')}
  if(G.frz>0){g.strokeStyle='rgba(170,230,255,.95)';g.lineWidth=4;g.beginPath();g.arc(r.x,r.y,r.h*.5,0,7);g.stroke();txt('PETRIFICUS TOTALUS !',W/2,130,40,'#9fe0ff')}
  txt('▼',p.x,p.y-p.h*.62,22,'#fff');txt('Drago',r.x,r.y-r.h*.62,20,'#ff6060');
  for(const q of G.parts){g.globalAlpha=Math.max(0,q.l);g.fillStyle='#ffe96a';g.fillRect(q.x,q.y,4,4)}g.globalAlpha=1;
  txt(`${G.el.toFixed(1)} s`,30,45,34,'#ffd700','left');
  txt(G.sn?'ATTRAPE LE VIF D\'OR !':`Vif d'or dans ${Math.max(0,GOAL-G.dist)|0} m`,W/2,45,32,G.sn?'#ffd700':'#fff');
  txt(`Record ${G.rec.time?G.rec.time.toFixed(1)+' s':'—'}`,W-30,45,24,'#ccc','right');
  g.fillStyle='rgba(0,0,0,.5)';g.fillRect(200,H-24,W-400,10);g.fillStyle='#80ff78';g.fillRect(200,H-24,(W-400)*Math.min(1,G.dist/GOAL),10);
  rbox(pauseR,'rgba(0,0,0,.5)');txt('II',pauseR.x+Z/2,pauseR.y+Z/2,Z/2,'#fff');
  rbox(muteR,'rgba(0,0,0,.5)');txt(muted?'🔇':'🔊',muteR.x+Z/2,muteR.y+Z/2,Z/2,'#fff');
  if(!COARSE){g.beginPath();g.arc(abP.x,abP.y,abP.r,0,7);g.fillStyle=p.cd>0?'rgba(60,60,80,.7)':'rgba(255,215,0,.85)';g.fill();
    txt(p.cd>0?Math.ceil(p.cd):G.ch.cap,abP.x,abP.y,p.cd>0?30:18,p.cd>0?'#fff':'#0a0a14')}
  if(state==='count')txt(G.cnt>.99?Math.ceil(G.cnt-.99)+'':'GO !',W/2,H/2,140,'#ffd700');
  if(state==='pause'){g.fillStyle='rgba(0,0,0,.6)';g.fillRect(0,0,W,H);txt('PAUSE',W/2,300,80,'#ffd700');txt('Touche / P pour reprendre • R pour le menu',W/2,400,26,'#fff')}
}
function drawRaceResult(){
  bg(W/2,H/2,.7);const w=G.win;
  txt(w==='p'?'VICTOIRE !':w==='r'?'DÉFAITE':'LE VIF S\'EST ENVOLÉ',W/2,120,76,w==='p'?'#50ff78':w==='r'?'#ff5050':'#fff');
  txt(w==='p'?'Tu as attrapé le Vif d\'or !':w==='r'?'Drago a attrapé le Vif d\'or…':'Personne ne l\'a attrapé',W/2,230,38,'#fff');
  if(w==='p')txt(`Temps : ${G.el.toFixed(1)} s`,W/2,310,40,'#80ff78');
  txt('Record : '+(G.rec.time?G.rec.time.toFixed(1)+' s':'—'),W/2,400,28,'#ffd700');
  txt('Touche l\'écran ou R pour revenir au menu',W/2,620,24,'#fff');
}
function drawRMenu(){
  bg(W/2,H/2,.7);txt('COURSE CONTRE DRAGO',W/2,50,44,'#ffd700');
  txt('Pousse Drago dans les obstacles, évite ses coups et attrape le Vif d\'or !',W/2,115,22,'#fff');
  txt(`Le Vif apparaît après ${GOAL} m • un choc te fait reculer et te laisse sonné`,W/2,148,20,'#ccc');
  const b=rbest();txt('Record : '+(b.time?b.time.toFixed(1)+' s':'—'),W/2,180,20,'#ffd700');
  CH.forEach((c,i)=>{const r=cardR(i);rbox(r,'rgba(30,30,55,.9)','#ffd700');spr(A[c.id],r.x+110,r.y+110,c.h>100?150:110,false);txt(c.nom,r.x+110,r.y+220,30,'#fff');txt(c.cap,r.x+110,r.y+256,22,'#ffd700')});
  difs();rbox(backR,'#32324a');txt('Retour',W/2,backR.y+25,24,'#fff');
}
function rmenuClick(m){
  if(hit(backR,m)){state='menu';return}
  DIF.forEach((_,i)=>{if(hit(difR(i),m))diff=i});
  CH.forEach((c,i)=>{if(hit(cardR(i),m))newRace(c)});
}

function drawBoard(){
  bg(W/2,H/2,.75);txt('🏆 CLASSEMENT',W/2,50,44,'#ffd700');
  ['Matchs','Course','Forêt interdite'].forEach((n,i)=>{const r=tabR(i);rbox(r,i===btab?'#ffd700':'#32324a');txt(n,r.x+110,r.y+26,22,i===btab?'#0a0a14':'#fff')});
  let rows;
  if(btab===0)rows=hist().filter(h=>h.j).sort((a,b)=>b.p-a.p).slice(0,8).map(h=>[h.j+' ('+h.n+')',h.p+' pts']);
  else{let l=[];try{l=JSON.parse(localStorage.getItem('quid_rl'))||[]}catch(e){}
    l=l.filter(e=>e.rm===btab).sort((a,b)=>a.v-b.v);
    rows=l.slice(0,8).map(e=>[e.j+' ('+e.c+')',e.v.toFixed(1)+' s'])}
  if(!rows.length)txt('Aucun score pour l\'instant',W/2,330,26,'#aaa');
  rows.forEach((r,i)=>{const y=210+i*48;txt((i+1)+'.',W/2-330,y,28,'#ffd700','left');txt(r[0],W/2-280,y,28,'#fff','left');txt(r[1],W/2+330,y,28,'#80ff78','right')});
  rbox(backR,'#32324a');txt('Retour',W/2,backR.y+25,24,'#fff');
}
function boardClick(m){if(hit(backR,m)){state='menu';return}for(let i=0;i<3;i++)if(hit(tabR(i),m))btab=i}

/* ---------- rendu ---------- */
function txt(s,x,y,size,col,al='center'){
  g.font=`bold ${size}px Georgia,serif`;g.textAlign=al;g.textBaseline='middle';
  g.lineWidth=5;g.strokeStyle='rgba(0,0,0,.7)';g.strokeText(s,x,y);g.fillStyle=col;g.fillText(s,x,y);
}
function spr(im,x,y,h,flip,alpha=1,sx=1){
  if(!im||!im.width)return;const w=h*im.width/im.height;
  g.save();g.translate(x,y);g.scale(flip?-sx:sx,1);g.globalAlpha=alpha;g.drawImage(im,-w/2,-h/2,w,h);g.restore();
}
function bg(px=W/2,py=H/2,dark=0){
  if(A.fond&&A.fond.width)g.drawImage(A.fond,-W*.04-(px-W/2)*.03,-H*.04-(py-H/2)*.03,W*1.08,H*1.08);
  else{g.fillStyle='#0a0a14';g.fillRect(0,0,W,H)}
  if(dark){g.fillStyle=`rgba(5,5,15,${dark})`;g.fillRect(0,0,W,H)}
}
function rbox(r,fill,stroke){g.beginPath();g.roundRect(r.x,r.y,r.w,r.h,12);g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=3;g.stroke()}}

function cards(){CH.forEach((c,i)=>{const r=cardR(i);rbox(r,'rgba(30,30,55,.9)','#ffd700');
  spr(A[c.id],r.x+110,r.y+95,c.h>100?150:110,false);
  txt(c.nom,r.x+110,r.y+190,30,'#fff');txt(c.cap,r.x+110,r.y+226,22,'#ffd700');txt(c.desc,r.x+110,r.y+256,15,'#ccc')})}
function difs(){txt('Difficulté',W/2,515,24,'#fff');DIF.forEach((d,i)=>{const r=difR(i);rbox(r,i===diff?'#ffd700':'#32324a');txt(d.n,r.x+80,r.y+26,24,i===diff?'#0a0a14':'#fff')})}
function tile(i,title,sub,col){const r=homeR(i);rbox(r,'rgba(20,20,40,.88)',col);
  txt(title,r.x+r.w/2,r.y+225,32,col);sub.forEach((t,j)=>txt(t,r.x+r.w/2,r.y+272+j*28,20,'#ddd'));return r}
function drawMenu(){
  bg(W/2,H/2,.6);
  txt('QUIDDITCH CHAMPIONSHIP',W/2,90,64,'#ffd700');
  txt('Choisis ton aventure',W/2,150,28,'#fff');
  let r=tile(0,'Match de Quidditch',['Attrape le Vif d\'or face à Drago','Jeu en ligne à 2'],'#ffd700');
  spr(A.vif,r.x+r.w/2,r.y+105,120);
  r=tile(1,'Course vs Drago',['Pousse-le dans les obstacles','Attrape le Vif d\'or en premier'],'#1f9d55');
  spr(A.harry,r.x+r.w/2,r.y+105,120);
  r=tile(2,'Forêt interdite',['Fuis les araignées d\'Aragog','puis l\'araignée géante !'],'#b04aff');
  bug(r.x+r.w/2,r.y+105,48,performance.now()/1000);
  rbox(nameR,'#32324a');txt('👤 '+(pname||'Ton nom'),nameR.x+150,nameR.y+28,24,'#fff');
  rbox(boardR,'#32324a');txt('🏆 Classement',boardR.x+150,boardR.y+28,24,'#fff');
  if(COARSE){rbox(swapR,'#32324a','#ffd700');txt(swap?'Joystick à gauche ⇄':'Joystick à droite ⇄',swapR.x+150,swapR.y+22,21,'#fff')}
  else txt('Flèches / ZQSD ou toucher pour bouger • Espace = pouvoir • P = pause • M = muet',W/2,690,18,'#aaa');
}
function drawQMenu(){
  bg(W/2,H/2,.7);txt('MATCH DE QUIDDITCH',W/2,50,44,'#ffd700');
  txt('Choisis ton personnage pour affronter Drago',W/2,125,24,'#fff');
  if(net.msg)txt(net.msg,W/2,165,24,'#ff8080');
  cards();difs();
  rbox(onR,'#2a5cff');txt('Jouer en ligne (2 tél.)',onR.x+190,onR.y+25,24,'#fff');
  rbox(qbackR,'#32324a');txt('Retour',qbackR.x+190,qbackR.y+25,24,'#fff');
}
function qmenuClick(m){
  if(hit(qbackR,m)){net.msg='';state='menu';return}
  if(hit(onR,m)){net.msg='';state='lobby';return}
  DIF.forEach((_,i)=>{if(hit(difR(i),m))diff=i});
  CH.forEach((c,i)=>{if(hit(cardR(i),m))newGame(c)});
}
function backToMenu(){const m=G&&G.mode;leave();state=m==='race'?'rmenu':m==='spider'?'smenu':'qmenu'}

/* ---------- MODE FORÊT INTERDITE ---------- */
const hash=(i,L)=>{const x=Math.sin(i*127.1+L*311.7)*43758.5;return x-Math.floor(x)};
function drawSMenu(){
  forest(0);g.fillStyle='rgba(0,0,10,.55)';g.fillRect(0,0,W,H);txt('LA FORÊT INTERDITE',W/2,50,44,'#b04aff');
  txt('Fuis les araignées d\'Aragog… puis échappe-toi de l\'araignée géante !',W/2,115,22,'#fff');
  txt(`Parcours ${GOAL2} m, puis survis ${BOSS_T} s : esquive ses crachats et ses assauts • 3 vies`,W/2,148,20,'#ccc');
  const b=rbest();txt('Record : '+(b.sp?b.sp.toFixed(1)+' s':'—'),W/2,180,20,'#ffd700');
  CH.forEach((c,i)=>{const r=cardR(i);rbox(r,'rgba(30,30,55,.9)','#b04aff');spr(A[c.id],r.x+110,r.y+110,c.h>100?150:110,false);txt(c.nom,r.x+110,r.y+220,30,'#fff');txt(c.cap,r.x+110,r.y+256,22,'#ffd700')});
  difs();rbox(backR,'#32324a');txt('Retour',W/2,backR.y+25,24,'#fff');
}
function smenuClick(m){
  if(hit(backR,m)){state='menu';return}
  DIF.forEach((_,i)=>{if(hit(difR(i),m))diff=i});
  CH.forEach((c,i)=>{if(hit(cardR(i),m))newSpider(c)});
}
function newSpider(c){
  needName();
  G={mode:'spider',ch:c,d:DIF[diff],cnt:3.99,el:0,dist:0,bonus:0,scroll:0,lives:3,slow:0,web:0,spawn:1,phase:0,bw:0,bt:0,bz:null,won:false,obs:[],parts:[],ev:[],me:'p',frz:0,rec:rbest(),
     p:{x:300,y:360,h:c.h,face:1,stun:0,inv:0,boost:0,shield:0,dash:0,cd:0,score:0},r:{cd:0}};
  state='count';
}
function crashS(){const p=G.p;fx('c');p.inv=2;p.stun=.5;G.slow=1;p.x=cl(p.x-70,40,W-40);if(--G.lives<=0)endSpider(false)}
function endSpider(w){
  G.won=w;
  try{const b=rbest();b.spd=Math.max(b.spd||0,G.dist|0);if(w)b.sp=Math.min(b.sp||1e9,G.el);localStorage.setItem('quid_race',JSON.stringify(b));
    if(w){const l=JSON.parse(localStorage.getItem('quid_rl'))||[];l.push({j:pname,rm:2,v:G.el,c:G.ch.nom});localStorage.setItem('quid_rl',JSON.stringify(l.slice(-200)))}}catch(e){}
  G.rec=rbest();state='result';G.endT=0;
}
function updateSpider(dt){
  const k=dt*60,p=G.p;G.el+=dt;
  for(const f of['stun','inv','boost','shield','cd'])if(p[f]>0)p[f]-=dt;
  if(G.slow>0)G.slow-=dt;if(G.web>0)G.web-=dt;
  const[ax,ay]=readInput(p),sp=G.ch.vit*.9*(p.stun>0?.4:1)*(G.web>0?.55:1);
  p.x=cl(p.x+ax*sp*k,40,W-40);p.y=cl(p.y+ay*sp*k,40,H-40);if(ax)p.face=ax>0?1:-1;
  const v=Math.min(950,(420+G.el*6)*G.d.sn)*(G.phase?1.1:1)*(p.boost>0?1.6:1)*(G.slow>0?.5:1)*(G.web>0?.6:1);
  G.scroll+=v*dt;G.dist=G.scroll/40+G.bonus;
  if(G.phase===0&&G.dist>=GOAL2){G.phase=1;G.bw=0;G.bt=0;G.bz={ph:'idle',t:0,y:H/2,front:-380,nl:1.8,ns:1.2,sp:0};G.lives=Math.min(3,G.lives+1)}
  if(G.phase===1&&G.bw<2)G.bw+=dt;
  const warn=G.phase===1&&G.bw<2,fight=G.phase===1&&G.bw>=2;
  if(warn){const e=Math.min(1,G.bw/2);G.bz.front=-380+450*(1-(1-e)*(1-e))}
  if(!warn&&(G.spawn-=dt)<=0){
    G.spawn=Math.max(.45,1.15-G.el*.007)/G.d.sn*(fight?1.3:1);const q=Math.random();
    if(q<.1)G.obs.push({t:'s',x:W+40,y:rand(80,H-80),r:22});
    else if(q<.28)G.obs.push({t:'w',x:W+80,y:rand(100,H-100),r:60});
    else if(q<.6)G.obs.push({t:'h',x:W+30,y:200,y0:rand(150,420),r:24,ph:rand(0,6)});
    else{const n=1+(Math.random()*3|0),y0=rand(80,H-80);for(let i=0;i<n;i++)G.obs.push({t:'g',x:W+40+i*50,y:cl(y0+rand(-40,40),60,H-60),r:18,ph:rand(0,6)})}}
  for(const o of G.obs){
    if(o.t==='h'){o.x-=v*dt;o.y=o.y0+Math.sin(G.el*2.5+o.ph)*50}
    else if(o.t==='g'){o.x-=(v+170)*dt;if(o.x>p.x+80){const dy=p.y-o.y;o.y+=Math.sign(dy)*Math.min(Math.abs(dy),70*dt)}}
    else if(o.t==='v'){o.x+=o.vx*dt;o.y+=o.vy*dt}
    else o.x-=v*dt}
  G.obs=G.obs.filter(o=>o.x>-160&&o.x<W+200);
  for(const o of G.obs.slice()){
    if(o.t==='s'){if(dist(p,o)<p.h*.4+o.r){G.bonus+=50;fx('a',o.x,o.y);G.obs.splice(G.obs.indexOf(o),1)}continue}
    if(o.t==='w'){if(dist(p,o)<o.r+p.h*.25)G.web=.3;continue}
    if(o.t==='v'){if(p.inv<=0&&p.shield<=0&&dist(p,o)<p.h*.3+o.r){G.obs.splice(G.obs.indexOf(o),1);crashS();break}continue}
    if(p.inv>0||p.shield>0)continue;
    if(dist(p,o)<p.h*.33+o.r){crashS();break}}
  if(state!=='play')return;
  if(fight){G.bt+=dt;const B=G.bz,LF=560;B.t+=dt;
    if(B.ph==='idle'){B.y+=cl(p.y-B.y,-90*dt,90*dt);B.front=70+Math.sin(G.el*2)*10;B.nl-=dt;if(B.nl<=0){B.ph='tele';B.t=0}}
    else if(B.ph==='tele'){B.front=70+Math.sin(G.el*40)*6;if(B.t>=.9){B.ph='lunge';B.t=0}}
    else if(B.ph==='lunge'){B.front=70+(LF-70)*Math.min(1,B.t/.25);
      if(p.inv<=0&&p.shield<=0&&Math.abs(p.y-B.y)<110+p.h*.2&&p.x<B.front+p.h*.2){crashS();if(state!=='play')return}
      if(B.t>=.55){B.ph='back';B.t=0}}
    else{B.front=LF-(LF-70)*Math.min(1,B.t/.8);if(B.t>=.8){B.ph='idle';B.nl=rand(2,3.2);B.t=0}}
    if(B.ph==='idle'||B.ph==='back'){
      if(B.sp>0){B.sp-=dt;if(B.sp<=0){const an=Math.atan2(p.y-B.y,p.x-B.front);G.obs.push({t:'v',x:B.front+20,y:B.y,vx:Math.cos(an)*540,vy:Math.sin(an)*540,r:16});B.ns=rand(1.5,2.2)}}
      else if((B.ns-=dt)<=0)B.sp=.45}
    if(G.bt>=BOSS_T){endSpider(true);return}}
  for(const q of G.parts){q.x+=q.vx*k;q.y+=q.vy*k;q.l-=dt}G.parts=G.parts.filter(q=>q.l>0);
}
function bug(x,y,r,t,col='#241f2e'){
  g.save();g.translate(x,y);g.strokeStyle=col;g.lineCap='round';g.lineWidth=Math.max(2,r*.14);
  for(let i=0;i<4;i++)for(const s of[-1,1]){const u=i-1.5,w=Math.sin(t*14+i*1.7+(s>0?1:0))*r*.2;
    g.beginPath();g.moveTo(u*r*.3,0);g.lineTo(u*r*.6,s*r*.9+w);g.lineTo(u*r*1.1,s*r*1.5+w*1.4);g.stroke()}
  g.fillStyle=col;g.strokeStyle='#5a5470';g.lineWidth=2;
  g.beginPath();g.ellipse(r*.3,0,r*.8,r*.62,0,0,7);g.fill();g.stroke();
  g.fillStyle='#352c40';g.beginPath();g.arc(-r*.55,0,r*.42,0,7);g.fill();g.stroke();
  g.fillStyle='#ff3030';for(const e of[-1,1]){g.beginPath();g.arc(-r*.8,e*r*.14,r*.1,0,7);g.fill()}
  g.restore();
}
function web(x,y,r){
  g.save();g.translate(x,y);g.strokeStyle='rgba(235,235,245,.7)';g.lineWidth=2;
  for(let i=0;i<8;i++){const a=i*Math.PI/4;g.beginPath();g.moveTo(0,0);g.lineTo(Math.cos(a)*r,Math.sin(a)*r);g.stroke()}
  for(let j=1;j<=3;j++){g.beginPath();for(let i=0;i<=8;i++){const a=i*Math.PI/4,rr=r*j/3*(i%2?.88:1);i?g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):g.moveTo(Math.cos(a)*rr,Math.sin(a)*rr)}g.stroke()}
  g.fillStyle='rgba(255,255,255,.07)';g.beginPath();g.arc(0,0,r,0,7);g.fill();g.restore();
}
function boss(t){
  g.save();g.lineCap='round';g.lineJoin='round';
  for(let i=0;i<8;i++){const u=i<4?-1:1,j=i%4,w=Math.sin(t*3+i*.8)*16;
    g.beginPath();g.moveTo(60,u*50);g.lineTo(170+j*35,u*(240+j*8)+w);g.lineTo(260+j*50,u*(80+j*55)+w*1.4);
    g.strokeStyle='#5a5470';g.lineWidth=30;g.stroke();g.strokeStyle='#17121a';g.lineWidth=24;g.stroke()}
  g.fillStyle='#17121a';g.strokeStyle='#5a5470';g.lineWidth=4;
  g.beginPath();g.ellipse(-50,0,210,175,0,0,7);g.fill();g.stroke();
  g.beginPath();g.arc(120,0,92,0,7);g.fillStyle='#241a22';g.fill();g.stroke();
  g.fillStyle='#ff2a2a';g.shadowColor='#f00';g.shadowBlur=18;
  for(const[ex,ey,er]of[[165,-34,15],[165,34,15],[185,-8,10],[185,8,10],[142,-58,9],[142,58,9]]){g.beginPath();g.arc(ex,ey,er,0,7);g.fill()}
  g.shadowBlur=0;g.fillStyle='#eee';
  for(const s of[-1,1]){g.beginPath();g.moveTo(205,s*20);g.lineTo(250,s*10);g.lineTo(208,s*34);g.fill()}
  g.restore();
}
function forest(sc){
  const im=A.foret;
  if(im&&im.width){
    const tw=H*im.width/im.height,off=sc*.4,n=Math.floor(off/tw);
    for(let i=n;i*tw-off<W;i++){const x=i*tw-off;g.save();
      if(i%2){g.translate(x+tw,0);g.scale(-1,1)}else g.translate(x,0);
      g.drawImage(im,0,0,tw,H);g.restore()}
    g.fillStyle='rgba(0,0,10,.15)';g.fillRect(0,0,W,H);
    return}
  const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#03070a');gr.addColorStop(.65,'#0a1a12');gr.addColorStop(1,'#040704');
  g.fillStyle=gr;g.fillRect(0,0,W,H);
  g.fillStyle='rgba(190,225,205,.1)';g.beginPath();g.arc(1010,130,100,0,7);g.fill();g.beginPath();g.arc(1010,130,60,0,7);g.fill();
  for(let L=0;L<3;L++){const gap=[150,200,280][L],wd=[22,34,56][L],off=sc*[.15,.3,.55][L],n=Math.floor(off/gap);
    for(let i=n-1;i<=n+Math.ceil(W/gap)+1;i++){const x=i*gap-off+hash(i,L)*gap*.4;
      g.fillStyle=['#06100b','#08150d','#0b1c11'][L];g.fillRect(x,0,wd,H);
      if(L===1&&hash(i,9)>.6){const ey=200+hash(i,5)*300,bl=Math.sin(sc*.004+i)>.9?0:3;g.fillStyle='#e8e060';g.fillRect(x+wd+4,ey,bl,3);g.fillRect(x+wd+14,ey,bl,3)}}}
  g.fillStyle='rgba(150,200,170,.05)';for(let i=0;i<4;i++)g.fillRect(0,i*170+80+Math.sin(sc*.002+i)*20,W,60);
}
function drawSpiderGame(){
  const p=G.p,warn=G.phase===1&&G.bw<2,fight=G.phase===1&&G.bw>=2;
  g.save();if(warn)g.translate(rand(-6,6),rand(-6,6));
  forest(G.scroll);
  if(G.phase===1){const B=G.bz;
    if(B.ph==='tele'){g.fillStyle=`rgba(255,40,40,${.16+.1*Math.sin(G.el*30)})`;g.fillRect(0,B.y-110,560,220);txt('!',590,B.y,64,'#ff4040')}
    g.save();g.translate(B.front-200,B.y+(B.ph==='idle'?Math.sin(G.el*2)*10:0));g.scale(.8,.8);boss(G.el);g.restore();
    if(B.sp>0){g.save();g.fillStyle='rgba(120,255,80,.8)';g.shadowColor='#7f5';g.shadowBlur=20;g.beginPath();g.arc(B.front+20,B.y,26*(1-B.sp/.45)+8,0,7);g.fill();g.restore()}}
  for(const o of G.obs){
    if(o.t==='w')web(o.x,o.y,o.r);
    else if(o.t==='h'){g.strokeStyle='rgba(220,220,230,.6)';g.lineWidth=2;g.beginPath();g.moveTo(o.x,0);g.lineTo(o.x,o.y);g.stroke();bug(o.x,o.y,o.r,G.el+o.ph)}
    else if(o.t==='v'){g.save();g.fillStyle='#8f4';g.shadowColor='#7f5';g.shadowBlur=18;g.beginPath();g.arc(o.x,o.y,o.r,0,7);g.fill();g.restore()}
    else if(o.t==='g')bug(o.x,o.y,o.r,G.el*1.5+o.ph);
    else{g.save();g.shadowColor='#ffd700';g.shadowBlur=18;spr(A.vif,o.x,o.y,46,false,1,1+.15*Math.sin(G.el*40));g.restore()}}
  if(p.boost>0){g.fillStyle='rgba(255,215,0,.25)';g.beginPath();g.arc(p.x-40,p.y,p.h*.45,0,7);g.fill()}
  spr(A[G.ch.id],p.x,p.y,p.h,p.face*G.ch.nat<0,p.inv>0?.5+.4*Math.sin(G.el*30):1);
  if(p.shield>0){g.beginPath();g.arc(p.x,p.y,p.h*.7,0,7);g.strokeStyle='rgba(120,200,255,.9)';g.lineWidth=5;g.stroke()}
  if(G.web>0){g.beginPath();g.arc(p.x,p.y,p.h*.6,0,7);g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=3;g.setLineDash([6,6]);g.stroke();g.setLineDash([])}
  for(const q of G.parts){g.globalAlpha=Math.max(0,q.l);g.fillStyle='#ffe96a';g.fillRect(q.x,q.y,4,4)}g.globalAlpha=1;
  g.restore();
  if(warn){txt('L\'ARAIGNÉE GÉANTE !',W/2,250,70,'#ff4040');txt('COURS !',W/2,335,50,'#fff')}
  txt(`${G.dist|0} m`,30,45,34,'#ffd700','left');
  txt('♥'.repeat(Math.max(0,G.lives)),W/2,45,38,'#ff5050');
  txt(G.phase===0?`Araignée géante dans ${Math.max(0,GOAL2-G.dist)|0} m`:fight?`Survis ! ${Math.ceil(BOSS_T-G.bt)} s`:'',W-30,45,24,'#ccc','right');
  g.fillStyle='rgba(0,0,0,.5)';g.fillRect(200,H-24,W-400,10);
  g.fillStyle=G.phase===0?'#80ff78':'#ff5050';g.fillRect(200,H-24,(W-400)*(G.phase===0?Math.min(1,G.dist/GOAL2):fight?1-G.bt/BOSS_T:1),10);
  rbox(pauseR,'rgba(0,0,0,.5)');txt('II',pauseR.x+Z/2,pauseR.y+Z/2,Z/2,'#fff');
  rbox(muteR,'rgba(0,0,0,.5)');txt(muted?'🔇':'🔊',muteR.x+Z/2,muteR.y+Z/2,Z/2,'#fff');
  if(!COARSE){g.beginPath();g.arc(abP.x,abP.y,abP.r,0,7);g.fillStyle=p.cd>0?'rgba(60,60,80,.7)':'rgba(255,215,0,.85)';g.fill();
    txt(p.cd>0?Math.ceil(p.cd):G.ch.cap,abP.x,abP.y,p.cd>0?30:18,p.cd>0?'#fff':'#0a0a14')}
  if(state==='count')txt(G.cnt>.99?Math.ceil(G.cnt-.99)+'':'GO !',W/2,H/2,140,'#ffd700');
  if(state==='pause'){g.fillStyle='rgba(0,0,0,.6)';g.fillRect(0,0,W,H);txt('PAUSE',W/2,300,80,'#ffd700');txt('Touche / P pour reprendre • R pour le menu',W/2,400,26,'#fff')}
}
function drawSpiderResult(){
  bg(W/2,H/2,.8);const w=G.won;
  txt(w?'TU T\'ES ÉCHAPPÉ !':'CAPTURÉ PAR LES ARAIGNÉES',W/2,120,w?70:56,w?'#80ff78':'#ff5050');
  txt(`${G.dist|0} m`,W/2,230,64,'#fff');
  if(w)txt(`Temps : ${G.el.toFixed(1)} s`,W/2,310,40,'#80ff78');
  else txt(G.phase?'L\'araignée géante t\'a rattrapé…':'Tu n\'as pas atteint la clairière…',W/2,310,30,'#ccc');
  txt('Record : '+(G.rec.sp?G.rec.sp.toFixed(1)+' s':'—'),W/2,400,28,'#ffd700');
  txt('Touche l\'écran ou R pour revenir au menu',W/2,620,24,'#fff');
}
function drawGame(){if(G.mode==='race')drawRace();else if(G.mode==='spider')drawSpiderGame();else drawMatch()}
function drawMatch(){
  const {p,r,s,ch,d}=G;const me=G.me==='r'?r:p,cap=G.me==='r'?'Dash':ch.cap;
  bg(p.x,p.y);
  g.save();
  for(let i=0;i<G.trail.length;i++){g.globalAlpha=i/G.trail.length*.5;g.fillStyle='#ffd700';
    g.beginPath();g.arc(G.trail[i].x,G.trail[i].y,i/G.trail.length*9,0,7);g.fill()}
  g.restore();
  for(const b of G.bl){g.beginPath();g.arc(b.x,b.y,18,0,7);g.fillStyle='#222';g.fill();g.strokeStyle='#e33';g.lineWidth=3;g.stroke()}
  for(const o of[p,r]){
    const im=o===p?A[ch.id]:A.drago,fl=o.face*(o===p?ch.nat:1)<0;
    if(o.boost>0||o.dash>0){g.fillStyle='rgba(255,215,0,.25)';g.beginPath();g.arc(o.x-o.face*30,o.y,o.h*.4,0,7);g.fill()}
    spr(im,o.x,o.y,o.h,fl,o.stun>0?.5+.4*Math.sin(G.el*30):1);
    if(o.shield>0){g.beginPath();g.arc(o.x,o.y,o.h*.7,0,7);g.strokeStyle='rgba(120,200,255,.9)';g.lineWidth=5;g.stroke();g.fillStyle='rgba(120,200,255,.2)';g.fill()}
    if(o.stun>0)txt('★ ★ ★',o.x,o.y-o.h*.6,22,'#ffd700')}
  g.save();g.shadowColor='#ffd700';g.shadowBlur=22;
  spr(A.vif,s.x,s.y,50,false,s.fade>0?.4+.3*Math.sin(G.el*40):1,1+.15*Math.sin(G.el*45));g.restore();
  for(const q of G.parts){g.globalAlpha=Math.max(0,q.l);g.fillStyle='#ffe96a';g.fillRect(q.x,q.y,4,4)}
  g.globalAlpha=1;
  if(G.frz>0){g.fillStyle='rgba(120,200,255,.12)';g.fillRect(0,0,W,H);g.strokeStyle='rgba(170,230,255,.95)';g.lineWidth=4;
    for(const t of[{x:r.x,y:r.y,q:r.h*.5},...G.bl.map(b=>({x:b.x,y:b.y,q:26}))]){g.beginPath();g.arc(t.x,t.y,t.q,0,7);g.stroke()}
    txt('PETRIFICUS TOTALUS !',W/2,130,44,'#9fe0ff')}
  if(net.role)txt('▼',me.x,me.y-me.h*.62,22,'#fff');
  txt(`${ch.nom}: ${p.score}`,30,45,32,'#ffd700','left');
  txt(`Drago: ${r.score}`,W-30,45,32,'#ff5050','right');
  txt(`${Math.ceil(G.t)} s`,W/2,45,36,'#fff');
  rbox(pauseR,'rgba(0,0,0,.5)');txt('II',pauseR.x+Z/2,pauseR.y+Z/2,Z/2,'#fff');
  rbox(muteR,'rgba(0,0,0,.5)');txt(muted?'🔇':'🔊',muteR.x+Z/2,muteR.y+Z/2,Z/2,'#fff');
  if(!COARSE){g.beginPath();g.arc(abP.x,abP.y,abP.r,0,7);g.fillStyle=me.cd>0?'rgba(60,60,80,.7)':'rgba(255,215,0,.85)';g.fill();
  txt(me.cd>0?Math.ceil(me.cd):cap,abP.x,abP.y,me.cd>0?30:18,me.cd>0?'#fff':'#0a0a14')}
  if(state==='count')txt(G.cnt>.99?Math.ceil(G.cnt-.99)+'':'GO !',W/2,H/2,140,'#ffd700');
  if(state==='pause'){g.fillStyle='rgba(0,0,0,.6)';g.fillRect(0,0,W,H);
    txt('PAUSE',W/2,300,80,'#ffd700');txt('Touche / P pour reprendre • R pour le menu',W/2,400,26,'#fff')}
}
function drawResult(){if(G.mode==='race')return drawRaceResult();if(G.mode==='spider')return drawSpiderResult();
  const {p,r}=G;bg(W/2,H/2,.7);
  const v=G.me==='r'?r.score>p.score:p.score>r.score,e=p.score===r.score;
  txt(e?'ÉGALITÉ':v?'VICTOIRE !':'DÉFAITE',W/2,110,80,e?'#fff':v?'#50ff78':'#ff5050');
  txt(`${G.ch.nom} ${p.score} - ${r.score} Drago  (${G.d.n})`,W/2,200,38,'#fff');
  txt('Derniers matchs',W/2,285,26,'#ffd700');
  hist().slice(-5).reverse().forEach((h,i)=>txt(`${h.j||h.n} ${h.p} - ${h.r} Drago (${h.dn})`,W/2,330+i*38,24,'#ddd'));
  txt('Meilleur score : '+best(),W/2,560,26,'#80ff78');
  txt('Touche l\'écran ou appuie sur R pour revenir au menu',W/2,650,24,'#fff');
}
function draw(){
  g.clearRect(0,0,W,H);
  if(!A.fond){g.fillStyle='#0a0a14';g.fillRect(0,0,W,H);txt('Chargement…',W/2,H/2,40,'#ffd700');return}
  if(state==='menu')drawMenu();else if(state==='result')drawResult();else if(state==='lobby')drawLobby();else if(state==='rmenu')drawRMenu();else if(state==='qmenu')drawQMenu();else if(state==='smenu')drawSMenu();else if(state==='board')drawBoard();else drawGame();
}
function loop(t){
  const dt=Math.min(.05,(t-last)/1000||0);last=t;
  if(net.role==='guest'){if(G&&!MENUS.includes(state))guestTick(dt)}
  else if(state==='count'||state==='play'){update(dt);if(net.role==='host')netTick(dt)}
  if(state==='result')G.endT+=dt;
  draw();updateUI();requestAnimationFrame(loop);
}

/* ---------- entrées ---------- */
const pos=e=>{const b=cv.getBoundingClientRect();return{x:(e.clientX-b.left)*W/b.width,y:(e.clientY-b.top)*H/b.height}};
function pause(){if(net.role)return;if(state==='play'||state==='count'){G.prev=state;state='pause'}else if(state==='pause')state=G.prev}
cv.addEventListener('pointerdown',e=>{
  e.preventDefault();startMusic();const m=pos(e);
  if(state==='menu'){
    if(hit(homeR(0),m))state='qmenu';
    else if(hit(homeR(1),m))state='rmenu';
    else if(hit(homeR(2),m))state='smenu';
    else if(COARSE&&hit(swapR,m))setSwap(!swap);
    else if(hit(nameR,m))askName();
    else if(hit(boardR,m)){btab=0;state='board'}
  }else if(state==='qmenu'){qmenuClick(m)}
  else if(state==='smenu'){smenuClick(m)}
  else if(state==='rmenu'){rmenuClick(m)}
  else if(state==='board'){boardClick(m)}
  else if(state==='lobby'){lobbyClick(m)}
  else if(state==='result'){if(G.endT>.6)backToMenu()}
  else if(state==='pause')pause();
  else{
    if(hit(pauseR,m))pause();
    else if(hit(muteR,m))setMute(!muted);
    else if(!COARSE&&Math.hypot(m.x-abP.x,m.y-abP.y)<abP.r)ability();
    else if(!COARSE)touch=m;
  }});
cv.addEventListener('pointermove',e=>{if(touch)touch=pos(e)});
for(const ev of['pointerup','pointercancel'])addEventListener(ev,()=>touch=null);
addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();keys[k]=true;startMusic();
  if(k===' '){e.preventDefault();if(G&&state==='play')ability()}
  if(k==='escape'||k==='p')pause();
  if(k==='m')setMute(!muted);
  if(k==='r'&&(state==='pause'||state==='result'))backToMenu();
  if(k.startsWith('arrow'))e.preventDefault();
});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;if(state==='play')pause()});
/* ---------- commandes tactiles (paysage) ---------- */
const joy={x:0,y:0,on:false};
function updateUI(){
  const ig=!!G&&(state==='count'||state==='play'||state==='pause');
  document.body.classList.toggle('ig',ig);if(!ig)return;
  const me=G.me==='r'?G.r:G.p,t=me.cd>0?String(Math.ceil(me.cd)):(G.me==='r'?'Dash':G.ch.cap),l=document.getElementById('pwl');
  if(l.textContent!==t)l.textContent=t;document.getElementById('pw').classList.toggle('cd',me.cd>0);
}
(function(){
  const j=document.getElementById('joy'),kn=document.getElementById('knob'),pw=document.getElementById('pw');
  const mv=e=>{const b=j.getBoundingClientRect(),R=b.width/2;let dx=e.clientX-(b.left+R),dy=e.clientY-(b.top+R);
    const l=Math.hypot(dx,dy);if(l>R){dx*=R/l;dy*=R/l}kn.style.transform=`translate(${dx}px,${dy}px)`;
    const u=Math.hypot(dx,dy)/R;joy.x=u<.15?0:dx/R;joy.y=u<.15?0:dy/R;joy.on=true};
  const up=()=>{joy.on=false;joy.x=joy.y=0;kn.style.transform=''};
  j.addEventListener('pointerdown',e=>{e.preventDefault();j.setPointerCapture(e.pointerId);startMusic();mv(e)});
  j.addEventListener('pointermove',e=>{if(joy.on)mv(e)});
  j.addEventListener('pointerup',up);j.addEventListener('pointercancel',up);
  pw.addEventListener('pointerdown',e=>{e.preventDefault();startMusic();ability()});
})();
setSwap(swap);
boot();
