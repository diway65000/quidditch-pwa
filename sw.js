const C='quidditch-v10';
const F=['./','index.html','game.js','peerjs.min.js','manifest.json',...['stade.png','vif_or.png','harry.png','drago.png','hermione.png','elise.png','foret.jpg','tribune.jpg','musique_magie.mp3','attrape.wav','collision.wav','icon-192.png','icon-512.png'].map(f=>'assets/'+f)];
// Précharge tolérante : un fichier manquant n'empêche plus l'installation
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>Promise.all(F.map(f=>c.add(f).catch(()=>{})))));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
// Réseau d'abord (toujours la dernière version), cache en secours hors ligne
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||!e.request.url.startsWith(self.location.origin))return;
  e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r=>{
    if(r.ok){const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp))}
    return r;
  }).catch(()=>caches.match(e.request,{ignoreSearch:true})));
});
