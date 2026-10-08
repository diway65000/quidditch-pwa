const C='quidditch-v5';
const F=['./','index.html','game.js','peerjs.min.js','manifest.json',...['stade.png','vif_or.png','harry.png','drago.png','hermione.png','elise.png','musique_fond.mp3','attrape.wav','collision.wav','icon-192.png','icon-512.png'].map(f=>'assets/'+f)];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request)))});
