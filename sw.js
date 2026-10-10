const C='quidditch-v11';
const F=['./','index.html','game.js','peerjs.min.js','manifest.json',...['stade.jpg','vif_or.png','harry.png','drago.png','hermione.png','elise.png','foret.jpg','tribune.jpg','musique_magie.mp3','attrape.mp3','collision.wav','icon-192.png','icon-512.png'].map(f=>'assets/'+f)];
// Précharge tolérante : un fichier manquant n'empêche plus l'installation
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>Promise.all(F.map(f=>c.add(f).catch(()=>{})))));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
// Images et sons (dossier assets/) : cache d'abord = démarrage quasi instantané après la 1re visite.
// Code (html/js/json) : réseau d'abord = toujours la dernière version.
// Quand tu changes une image ou un son, incrémente le numéro de version du cache (C) ci-dessus.
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==self.location.origin)return;
  const put=r=>{if(r.ok){const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp))}return r};
  if(u.pathname.includes('/assets/')){
    e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request).then(put)));
    return;
  }
  e.respondWith(fetch(e.request,{cache:'no-cache'}).then(put).catch(()=>caches.match(e.request,{ignoreSearch:true})));
});
