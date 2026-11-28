/* Mini-outils — service worker : rend l'application installable et utilisable hors ligne.

   Stratégie :
   - pages HTML et version.json : le réseau d'abord, en revalidant auprès du serveur
     (cache: "no-cache") pour ne pas resservir la copie que le navigateur garde
     10 minutes ; la copie en cache si le réseau ne répond pas.
   - styles, scripts, polices, images et données : le cache d'abord, la copie gardée est
     servie aussitôt et le serveur consulté en arrière-plan (la page suivante a la
     nouvelle). Juste après une publication, une page peut donc avoir un ancien style :
     verifieVersion (commun.js) la recharge alors avec tous les fichiers redemandés
     au serveur (rechargeFrais, en cache: "reload", qui passe par le réseau ici).
     Ajouter un paramètre à l'adresse ne contourne pas le réseau de diffusion de GitHub
     Pages, qui l'ignore : c'est commun.js qui attend la fin d'un déploiement avant de
     recharger une page (voir verifieVersion).
   Les polices sont des fichiers du site comme les autres : rien n'est demandé à un tiers.
   Seules leurs versions « latin » sont préchargées : les « latin-ext » (lettres d'Europe
   centrale, Ł, ő…) ne servent presque jamais et se mettent en cache si une page en a besoin.

   Les bibliothèques de lecture des documents (vendor/, environ 7 Mo) ne sont pas
   préchargées : elles sont mises en cache au premier dépôt d'un document, comme tout
   fichier du site demandé.

   Quand un outil est ajouté, ajouter sa page à FICHIERS et augmenter VERSION. */
const VERSION = "mini-outils-v70";
const FICHIERS = [
  "./",
  "index.html",
  "manifeste.html",
  "fnp.html",
  "abo-mensuel.html",
  "loyer-bureau.html",
  "loyers-communes-exemple.js",
  "rem-gerance.html",
  "combinaisons.html",
  "remuneration-dividendes.html",
  "indemnites-km.html",
  "avantage-nature.html",
  "tva-avantages-nature.html",
  "tva-annee.html",
  "interets-courus.html",
  "donnees-mensuelles.js",
  "decomposition-immeuble.html",
  "plafond-vehicule.html",
  "medecins-secteur1.html",
  "revenu-brut-social.html",
  "revalorisation-loyer.html",
  "extournes.html",
  "import-banque.html",
  "mini-scanner.html",
  "controle-coherence.html",
  "dates-week-end.html",
  "analyse-achats.html",
  "etalement.html",
  "etalement-donnees.js",
  "pcg.html",
  "pcg-donnees.js",
  "questions-clients.html",
  "taux-interets.html",
  "ventes-immobilieres.html",
  "questions-donnees.js",
  "mentions-legales.html",
  "versions.html",
  "logiciels-compatibles.html",
  "goodies.html",
  "commun.css",
  "commun.js",
  "consentement.css",
  "consentement.js",
  "pdf.js",
  "lecteur.js",
  "manifest.webmanifest",
  "icones/icone-m-192.png",
  "icones/icone-m-512.png",
  "icones/structurre.svg",
  "images/fond-tempete.webp",
  "polices/instrument-serif-italique-latin.woff2",
  "polices/instrument-serif-latin.woff2",
  "polices/inter-tight-latin.woff2",
  "polices/jetbrains-mono-latin.woff2",
  "polices/space-mono-italique-latin.woff2"
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

  // Réseau d'abord : les pages, version.json (qui annonce les mises à jour) et toute demande
  // qui exige le serveur (cache "reload", "no-store" ou "no-cache" : rechargeFrais de commun.js).
  const reseauDabord = req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/version.json") ||
                       req.cache === "reload" || req.cache === "no-store" || req.cache === "no-cache";
  if (reseauDabord) { e.respondWith(reseau(req, url)); return; }

  // Cache d'abord pour le reste (styles, scripts, polices, images, données) : la copie gardée
  // est servie aussitôt, et le serveur est consulté en arrière-plan pour la page suivante.
  // Sans copie exacte (fichier jamais vu, ou « ?v=… » d'une nouvelle version) : le réseau.
  e.respondWith(
    caches.match(req).then((enCache) => {
      if (!enCache) return reseau(req, url);
      e.waitUntil(telecharge(req, url).catch(() => {}));
      return enCache;
    })
  );
});

// Télécharge le fichier en revalidant auprès du serveur (cache: "no-cache"), pour ne pas
// reprendre la copie que le navigateur garde 10 minutes, et range une copie dans le cache.
// La réponse n'est rendue qu'une fois la copie rangée : après rechargeFrais, la page
// rechargée trouve ainsi les nouveaux fichiers dans le cache, et non les anciens.
function telecharge(req, url) {
  return fetch(req.url, { cache: "no-cache" }).then((rep) => {
    if (!rep.ok) return rep;
    const copie = rep.clone(), sansParametre = url.search ? rep.clone() : null;
    return caches.open(VERSION).then((c) => Promise.all([
      c.put(req, copie),
      // Un fichier demandé avec « ?v=… » remplace aussi sa copie sans paramètre,
      // pour que le hors-ligne ne ressorte pas un exemplaire plus ancien.
      sansParametre ? c.put(url.origin + url.pathname, sansParametre) : null
    ])).then(() => rep, () => rep);
  });
}

// Réseau, puis hors ligne : la copie exacte d'abord, sinon celle du même fichier sans paramètre.
function reseau(req, url) {
  return telecharge(req, url)
    .catch(() => caches.match(req)
      .then((exacte) => exacte || caches.match(url.origin + url.pathname))
      .then((enCache) => enCache || caches.match(req, { ignoreSearch: true }))
      .then((enCache) => enCache || (req.mode === "navigate" ? caches.match("fnp.html") : Response.error())));
}
