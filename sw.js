/* Mini-outils — service worker : rend l'application installable et utilisable hors ligne.

   Stratégie :
   - fichiers de l'application : le réseau d'abord, en revalidant auprès du serveur
     (cache: "no-cache") pour ne pas resservir la copie que le navigateur garde
     10 minutes ; la copie en cache si le réseau ne répond pas.
   Les polices sont des fichiers du site comme les autres : rien n'est demandé à un tiers.

   Quand un outil est ajouté, ajouter sa page à FICHIERS et augmenter VERSION. */
const VERSION = "mini-outils-v12";
const FICHIERS = [
  "./",
  "index.html",
  "manifeste.html",
  "fnp.html",
  "abo-mensuel.html",
  "rem-gerance.html",
  "extournes.html",
  "import-banque.html",
  "etalement.html",
  "etalement-donnees.js",
  "pcg.html",
  "pcg-donnees.js",
  "mentions-legales.html",
  "versions.html",
  "logiciels-compatibles.html",
  "commun.css",
  "commun.js",
  "manifest.webmanifest",
  "icones/icone-192.png",
  "icones/icone-512.png",
  "icones/structurre.svg",
  "images/fond-tempete.jpg",
  "polices/instrument-serif-italique-latin-ext.woff2",
  "polices/instrument-serif-italique-latin.woff2",
  "polices/instrument-serif-latin-ext.woff2",
  "polices/instrument-serif-latin.woff2",
  "polices/inter-tight-latin-ext.woff2",
  "polices/inter-tight-latin.woff2",
  "polices/jetbrains-mono-latin-ext.woff2",
  "polices/jetbrains-mono-latin.woff2"
];
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

  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req.url, { cache: "no-cache" })
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
