/* Mini-outils — service worker : rend l'application installable et utilisable hors ligne.

   Stratégie :
   - fichiers de l'application : le réseau d'abord (on a toujours la dernière version
     quand on est connecté), la copie en cache si le réseau ne répond pas ;
   - polices Google : le cache d'abord, elles ne changent pas.

   Quand un outil est ajouté, ajouter sa page à FICHIERS et augmenter VERSION. */
const VERSION = "mini-outils-v2";
const FICHIERS = [
  "./",
  "index.html",
  "fnp.html",
  "abo-mensuel.html",
  "rem-gerance.html",
  "extournes.html",
  "import-banque.html",
  "commun.css",
  "commun.js",
  "manifest.webmanifest",
  "icones/icone-192.png",
  "icones/icone-512.png"
];
const POLICES = ["https://fonts.googleapis.com", "https://fonts.gstatic.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(noms.filter((n) => n !== VERSION).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (POLICES.includes(url.origin)) {
    e.respondWith(
      caches.match(req).then((enCache) => enCache || fetch(req).then((rep) => {
        const copie = rep.clone();
        caches.open(VERSION).then((c) => c.put(req, copie));
        return rep;
      }))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then((rep) => {
        if (rep.ok) {
          const copie = rep.clone();
          caches.open(VERSION).then((c) => c.put(req, copie));
        }
        return rep;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then((enCache) => enCache || (req.mode === "navigate" ? caches.match("fnp.html") : Response.error())))
  );
});
