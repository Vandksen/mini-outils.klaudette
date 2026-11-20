/* Mini-outils — service worker : rend l'application installable et utilisable hors ligne.

   Stratégie :
   - fichiers de l'application : le réseau d'abord, en revalidant auprès du serveur
     (cache: "no-cache") pour ne pas resservir la copie que le navigateur garde
     10 minutes ; la copie en cache si le réseau ne répond pas.
     Ajouter un paramètre à l'adresse ne contourne pas le réseau de diffusion de GitHub
     Pages, qui l'ignore : c'est commun.js qui attend la fin d'un déploiement avant de
     recharger une page (voir verifieVersion).
   Les polices sont des fichiers du site comme les autres : rien n'est demandé à un tiers.

   Quand un outil est ajouté, ajouter sa page à FICHIERS et augmenter VERSION. */
const VERSION = "mini-outils-v28";
const FICHIERS = [
  "./",
  "index.html",
  "manifeste.html",
  "fnp.html",
  "abo-mensuel.html",
  "rem-gerance.html",
  "indemnites-km.html",
  "avantage-nature.html",
  "tva-avantages-nature.html",
  "tva-annee.html",
  "forfait-blanchisserie.html",
  "decomposition-immeuble.html",
  "csg-crds.html",
  "plafond-vehicule.html",
  "medecins-secteur1.html",
  "revenu-brut-social.html",
  "extournes.html",
  "import-banque.html",
  "controle-coherence.html",
  "dates-week-end.html",
  "etalement.html",
  "etalement-donnees.js",
  "pcg.html",
  "pcg-donnees.js",
  "questions-clients.html",
  "questions-donnees.js",
  "mentions-legales.html",
  "versions.html",
  "logiciels-compatibles.html",
  "commun.css",
  "commun.js",
  "pdf.js",
  "manifest.webmanifest",
  "icones/icone-m-192.png",
  "icones/icone-m-512.png",
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
          const copie = rep.clone(), sansParametre = url.search ? rep.clone() : null;
          caches.open(VERSION).then((c) => {
            c.put(req, copie);
            // Un fichier demandé avec « ?v=… » remplace aussi sa copie sans paramètre,
            // pour que le hors-ligne ne ressorte pas un exemplaire plus ancien.
            if (sansParametre) c.put(url.origin + url.pathname, sansParametre);
          });
        }
        return rep;
      })
      // Hors ligne : la copie exacte d'abord, sinon celle du même fichier sans paramètre.
      .catch(() => caches.match(req)
        .then((exacte) => exacte || caches.match(url.origin + url.pathname))
        .then((enCache) => enCache || caches.match(req, { ignoreSearch: true }))
        .then((enCache) => enCache || (req.mode === "navigate" ? caches.match("fnp.html") : Response.error())))
  );
});
