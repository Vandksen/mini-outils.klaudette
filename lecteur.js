/* Mini-outils — lecture d'un document déposé (PDF, scan ou photo) pour préremplir un outil.

   Tout se passe dans le navigateur : le fichier n'est envoyé nulle part.
   - PDF qui contient du texte : texte lu avec pdf.js (vendor/pdfjs).
   - PDF scanné ou photo : reconnaissance de caractères avec Tesseract en WebAssembly
     (vendor/tesseract), en français.
   Les bibliothèques sont des fichiers du site, chargés au premier dépôt seulement
   (environ 1,7 Mo pour pdf.js, 5 Mo de plus pour la reconnaissance de caractères), puis
   gardés en cache par le service worker pour le hors-ligne.

   Usage (page mini-scanner.html) :
     MiniLecteur.lireDocument(fichier, function (etat) { … }).then(function (doc) {
       var cg = MiniLecteur.carteGrise(doc);   // ou avisEcheance(doc), bail(doc)
     });
   doc.texte : tout le texte ; doc.lignes : ses lignes ; doc.ocr : true si lu par OCR. */
window.MiniLecteur = (function () {
  "use strict";
  var M = window.MiniOutils, $ = M.$;
  // Racine du site : lecteur.js y est rangé.
  var RACINE = new URL(".", (document.currentScript && document.currentScript.src) || location.href).href;
  var PAGES_MAX = 6;          // pages lues au plus dans un PDF
  var PAGES_OCR_MAX = 3;      // pages scannées passées à la reconnaissance de caractères

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

  function lirePdf(fichier, z) {
    etat(z, "Ouverture du PDF…");
    return Promise.all([chargePdf(), fichier.arrayBuffer()]).then(function (r) {
      var lib = r[0];
      // isEvalSupported à false : aucun code tiré du document n'est exécuté.
      return lib.getDocument({ data: new Uint8Array(r[1]), isEvalSupported: false, disableFontFace: true }).promise;
    }).then(function (pdf) {
      var n = Math.min(pdf.numPages, PAGES_MAX), pages = [], scannees = 0;
      var suite = Promise.resolve();
      for (var i = 1; i <= n; i++) (function (k) {
        suite = suite.then(function () {
          etat(z, "Lecture de la page " + k + " sur " + n + "…");
          return pdf.getPage(k).then(function (page) {
            return page.getTextContent().then(function (c) {
              var lignes = lignesPage(c);
              if (lignes.join("").replace(/\s/g, "").length >= 30) { pages.push({ lignes: lignes, ocr: false }); return; }
              // Page sans texte : c'est un scan, la reconnaissance de caractères prend le relais.
              if (scannees >= PAGES_OCR_MAX) return;
              scannees++;
              var vue = page.getViewport({ scale: 2.5 });
              var toile = document.createElement("canvas");
              toile.width = Math.ceil(vue.width); toile.height = Math.ceil(vue.height);
              return page.render({ canvasContext: toile.getContext("2d"), viewport: vue }).promise.then(function () {
                return reconnait(toile, z, "page " + k);
              }).then(function (lignesOcr) { pages.push({ lignes: lignesOcr, ocr: true }); });
            });
          });
        });
      })(i);
      return suite.then(function () {
        var reste = pdf.numPages > n ? pdf.numPages - n : 0;
        return { pages: pages, reste: reste };
      });
    });
  }

  function reconnait(image, z, quoi) {
    etat(z, "Préparation de la reconnaissance de caractères (5 Mo au premier usage)…");
    suivi = function (m) {
      if (m.status === "recognizing text") etat(z, "Reconnaissance du texte" + (quoi ? " de la " + quoi : "") + " : " + Math.round(m.progress * 100) + " %");
      else if (/loading/.test(m.status)) etat(z, "Chargement de la reconnaissance de caractères : " + Math.round((m.progress || 0) * 100) + " %");
    };
    return chargeOcr().then(function (w) { return w.recognize(image); }).then(function (r) {
      suivi = null;
      return r.data.text.split(/\r?\n/).map(function (l) { return l.replace(/\s+$/, ""); }).filter(Boolean);
    });
  }

  function lire(fichier, z) {
    var pdf = fichier.type === "application/pdf" || /\.pdf$/i.test(fichier.name);
    if (pdf) return lirePdf(fichier, z);
    if (/^image\//.test(fichier.type)) return reconnait(fichier, z, "").then(function (lignes) { return { pages: [{ lignes: lignes, ocr: true }], reste: 0 }; });
    return Promise.reject(new Error("Format non pris en charge : déposez un PDF ou une image (JPEG, PNG)."));
  }

  // ---------- Aides pour les extracteurs ----------
  // Minuscules sans accents, pour comparer des mots.
  function simple(s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
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
  // Montant écrit à la française (« 1 234,56 », « 1.234,56 € ») -> centimes, ou NaN.
  function centimes(txt) {
    var s = String(txt).replace(/[\s  €]/g, "");
    if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) s = s.replace(/\./g, "");
    s = s.replace(",", ".");
    return /^\d+(\.\d{1,2})?$/.test(s) ? Math.round(parseFloat(s) * 100) : NaN;
  }
  // Montants d'un texte : nombres avec deux décimales, séparateur de milliers facultatif.
  function montants(txt) {
    var res = [], r = /(\d{1,3}(?:[   .]\d{3})+|\d+)[,.](\d{2})(?!\d)/g, m;
    while ((m = r.exec(txt))) { var c = centimes(m[0]); if (!isNaN(c)) res.push({ c: c, index: m.index, texte: m[0] }); }
    return res;
  }
  function iso(d) { return d.a + "-" + M.deux(d.m) + "-" + M.deux(d.j); }
  function jour(d) { return Math.round(Date.UTC(d.a, d.m - 1, d.j) / 86400000); }
  function extrait(ligne) { ligne = String(ligne).replace(/\s+/g, " ").trim(); return ligne.length > 90 ? ligne.slice(0, 87) + "…" : ligne; }

  // Lit un fichier et rend { nom, lignes, texte, ocr, reste } ; surEtat(texte) reçoit
  // l'avancement, à afficher pendant la lecture.
  function lireDocument(fichier, surEtat) {
    return lire(fichier, surEtat).then(function (lu) {
      var lignes = [], ocr = false;
      lu.pages.forEach(function (pg) { lignes = lignes.concat(pg.lignes); ocr = ocr || pg.ocr; });
      var doc = { nom: fichier.name, lignes: lignes, texte: lignes.join("\n"), ocr: ocr, reste: lu.reste };
      if (!doc.texte.replace(/\s/g, "")) throw new Error("Aucun texte lisible dans ce document.");
      return doc;
    });
  }

  // ---------- Documents reconnus ----------
  // Chaque fonction lit un type de document et rend ses données, avec la ligne où chacune
  // a été trouvée (pour l'afficher à côté de la valeur). Les pages choisissent ensuite
  // quels champs remplir.

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

  // Avis d'échéance (assurance, abonnement annuel) : période couverte, montant à payer,
  // date d'échéance, assureur.
  var ASSUREURS = ["AXA", "Allianz", "Generali", "Groupama", "MAAF", "MAIF", "MMA", "MACIF", "MACSF", "Matmut", "GMF", "Gan", "Swiss Life",
                   "SMABTP", "Hiscox", "Abeille", "Aviva", "Covéa", "Thélem", "Pacifica", "Crédit Agricole", "BNP Paribas Cardif", "LCL", "CIC",
                   "Crédit Mutuel", "Harmonie Mutuelle", "Malakoff Humanis", "AG2R", "Alan", "April", "Hiscox", "Groupama", "SMACL", "Leocare", "Ornikar"];
  function avisEcheance(doc) {
    var r = {}, L = doc.lignes, S = L.map(simple);
    // Période : « du 01/01/2026 au 31/12/2026 » sur une même ligne.
    for (var k = 0; k < L.length && !r.du; k++) {
      if (!/\bdu\b/.test(S[k]) || !/\bau\b/.test(S[k])) continue;
      var d = dates(L[k]);
      if (d.length >= 2 && jour(d[1].d) > jour(d[0].d)) { r.du = { valeur: d[0].d, ligne: L[k] }; r.au = { valeur: d[1].d, ligne: L[k] }; }
    }
    // Date d'échéance, à défaut date d'émission de l'avis.
    [/echeance/, /(emis|edite|etabli|fait) le|date d.(emission|edition)|\ble \d/].forEach(function (re) {
      if (r.echeance) return;
      for (var k2 = 0; k2 < L.length; k2++) {
        if (!re.test(S[k2]) || /\bdu\b.*\bau\b/.test(S[k2])) continue;
        var d2 = dates(L[k2]);
        if (d2.length) { r.echeance = { valeur: d2[0].d, ligne: L[k2] }; return; }
      }
    });
    // Montant : la ligne la mieux désignée (total TTC, à payer, cotisation), son dernier montant.
    var meilleur = null;
    L.forEach(function (l, k3) {
      var ms = montants(l);
      if (!ms.length) return;
      var s = S[k3], note = 0;
      if (/total\s*(a payer|ttc|general|du)|montant\s*(total|ttc|a payer|du)|net a payer/.test(s)) note += 5;
      if (/a payer|a regler|preleve|montant de l.echeance/.test(s)) note += 3;
      if (/cotisation|prime/.test(s)) note += 3;
      if (/\bttc\b/.test(s)) note += 2;
      if (/\btotal\b/.test(s)) note += 2;
      if (/\bmontant\b/.test(s)) note += 1;
      if (/\bht\b|hors taxe/.test(s)) note -= 1;
      if (/\btaxe|\bdont\b|frais|attentat|catnat|tva/.test(s)) note -= 3;
      if (note <= 0) return;
      var m = ms[ms.length - 1];
      if (!meilleur || note > meilleur.note || (note === meilleur.note && m.c > meilleur.c)) meilleur = { note: note, c: m.c, ligne: l };
    });
    if (meilleur) r.montant = { valeur: meilleur.c, ligne: meilleur.ligne };
    var t = doc.texte;
    for (var a = 0; a < ASSUREURS.length && !r.assureur; a++) {
      var re2 = new RegExp("\\b" + simple(ASSUREURS[a]).replace(/ /g, "\\s") + "\\b", "i");
      if (re2.test(simple(t))) r.assureur = { valeur: ASSUREURS[a], ligne: "" };
    }
    r.assurance = /assuran|cotisation|garantie|contrat n/.test(simple(t));
    r.reconnue = !!(r.du || r.montant);
    return r;
  }

  // Bail : indice et trimestre de révision, indice de base, TVA, surface, adresse du bien,
  // date d'effet et loyer.
  var TRIMESTRES = { "1er": 1, premier: 1, "1e": 1, "1eme": 1, "2e": 2, "2eme": 2, deuxieme: 2, second: 2, "3e": 3, "3eme": 3, troisieme: 3, "4e": 4, "4eme": 4, quatrieme: 4 };
  function bail(doc) {
    var r = {}, L = doc.lignes, S = L.map(simple), s = S.join("\n");
    // Indice : celui qui revient le plus souvent.
    var comptes = {
      ILC: (s.match(/loyers commerciaux|\bilc\b/g) || []).length,
      ILAT: (s.match(/activites tertiaires|\bilat\b/g) || []).length,
      ICC: (s.match(/cout de la construction|\bicc\b/g) || []).length
    };
    var indice = Object.keys(comptes).sort(function (x, y) { return comptes[y] - comptes[x]; })[0];
    if (comptes[indice]) {
      var reI = indice === "ILC" ? /loyers commerciaux|\bilc\b/ : indice === "ILAT" ? /activites tertiaires|\bilat\b/ : /cout de la construction|\bicc\b/;
      var kI = S.findIndex(function (l) { return reI.test(l); });
      r.indice = { valeur: indice, ligne: L[kI] };
      // Trimestre de référence : le premier cité à partir de la mention de l'indice.
      for (var k = kI; k < Math.min(L.length, kI + 12) && !r.trimestre; k++) {
        var m = /\b(1er|premier|1e|1eme|2e|2eme|deuxieme|second|3e|3eme|troisieme|4e|4eme|quatrieme)\s+trimestre\b|\bt\s?([1-4])\b/.exec(S[k]);
        if (m) r.trimestre = { valeur: String(m[1] ? TRIMESTRES[m[1]] : +m[2]), ligne: L[k] };
      }
      // Indice de base : nombre qui suit « indice de base », « indice de référence »…
      var reB = /indice (de base|de reference|initial|de depart)|valeur de l.indice|dernier indice (connu|publie)/g, mb;
      while (!r.base && (mb = reB.exec(s))) {
        var apres = s.slice(mb.index, mb.index + 200), n, reN = /(\d{2,4}(?:[,.]\d{1,2})?)(?!\s*(?:%|m2|m²|eur|€|\d))/g;
        while ((n = reN.exec(apres))) {
          var x = parseFloat(n[1].replace(",", "."));
          var plausible = indice === "ICC" ? x >= 900 && x <= 3500 : x >= 80 && x <= 250;
          // L'extrait est pris dans le texte d'origine : sans accents, le texte simplifié
          // garde les mêmes positions.
          if (plausible && !/^(19|20)\d{2}$/.test(n[1])) { r.base = { valeur: n[1].replace(".", ","), ligne: extrait(doc.texte.slice(mb.index, mb.index + n.index + n[1].length)) }; break; }
        }
      }
    }
    // TVA.
    if (/(non soumis|pas soumis|exonere|sans option)[^.\n]{0,60}(t\.?v\.?a|taxe sur la valeur)/.test(s)) r.tva = { valeur: false, ligne: "TVA écartée par le bail" };
    else {
      var kT = S.findIndex(function (l) { return /(soumis|assujetti|option)[^.]{0,50}(t\.?v\.?a|taxe sur la valeur)|t\.?v\.?a\.? en sus|\bhors taxes?\b|\bht\b/.test(l); });
      if (kT !== -1) r.tva = { valeur: true, ligne: L[kT] };
    }
    // Surface : de préférence sur une ligne qui parle du bureau ou de la pièce.
    var reS = /(\d{1,4}(?:[,.]\d{1,2})?)\s*(?:m2|m²|m\s?²|metres? carres)/;
    var kS = S.findIndex(function (l, k4) { return reS.test(L[k4].toLowerCase()) && /bureau|piece|local|surface/.test(l); });
    if (kS === -1) kS = L.findIndex(function (l) { return reS.test(l.toLowerCase()); });
    if (kS !== -1) r.surface = { valeur: reS.exec(L[kS].toLowerCase())[1].replace(".", ","), ligne: L[kS] };
    // Adresse du bien : code postal et commune, de préférence sur une ligne « situé », « sis ».
    var reC = /\b((?:0[1-9]|[1-8]\d|9[0-5])\d{3}|97[1-6]\d{2})\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’\- ]{1,40}?)(?=\s*(?:,|\.|\(|$|\s{2,}|cedex))/i;
    var kC = L.findIndex(function (l, k5) { return reC.test(l) && /situe|sis\b|adresse|bien loue|locaux/.test(S[k5]); });
    if (kC === -1) kC = L.findIndex(function (l) { return reC.test(l); });
    if (kC !== -1) {
      var c = reC.exec(L[kC]), cp = c[1];
      var dep = /^97/.test(cp) ? cp.slice(0, 3) : cp.slice(0, 2) === "20" ? (+cp < 20200 ? "2A" : "2B") : cp.slice(0, 2);
      var ville = c[2].trim().toLowerCase().replace(/(^|[\s\-'’])([a-zà-ÿ])/g, function (t, sep, l) { return sep + l.toUpperCase(); })
        .replace(/\b(Sur|Sous|Le|La|Les|De|Du|Des|En|Et|Aux?)\b/g, function (w, x, pos) { return pos ? w.toLowerCase() : w; });
      r.commune = { valeur: ville + " (" + dep + ")", ligne: L[kC], cp: cp };
    }
    // Date d'effet.
    for (var k6 = 0; k6 < L.length && !r.effet; k6++) {
      var me = /(a compter du|prend(ra)? effet|prise d.effet|commencer?a? a courir|a effet du|entree en jouissance)/.exec(S[k6]);
      if (!me) continue;
      var de = dates(L[k6] + " " + (L[k6 + 1] || ""));
      if (de.length) r.effet = { valeur: de[0].d, ligne: L[k6] };
    }
    // Loyer : la ligne qui parle de loyer et porte un montant ; annuel ramené au mois.
    var kL = S.findIndex(function (l, k7) { return /loyer/.test(l) && montants(L[k7]).length && !/indice|revis/.test(l); });
    if (kL !== -1) {
      var ml = montants(L[kL]), annuel = /annuel|par an\b/.test(S[kL]) && !/mensuel|par mois/.test(S[kL]);
      r.loyer = { valeur: ml[0].c, annuel: annuel, ligne: L[kL] };
    }
    r.reconnue = !!(r.indice || r.surface || r.loyer);
    return r;
  }

  return { lireDocument: lireDocument, PAGES_MAX: PAGES_MAX, dates: dates, premiereDate: premiereDate, montants: montants, centimes: centimes, simple: simple, iso: iso, jour: jour, extrait: extrait,
           carteGrise: carteGrise, avisEcheance: avisEcheance, bail: bail };
})();
