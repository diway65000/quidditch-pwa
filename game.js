'use strict';
const cv=document.getElementById('c'),g=cv.getContext('2d'),W=1280,H=720;
const A={},keys={};
const FILES={fond:'stade.png',vif:'vif_or.png',harry:'harry.png',drago:'drago.png',hermione:'hermione.png',elise:'elise.png'};
const CH=[
 {id:'harry',nom:'Harry',vit:8,h:90,cap:'Turbo',desc:'Vitesse x1.6 (2 s)',nat:1},
 {id:'hermione',nom:'Hermione',vit:7,h:90,cap:'Bouclier',desc:'Immunité cognards (3 s)',nat:1},
 {id:'elise',nom:'Elise',vit:9,h:130,cap:'Petrificus',desc:'Fige tout sauf toi (3 s)',nat:1}];
const DIF=[{n:'Facile',v:4.2,err:170,bl:2,sn:.8},{n:'Normal',v:5.6,err:90,bl:2,sn:1},{n:'Difficile',v:7,err:35,bl:3,sn:1.2}];
let diff=1,state='menu',G=null,last=0,muted=false,musicOn=false,touch=null,music,S={};
const rand=(a,b)=>a+Math.random()*(b-a),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const hit=(r,p)=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;
const cardR=i=>({x:(W-3*220-60)/2+i*250,y:200,w:220,h:290});
const difR=i=>({x:W/2-255+i*175,y:540,w:160,h:50});
const COARSE=matchMedia('(pointer:coarse)').matches,Z=COARSE?72:50;
const pauseR={x:W/2+120,y:14,w:Z,h:Z},muteR={x:W/2+130+Z,y:14,w:Z,h:Z},abP={x:W-110,y:H-110,r:55};
const crR={x:W/2-150,y:280,w:300,h:60},joR={x:W/2-150,y:370,w:300,h:60},backR={x:W/2-100,y:640,w:200,h:50},onR={x:W/2-190,y:600,w:380,h:50};
const net={role:null,conn:null,peer:null,code:'',msg:'',ready:false,inp:{ax:0,ay:0},acc:0};

/* ---------- chargement ---------- */
const loadImg=u=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(i);i.src='assets/'+u});
async function aud(u){const b=await(await fetch('assets/'+u)).blob();return new Audio(URL.createObjectURL(b))}
async function boot(){
  draw();
  for(const k in FILES)A[k]=await loadImg(FILES[k]);
  try{music=await aud('musique_fond.mp3');music.loop=true;music.volume=.4;
      S.attrape=await aud('attrape.wav');S.collision=await aud('collision.wav')}catch(e){}
  requestAnimationFrame(loop);
}
const sfx=n=>{if(muted||!S[n])return;const a=S[n].cloneNode();a.volume=.8;a.play().catch(()=>{})};
function setMute(m){muted=m;if(music)music.muted=m}
function startMusic(){if(!musicOn&&music){musicOn=true;music.play().catch(()=>musicOn=false)}}

/* ---------- scores ---------- */
const hist=()=>{try{return JSON.parse(localStorage.getItem('quid_hist'))||[]}catch(e){return[]}};
function saveScore(e){try{const h=hist();h.push(e);localStorage.setItem('quid_hist',JSON.stringify(h.slice(-30)))}catch(e){}}
const best=()=>hist().reduce((m,e)=>Math.max(m,e.p),0);

/* ---------- partie ---------- */
function newGame(ch){
  const d=DIF[diff];
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
function useAb(o,id){if(o.cd>0)return;o.cd=6;if(id==='harry')o.boost=2;else if(id==='hermione')o.shield=3;else if(id==='elise'){G.frz=3;o.cd=10}else o.dash=.25}
function burst(x,y){for(let i=0;i<30;i++){const a=rand(0,6.28),v=rand(2,9);G.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:rand(.4,.9)})}}
function respawn(){
  const s=G.s;s.x=Math.random()<.5?60:W-60;s.y=rand(80,H-80);
  s.ang=Math.atan2(H/2-s.y,W/2-s.x);s.fade=.9;G.trail=[];
}
function endGame(){
  const {p,r,ch,d}=G;
  saveScore({n:ch.nom,dn:d.n,p:p.score,r:r.score});
  state='result';G.endT=0;if(net.role==='host')sendSnap();
}

