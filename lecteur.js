/* Mini-outils — lecture d'une carte grise déposée (PDF, scan ou photo) pour préremplir un outil.

   Tout se passe dans le navigateur : le fichier n'est envoyé nulle part.
   - PDF qui contient du texte : texte lu avec pdf.js (vendor/pdfjs).
   - PDF scanné ou photo : reconnaissance de caractères avec Tesseract en WebAssembly
     (vendor/tesseract), en français.
   Les bibliothèques sont des fichiers du site, chargés au premier dépôt seulement
   (environ 1,7 Mo pour pdf.js, 5 Mo de plus pour la reconnaissance de caractères), puis
   gardés en cache par le service worker pour le hors-ligne.

   Usage (page mini-scanner.html) :
     MiniLecteur.lireDocument(fichier, function (etat) { … }).then(function (doc) {
       var cg = MiniLecteur.carteGrise(doc);
     });
   doc.texte : tout le texte ; doc.lignes : ses lignes ; doc.ocr : true si lu par OCR. */
window.MiniLecteur = (function () {
  "use strict";
  var M = window.MiniOutils, $ = M.$;
  // Racine du site : lecteur.js y est rangé.
  var RACINE = new URL(".", (document.currentScript && document.currentScript.src) || location.href).href;
  // Un PDF qui contient du texte est lu en entier : pdf.js en lit des dizaines de pages en
  // une ou deux secondes. PAGES_MAX n'est qu'un garde-fou contre un dépôt par erreur.
  // Une page scannée prend plusieurs secondes de reconnaissance de caractères : au plus
  // PAGES_OCR_MAX pages scannées sont reconnues, et la lecture s'arrête plus tôt quand
  // les données cherchées sont trouvées (option « assez » de lireDocument).
  var PAGES_MAX = 100;
  var PAGES_OCR_MAX = 10;
  var ARRET = { arret: true };   // rejet interne quand l'utilisateur arrête la lecture

  // ---------- Chargement des bibliothèques ----------
  var pdfjs = null, ocr = null, suivi = null;
  function chargePdf() {
    if (!pdfjs) {
      pdfjs = import(RACINE + "vendor/pdfjs/pdf.min.js").then(function (m) {
        m.GlobalWorkerOptions.workerSrc = RACINE + "vendor/pdfjs/pdf.worker.min.js";
        return m;
      });
      pdfjs.catch(function () { pdfjs = null; });
    }
    return pdfjs;
  }
  function chargeScript(src) {
    return new Promise(function (ok, ko) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = ok;
      s.onerror = function () { ko(new Error("Chargement impossible : " + src)); };
      document.head.appendChild(s);
    });
  }
  function chargeOcr() {
    if (!ocr) {
      ocr = (window.Tesseract ? Promise.resolve() : chargeScript(RACINE + "vendor/tesseract/tesseract.min.js")).then(function () {
        // Chemins complets : sans eux, Tesseract irait chercher ses fichiers sur un CDN.
        return window.Tesseract.createWorker("fra", 1, {
          workerPath: RACINE + "vendor/tesseract/worker.min.js",
          corePath: RACINE + "vendor/tesseract/core",
          langPath: RACINE + "vendor/tesseract/lang",
          workerBlobURL: false,
          gzip: true,
          logger: function (m) { if (suivi) suivi(m); }
        });
      });
      ocr.catch(function () { ocr = null; });
    }
    return ocr;
  }

  // ---------- Lecture ----------
  // Texte d'une page de PDF, remis en lignes : les morceaux de même hauteur forment une
  // ligne, de gauche à droite ; un grand écart entre deux morceaux devient deux espaces.
  function lignesPage(contenu) {
    var morceaux = contenu.items.filter(function (it) { return it.str && it.str.trim(); }).map(function (it) {
      return { x: it.transform[4], y: it.transform[5], l: it.width || 0, h: Math.abs(it.transform[3]) || 10, t: it.str };
    });
    morceaux.sort(function (a, b) { return b.y - a.y || a.x - b.x; });
    var lignes = [];
    morceaux.forEach(function (m) {
      var l = lignes[lignes.length - 1];
      if (l && Math.abs(l.y - m.y) <= Math.max(2, m.h * 0.45)) l.m.push(m);
      else lignes.push({ y: m.y, m: [m] });
    });
    return lignes.map(function (l) {
      l.m.sort(function (a, b) { return a.x - b.x; });
      var txt = "", fin = null;
      l.m.forEach(function (m) {
        if (fin !== null) {
          var ecart = m.x - fin;
          if (ecart > m.h * 1.5) txt += "  ";
          else if (ecart > m.h * 0.15 && !/\s$/.test(txt) && !/^\s/.test(m.t)) txt += " ";
        }
        txt += m.t;
        fin = m.x + m.l;
      });
      return txt.replace(/\s+$/, "");
    });
  }

  function etat(z, texte) { if (z) z(texte); }

  // Lecture d'un PDF, page après page. ctl : { arrete, signal } pour l'arrêt demandé par
  // l'utilisateur ; assez(lignes) : true quand les données cherchées sont trouvées.
  function lirePdf(fichier, z, ctl, assez) {
    etat(z, "Ouverture du PDF…");
    return Promise.all([chargePdf(), fichier.arrayBuffer()]).then(function (r) {
      var lib = r[0];
      // isEvalSupported à false : aucun code tiré du document n'est exécuté.
      return lib.getDocument({ data: new Uint8Array(r[1]), isEvalSupported: false, disableFontFace: true }).promise;
    }).then(function (pdf) {
      var n = Math.min(pdf.numPages, PAGES_MAX);
      var lu = { pages: [], total: pdf.numPages, reste: pdf.numPages - n, scannees: 0, scanneesNonLues: 0, suffisant: false, arretPage: 0 };
      var toutes = function () { return lu.pages.reduce(function (t, pg) { return t.concat(pg.lignes); }, []); };
      function page(k) {
        if (k > n) return Promise.resolve();
        if (ctl.arrete) { lu.arretPage = k; return Promise.resolve(); }
        lu.enCours = k;
        etat(z, "Lecture de la page " + k + " sur " + n + "…");
        return pdf.getPage(k).then(function (pg) {
          return pg.getTextContent().then(function (c) {
            var lignes = lignesPage(c);
            if (lignes.join("").replace(/\s/g, "").length >= 30) { lu.pages.push({ lignes: lignes, ocr: false }); return; }
            // Page sans texte : c'est un scan, la reconnaissance de caractères prend le
            // relais, sauf si les données sont déjà trouvées ou le plafond atteint.
            if (lu.suffisant || lu.scannees >= PAGES_OCR_MAX) { lu.scanneesNonLues++; return; }
            lu.scannees++;
            var vue = pg.getViewport({ scale: 2.5 });
            var toile = document.createElement("canvas");
            toile.width = Math.ceil(vue.width); toile.height = Math.ceil(vue.height);
            return pg.render({ canvasContext: toile.getContext("2d"), viewport: vue }).promise.then(function () {
              return reconnait(toile, z, ctl, "Page " + k + " sur " + n + " (page scannée " + lu.scannees + " sur " + PAGES_OCR_MAX + " au plus)");
            }).then(function (lignesOcr) {
              lu.pages.push({ lignes: lignesOcr, ocr: true });
              if (assez && assez(toutes())) lu.suffisant = true;
            });
          });
        }).then(function () { return page(k + 1); });
      }
      return page(1).catch(function (e) {
        if (e !== ARRET) throw e;
        lu.arretPage = lu.arretPage || lu.enCours;
      }).then(function () { return lu; });
    });
  }

  // Reconnaissance de caractères d'une image ou d'une page rendue. Un arrêt demandé pendant
  // la reconnaissance l'interrompt aussitôt : le moteur est arrêté, puis rechargé au besoin.
  function reconnait(image, z, ctl, quoi) {
    etat(z, ocr ? (quoi ? quoi + " — r" : "R") + "econnaissance du texte…" :
                  (quoi ? quoi + " — p" : "P") + "réparation de la reconnaissance de caractères (5 Mo au premier usage)…");
    suivi = function (m) {
      if (m.status === "recognizing text") etat(z, (quoi ? quoi + " — r" : "R") + "econnaissance du texte : " + Math.round(m.progress * 100) + " %");
      else if (/loading/.test(m.status)) etat(z, "Chargement de la reconnaissance de caractères : " + Math.round((m.progress || 0) * 100) + " %");
    };
    var travail = chargeOcr().then(function (w) { return w.recognize(image); });
    var arret = ctl.signal.then(function () {
      var moteur = ocr;
      ocr = null;
      if (moteur) moteur.then(function (w) { w.terminate(); }, function () {});
      throw ARRET;
    });
    arret.catch(function () {});   // un arrêt demandé après la fin de cette page n'est pas une erreur
    return Promise.race([travail, arret]).then(function (r) {
      suivi = null;
      return r.data.text.split(/\r?\n/).map(function (l) { return l.replace(/\s+$/, ""); }).filter(Boolean);
    }, function (e) { suivi = null; throw e; });
  }

  function lire(fichier, z, ctl, assez) {
    var pdf = fichier.type === "application/pdf" || /\.pdf$/i.test(fichier.name);
    if (pdf) return lirePdf(fichier, z, ctl, assez);
    if (/^image\//.test(fichier.type)) {
      return reconnait(fichier, z, ctl, "").then(function (lignes) {
        return { pages: [{ lignes: lignes, ocr: true }], total: 1, reste: 0, scannees: 1, scanneesNonLues: 0, suffisant: false, arretPage: 0 };
      }, function (e) { throw e === ARRET ? new Error("Lecture arrêtée.") : e; });
    }
    return Promise.reject(new Error("Format non pris en charge : déposez un PDF ou une image (JPEG, PNG)."));
  }

  // ---------- Aides pour les extracteurs ----------
  // Minuscules sans accents, pour comparer des mots.
  function simple(s) { return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  var MOIS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
  // Toutes les dates d'un texte, dans l'ordre : 15/03/2026, 15.03.2026, 15-03-26, 1er mars 2026.
  function dates(txt) {
    var res = [], s = simple(txt), r = /(\d{1,2})(?:er)?\s*([\/.\-])\s*(\d{1,2})\s*\2\s*(\d{4}|\d{2})\b|(\d{1,2})(?:er)?\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s+(\d{4})/g, m;
    while ((m = r.exec(s))) {
      var d = m[1] ? { j: +m[1], m: +m[3], a: +m[4] } : { j: +m[5], m: MOIS.indexOf(m[6]) + 1, a: +m[7] };
      if (d.a < 100) d.a += d.a > 60 ? 1900 : 2000;
      if (M.lireDate(M.dateFr(d))) res.push({ d: d, index: m.index, texte: m[0] });
    }
    return res;
  }
  function premiereDate(txt) { var d = dates(txt); return d.length ? d[0].d : null; }
  function iso(d) { return d.a + "-" + M.deux(d.m) + "-" + M.deux(d.j); }
  function jour(d) { return Math.round(Date.UTC(d.a, d.m - 1, d.j) / 86400000); }
  function extrait(ligne) { ligne = String(ligne).replace(/\s+/g, " ").trim(); return ligne.length > 90 ? ligne.slice(0, 87) + "…" : ligne; }

  // Lit un fichier. o : { etat: fonction qui reçoit l'avancement à afficher,
  //                        assez: fonction(doc partiel) -> true quand les données cherchées
  //                               sont trouvées : les pages scannées suivantes sont sautées }.
  // Rend une promesse de { nom, lignes, texte, ocr, total, reste, scannees, scanneesNonLues,
  // suffisant, arretPage } ; la promesse porte arreter(), qui interrompt la lecture et garde
  // les pages déjà lues (arretPage : première page non lue).
  function lireDocument(fichier, o) {
    if (typeof o === "function") o = { etat: o };
    o = o || {};
    var ctl = { arrete: false };
    ctl.signal = new Promise(function (r) { ctl.declenche = r; });
    var assez = o.assez && function (lignes) { return o.assez({ lignes: lignes, texte: lignes.join("\n") }); };
    var p = lire(fichier, o.etat, ctl, assez).then(function (lu) {
      var lignes = [], ocr = false;
      lu.pages.forEach(function (pg) { lignes = lignes.concat(pg.lignes); ocr = ocr || pg.ocr; });
      var doc = { nom: fichier.name, lignes: lignes, texte: lignes.join("\n"), ocr: ocr, total: lu.total, reste: lu.reste,
                  scannees: lu.scannees, scanneesNonLues: lu.scanneesNonLues, suffisant: lu.suffisant, arretPage: lu.arretPage };
      if (!doc.texte.replace(/\s/g, "")) throw new Error(lu.arretPage ? "Lecture arrêtée avant qu'un texte soit lu." : "Aucun texte lisible dans ce document.");
      return doc;
    });
    p.arreter = function () { if (!ctl.arrete) { ctl.arrete = true; ctl.declenche(); } };
    return p;
  }

  // ---------- Documents reconnus ----------
  // carteGrise(doc) rend les rubriques lues, chacune avec la ligne où elle a été trouvée
  // (pour l'afficher à côté de la valeur). La page choisit ensuite quels champs remplir.

  // Rubrique d'une carte grise (« V.7 », « D.1 », « B ») suivie de sa valeur. Les codes
  // sont tolérants aux erreurs courantes de la reconnaissance de caractères : point lu
  // comme virgule ou omis, parenthèse ou deux-points après le code.
  function rubrique(lignes, code, motif) {
    // La lettre I est souvent lue « | » ou « l » ; une rubrique à sous-numéro peut être
    // collée à sa valeur (« P3ES »).
    var p = code.split("."), lettre = p[0] === "I" ? "[I|l]" : p[0];
    var re = new RegExp("(?:^|[\\s(|\\[])" + lettre + (p[1] ? "\\s?[.,:·]?\\s?" + p[1] : "") + "\\s?[).:|\\]]*" + (p[1] ? "\\s*" : "\\s+") + motif);
    for (var i = 0; i < lignes.length; i++) {
      var m = re.exec(lignes[i]);
      if (m) return { valeur: m[1].trim(), ligne: lignes[i] };
    }
    return null;
  }
  var FIN_RUBRIQUE = "(?=\\s{2,}|\\s+[A-Z]\\s?[.,]\\s?\\d|$)";
  var ENERGIES = { ES: "essence", GO: "gazole", EL: "électrique", EE: "hybride rechargeable essence", EH: "hybride non rechargeable essence",
                   GE: "hybride rechargeable gazole", GH: "hybride non rechargeable gazole", GL: "GPL", GN: "gaz naturel", H2: "hydrogène", FE: "superéthanol E85" };

  function carteGrise(doc) {
    var L = doc.lignes, r = {};
    var a = rubrique(L, "A", "([A-Z]{2}\\s?-?\\s?\\d{3}\\s?-?\\s?[A-Z]{2})\\b");
    if (!a) {
      var g = /\b([A-HJ-NP-TV-Z]{2})[ -]?(\d{3})[ -]?([A-HJ-NP-TV-Z]{2})\b/.exec(doc.texte);
      if (g) a = { valeur: g[0], ligne: (doc.lignes.filter(function (l) { return l.indexOf(g[0]) !== -1; })[0] || g[0]) };
    }
    if (a) { var im = a.valeur.replace(/[\s-]/g, ""); r.immat = { valeur: im.slice(0, 2) + "-" + im.slice(2, 5) + "-" + im.slice(5), ligne: a.ligne }; }
    var b = rubrique(L, "B", "(\\d{2}\\s?[\\/.\\-]\\s?\\d{2}\\s?[\\/.\\-]\\s?\\d{4})");
    if (b) r.b = { valeur: premiereDate(b.valeur), ligne: b.ligne };
    else {
      // Sans la rubrique B lisible : la date la plus ancienne du document est en principe
      // celle de la première immatriculation (la date I du certificat vient après).
      var toutes = dates(doc.texte).filter(function (d) { return d.d.a >= 1950; });
      if (toutes.length) {
        toutes.sort(function (x, y) { return jour(x.d) - jour(y.d); });
        r.b = { valeur: toutes[0].d, ligne: toutes[0].texte + " (date la plus ancienne du document)" };
      }
    }
    var i = rubrique(L, "I", "(\\d{2}\\s?[\\/.\\-]\\s?\\d{2}\\s?[\\/.\\-]\\s?\\d{4})");
    if (i) r.i = { valeur: premiereDate(i.valeur), ligne: i.ligne };
    var d1 = rubrique(L, "D.1", "([A-Z][A-Z0-9' \\-]{1,24}?)" + FIN_RUBRIQUE);
    if (d1) r.marque = d1;
    var d3 = rubrique(L, "D.3", "([A-Za-z0-9][A-Za-z0-9' .+\\-]{0,29}?)" + FIN_RUBRIQUE);
    if (d3) r.modele = d3;
    var j1 = rubrique(L, "J.1", "([A-Z]{2,5})\\b");
    if (j1) r.genre = j1;
    var p3 = rubrique(L, "P.3", "([A-Z][A-Z0-9])\\b");
    if (p3) r.energie = { valeur: p3.valeur, ligne: p3.ligne, nom: ENERGIES[p3.valeur] || "" };
    var v7 = rubrique(L, "V.7", "(\\d{1,3})\\b");
    if (v7 && +v7.valeur <= 500) r.co2 = { valeur: String(+v7.valeur), ligne: v7.ligne };
    r.reconnue = !!(r.co2 || r.genre || r.energie || (r.immat && r.b));
    return r;
  }

  return { lireDocument: lireDocument, PAGES_MAX: PAGES_MAX, PAGES_OCR_MAX: PAGES_OCR_MAX, dates: dates, premiereDate: premiereDate, simple: simple, iso: iso, jour: jour, extrait: extrait,
           carteGrise: carteGrise };
})();
