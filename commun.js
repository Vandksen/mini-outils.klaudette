/* Mini-outils — fonctions communes : montants, dates, tableau d'écritures, copie pour Cador.
   Chaque page attend les éléments d'id : lignes, vide, totDebit, totCredit, equilibre,
   nbLignes, copier, etat, alertes. */
window.MiniOutils = (function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var ecritures = [];
  var huitColonnes = false;

  // Liste des outils du menu de gauche. Pour ajouter un outil : une ligne ici.
  var OUTILS = [
    { fichier: "fnp.html", nom: "Calcul de FNP" },
    { fichier: "abo-mensuel.html", nom: "Abonnement mensuel" },
    { fichier: "rem-gerance.html", nom: "Rémunération gérance 64x" },
    { fichier: "extournes.html", nom: "Extournes" }
  ];
  // Logo : clé plate dessinée sur une grille de 16 × 16 pixels, comme la cape de
  // capedinvisibilite.fr. "1" = couleur principale, "3" = ombre, "." = vide.
  var PIXELS = [
    ".........111....",
    "........1111....",
    "........111.....",
    "........111...11",
    "........1111.111",
    ".........111113.",
    "........113113..",
    ".......113......",
    "......113.......",
    "..111113........",
    ".111111.........",
    "111.1111........",
    "11...113........",
    ".....113........",
    "....1113........",
    "....111........."
  ];
  function clePlate(couleur, ombre) {
    var rects = "";
    PIXELS.forEach(function (ligne, y) {
      for (var x = 0; x < ligne.length; x++) {
        if (ligne[x] !== ".") rects += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' +
          (ligne[x] === "3" ? ombre : couleur) + '"/>';
      }
    });
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">' + rects + '</svg>';
  }
  var CLE_PLATE = clePlate("#ffffff", "#9bb0ff");

  // Remplit <nav id="menu"> et branche l'ouverture du menu sur petit écran.
  function menu() {
    var nav = $("menu");
    if (!nav) return;
    var page = location.pathname.split("/").pop() || OUTILS[0].fichier;
    nav.innerHTML =
      '<a class="logo" href="' + OUTILS[0].fichier + '">' + CLE_PLATE + '<b>MINI-<span>OUTILS</span></b></a>' +
      '<button id="replier" type="button" aria-controls="menu"></button>' +
      '<span class="marque-sous">Écritures pour Cador</span>' +
      '<div class="defile"><h2>Outils</h2>' +
      OUTILS.map(function (o, i) {
        return '<a class="entree" href="' + o.fichier + '"' + (o.fichier === page ? ' aria-current="page"' : '') +
               ' title="' + o.nom + '"><span class="num">' + deux(i + 1) + '</span><span class="lib">' + o.nom + '</span></a>';
      }).join("") +
      '</div><div class="pied"><span>Calcul dans votre navigateur</span><span>Rien n\'est envoyé</span></div>';
    // Repli du menu sur grand écran : il reste une bande avec le logo et les numéros.
    // Le choix est mémorisé dans le navigateur.
    var replier = $("replier");
    var replie = function (etat) {
      document.body.classList.toggle("menu-replie", etat);
      replier.textContent = etat ? "›" : "‹";
      replier.setAttribute("aria-expanded", String(!etat));
      replier.setAttribute("aria-label", etat ? "Déplier le menu" : "Replier le menu");
      replier.title = etat ? "Déplier le menu" : "Replier le menu";
    };
    var memo = false;
    try { memo = localStorage.getItem("mini-outils-menu-replie") === "1"; } catch (e) {}
    replie(memo);
    replier.addEventListener("click", function () {
      var etat = !document.body.classList.contains("menu-replie");
      replie(etat);
      try { localStorage.setItem("mini-outils-menu-replie", etat ? "1" : "0"); } catch (e) {}
    });

    var ouvrir = $("ouvrir"), fond = $("fond");
    var bascule = function (etat) {
      document.body.classList.toggle("menu-ouvert", etat);
      if (ouvrir) ouvrir.setAttribute("aria-expanded", String(etat));
    };
    if (ouvrir) ouvrir.addEventListener("click", function () { bascule(!document.body.classList.contains("menu-ouvert")); });
    if (fond) fond.addEventListener("click", function () { bascule(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") bascule(false); });
  }

  // Montant saisi "1 234,56" -> centimes (entier). Vide -> 0. Invalide -> NaN.
  function centimes(txt) {
    var s = String(txt).replace(/[\s  €%]/g, "").replace(",", ".");
    if (s === "") return 0;
    if (!/^-?\d*\.?\d*$/.test(s) || s === "." || s === "-") return NaN;
    return Math.round(parseFloat(s) * 100);
  }
  function deux(n) { return (n < 10 ? "0" : "") + n; }
  // Format de collage : "1234,56" sans séparateur de milliers.
  function brut(c) {
    var signe = c < 0 ? "-" : "", a = Math.abs(c);
    return signe + Math.floor(a / 100) + "," + deux(a % 100);
  }
  // Format d'affichage : "1 234,56".
  function affiche(c) {
    var p = brut(c).split(",");
    return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ") + "," + p[1];
  }
  // Date ISO "AAAA-MM-JJ" -> {a, m, j} ou null.
  function lireDate(txt) {
    var d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(txt);
    return d ? { a: +d[1], m: +d[2], j: +d[3] } : null;
  }
  // Décale de k mois : même jour, ramené à la fin du mois si besoin.
  function decale(d, k) {
    var t = (d.m - 1) + k, an = d.a + Math.floor(t / 12), mo = ((t % 12) + 12) % 12;
    var fin = new Date(an, mo + 1, 0).getDate();
    return { a: an, m: mo + 1, j: Math.min(d.j, fin) };
  }
  function dateFr(d) { return deux(d.j) + "/" + deux(d.m) + "/" + d.a; }

  // Affiche les écritures {date, piece, compte, libelle, debit, credit, debut}
  // (montants en centimes ou null), les totaux, l'équilibre et les alertes.
  // huit = true : copie au format d'import Cador à 8 colonnes (deux colonnes vides avant le débit).
  function rendre(liste, blocage, alertes, huit) {
    ecritures = liste;
    huitColonnes = !!huit;
    alertes = alertes || [];
    var corps = $("lignes");
    corps.textContent = "";
    var totD = 0, totC = 0;
    ecritures.forEach(function (e, i) {
      totD += e.debit || 0; totC += e.credit || 0;
      var tr = document.createElement("tr");
      if (e.debut) tr.className = "debut";
      [[deux(i + 1), "num"], [e.date], [e.piece], [e.compte, "compte"], [e.libelle, "lib"],
       [e.debit === null ? "" : affiche(e.debit), "droite"],
       [e.credit === null ? "" : affiche(e.credit), "droite"]].forEach(function (c) {
        var td = document.createElement("td");
        td.textContent = c[0];
        if (c[1]) td.className = c[1];
        tr.appendChild(td);
      });
      corps.appendChild(tr);
    });

    var equilibre = totD === totC;
    if (ecritures.length && !equilibre) alertes.push("Les écritures ne sont pas équilibrées : le total débit diffère du total crédit.");

    $("vide").hidden = !blocage;
    $("vide").textContent = blocage || "";
    $("totDebit").textContent = affiche(totD);
    $("totCredit").textContent = affiche(totC);
    var eq = $("equilibre");
    eq.className = ecritures.length ? (equilibre ? "ok" : "ecart") : "";
    eq.textContent = ecritures.length ? (equilibre ? "OK" : "Écart de " + affiche(Math.abs(totD - totC))) : "—";
    $("nbLignes").textContent = ecritures.length;
    $("copier").disabled = !ecritures.length;
    $("etat").textContent = "";

    var ul = $("alertes");
    ul.textContent = "";
    alertes.forEach(function (a) {
      var li = document.createElement("li");
      li.textContent = a;
      ul.appendChild(li);
    });
  }

  // Colonnes séparées par des tabulations : date, pièce, compte, libellé, débit, crédit
  // (avec deux colonnes vides avant le débit au format 8 colonnes).
  function texteACopier() {
    return ecritures.map(function (e) {
      return [e.date, e.piece, e.compte, e.libelle]
        .concat(huitColonnes ? ["", ""] : [])
        .concat([e.debit === null ? "" : brut(e.debit), e.credit === null ? "" : brut(e.credit)])
        .map(function (c) { return String(c).replace(/[\t\r\n]+/g, " "); })
        .join("\t");
    }).join("\r\n");
  }

  function copie() {
    copierTexte(texteACopier(), ecritures.length + " lignes copiées");
  }

  // Met un texte dans le presse-papiers et affiche le message dans #etat.
  function copierTexte(txt, message) {
    var ok = function () { $("etat").textContent = message; };
    var secours = function () {
      var ta = document.createElement("textarea");
      ta.value = txt;
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var reussi = false;
      try { reussi = document.execCommand("copy"); } catch (e) { reussi = false; }
      document.body.removeChild(ta);
      if (reussi) ok(); else $("etat").textContent = "Copie impossible dans ce navigateur";
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(ok, secours);
    } else {
      secours();
    }
  }

  // Relance le calcul à chaque saisie et branche le bouton de copie.
  function brancher(ids, calcule) {
    ids.forEach(function (id) {
      $(id).addEventListener("input", calcule);
      $(id).addEventListener("change", calcule);
    });
    $("copier").addEventListener("click", copie);
    calcule();
  }

  // Icône d'onglet : la même clé plate, en bleu.
  function icone() {
    var lien = document.createElement("link");
    lien.rel = "icon";
    lien.href = "data:image/svg+xml," + encodeURIComponent(clePlate("#1136DB", "#7d93f0"));
    document.head.appendChild(lien);
  }

  // Ajoute « Réinitialiser » en tête du premier panneau de saisie : tous les champs
  // sont vidés (cases décochées, listes sur leur premier choix), puis le calcul est relancé.
  function reinitialisation() {
    var champs = document.querySelectorAll("#contenu input, #contenu select, #contenu textarea");
    if (!champs.length) return;
    var titre = champs[0].closest(".panel").querySelector(".eyebrow");
    var barre = document.createElement("div");
    barre.className = "barre";
    titre.parentNode.insertBefore(barre, titre);
    barre.appendChild(titre);
    var bouton = document.createElement("button");
    bouton.type = "button";
    bouton.id = "reinit";
    bouton.className = "btn ghost";
    bouton.textContent = "Réinitialiser";
    bouton.title = "Vider les champs de configuration";
    barre.appendChild(bouton);
    bouton.addEventListener("click", function () {
      Array.prototype.forEach.call(champs, function (c) {
        if (c.type === "checkbox") c.checked = false;
        else if (c.tagName === "SELECT") c.selectedIndex = 0; // une liste ne peut pas être vide
        else c.value = "";
        c.dispatchEvent(new Event("input", { bubbles: true }));
      });
      champs[0].focus();
    });
  }

  menu();
  icone();
  reinitialisation();

  return { $: $, centimes: centimes, deux: deux, affiche: affiche, lireDate: lireDate,
           decale: decale, dateFr: dateFr, copierTexte: copierTexte, rendre: rendre, texteACopier: texteACopier, brancher: brancher };
})();