function update(dt){
  const k=dt*60,{p,r,s,d}=G;
  if(state==='count'){G.cnt-=dt;if(G.cnt<=0){state='play'}return}
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
  const ss=(5+G.el*.04)*d.sn*(s.fade>0?.5:1)*(fz?0:1);
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
function fail(m){if(!net.role)return;leave();net.msg=m;state='menu'}
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
  if(hit(backR,m)){leave();state='menu';return}
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

function drawMenu(){
  bg(W/2,H/2,.6);
  txt('QUIDDITCH CHAMPIONSHIP',W/2,90,60,'#ffd700');
  txt('Harry vs Drago — attrape le Vif d\'or !',W/2,150,26,'#fff');
  CH.forEach((c,i)=>{const r=cardR(i);rbox(r,'rgba(30,30,55,.9)','#ffd700');
    spr(A[c.id],r.x+110,r.y+95,c.h>100?150:110,false);
    txt(c.nom,r.x+110,r.y+190,30,'#fff');
    txt(c.cap,r.x+110,r.y+226,22,'#ffd700');
    txt(c.desc,r.x+110,r.y+256,15,'#ccc')});
  txt('Difficulté',W/2,515,24,'#fff');
  DIF.forEach((d,i)=>{const r=difR(i);rbox(r,i===diff?'#ffd700':'#32324a');txt(d.n,r.x+80,r.y+26,24,i===diff?'#0a0a14':'#fff')});
  txt('Meilleur score : '+best(),30,40,22,'#80ff78','left');rbox(onR,'#2a5cff');txt('Jouer en ligne (2 téléphones)',W/2,onR.y+25,24,'#fff');if(net.msg)txt(net.msg,W/2,185,24,'#ff8080');
  txt('Flèches / ZQSD ou toucher pour bouger • Espace = pouvoir • P = pause • M = muet',W/2,675,18,'#aaa');
}
function drawGame(){
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
    for(const t of[{x:r.x,y:r.y,q:r.h*.5},{x:s.x,y:s.y,q:30},...G.bl.map(b=>({x:b.x,y:b.y,q:26}))]){g.beginPath();g.arc(t.x,t.y,t.q,0,7);g.stroke()}
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
function drawResult(){
  const {p,r}=G;bg(W/2,H/2,.7);
  const v=G.me==='r'?r.score>p.score:p.score>r.score,e=p.score===r.score;
  txt(e?'ÉGALITÉ':v?'VICTOIRE !':'DÉFAITE',W/2,110,80,e?'#fff':v?'#50ff78':'#ff5050');
  txt(`${G.ch.nom} ${p.score} - ${r.score} Drago  (${G.d.n})`,W/2,200,38,'#fff');
  txt('Derniers matchs',W/2,285,26,'#ffd700');
  hist().slice(-5).reverse().forEach((h,i)=>txt(`${h.n} ${h.p} - ${h.r} Drago (${h.dn})`,W/2,330+i*38,24,'#ddd'));
  txt('Meilleur score : '+best(),W/2,560,26,'#80ff78');
  txt('Touche l\'écran ou appuie sur R pour revenir au menu',W/2,650,24,'#fff');
}
function draw(){
  g.clearRect(0,0,W,H);
  if(!A.fond){g.fillStyle='#0a0a14';g.fillRect(0,0,W,H);txt('Chargement…',W/2,H/2,40,'#ffd700');return}
  if(state==='menu')drawMenu();else if(state==='result')drawResult();else if(state==='lobby')drawLobby();else drawGame();
}
function loop(t){
  const dt=Math.min(.05,(t-last)/1000||0);last=t;
  if(net.role==='guest'){if(G&&state!=='lobby'&&state!=='menu')guestTick(dt)}
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
    DIF.forEach((_,i)=>{if(hit(difR(i),m))diff=i});
    CH.forEach((c,i)=>{if(hit(cardR(i),m))newGame(c)});
    if(hit(onR,m)){net.msg='';state='lobby'}
  }else if(state==='lobby'){lobbyClick(m)}
  else if(state==='result'){if(G.endT>.6){leave();state='menu'}}
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
  if(k==='r'&&(state==='pause'||state==='result')){leave();state='menu'}
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
boot();
