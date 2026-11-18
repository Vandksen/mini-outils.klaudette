/* Mini-outils — fonctions communes : montants, dates, tableau d'écritures, copie pour ACDCompta.
   Chaque page attend les éléments d'id : lignes, vide, totDebit, totCredit, equilibre,
   nbLignes, copier, etat, alertes. */
window.MiniOutils = (function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var ecritures = [];
  var milieu = [];

  // Numéro de version affiché en bas du menu. À augmenter à CHAQUE publication :
  // dernier chiffre pour une retouche, chiffre du milieu pour un nouvel outil.
  // C'est ce numéro qui déclenche la mise à jour automatique des pages déjà ouvertes
  // (voir verifieVersion) : sans changement de numéro, pas de mise à jour.
  // Ajouter aussi un bloc en tête de versions.html pour décrire ce qui change.
  var VERSION = "1.8.2";

  // Liste des outils du menu de gauche. Pour ajouter un outil : une ligne ici.
  var OUTILS = [
    { fichier: "fnp.html", nom: "Calcul de FNP" },
    { fichier: "abo-mensuel.html", nom: "Abonnement mensuel" },
    { fichier: "rem-gerance.html", nom: "Rémunération gérance 64x" },
    { fichier: "extournes.html", nom: "Extournes" },
    { fichier: "import-banque.html", nom: "Import banque" }
  ];
  // Catégorie « Dashboard » du menu, vide pour l'instant. Pour y ajouter une page :
  // une ligne ici, de la même forme que dans OUTILS.
  var DASHBOARD = [];
  // Logo : clé plate dessinée sur une grille de 24 × 24 pixels, dans l'esprit de la cape
  // de capedinvisibilite.fr. "1" = couleur principale, "3" = ombre, "." = vide.
  // Le même dessin est recopié dans icones/generer.py pour les icônes de l'application.
  var PIXELS = [
    "........................",
    "........................",
    "................133.....",
    "..............1133......",
    ".............1133.......",
    ".............111.....3..",
    ".............1111...13..",
    ".............11111.133..",
    ".............11111113...",
    "............111111133...",
    "...........111333333....",
    "..........11133.........",
    ".........11133..........",
    "....111111133...........",
    "...111111133............",
    "...13111113.............",
    "..133.11113.............",
    "..33...1113.............",
    "..3.....113.............",
    ".......1133.............",
    "......1333..............",
    ".....333................",
    "........................",
    "........................"
  ];
  function clePlate(couleur, ombre) {
    // Deux tracés superposés plutôt qu'un carré par case : toute la forme dans la
    // couleur d'ombre, puis les cases principales par-dessus. Le dessin reste ainsi
    // sans liseré entre les cases quand il est affiché à une taille non multiple de 24.
    var forme = "", principal = "";
    PIXELS.forEach(function (ligne, y) {
      for (var x = 0; x < ligne.length; x++) {
        if (ligne[x] === ".") continue;
        var caseSvg = "M" + x + " " + y + "h1v1h-1z";
        forme += caseSvg;
        if (ligne[x] !== "3") principal += caseSvg;
      }
    });
    var n = PIXELS.length;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + ' ' + n + '" aria-hidden="true">' +
      '<path fill="' + ombre + '" d="' + forme + '"/><path fill="' + couleur + '" d="' + principal + '"/></svg>';
  }
  var CLE_PLATE = clePlate("#ffffff", "#9bb0ff");

  // Icône de l'entrée « Suivi des versions » du menu (petit robot), fournie par Simon.
  var ICONE_VERSIONS = '<svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M25 6H17V2C17 1.73478 16.8946 1.48043 16.7071 1.29289C16.5196 1.10536 16.2652 1 16 1C15.7348 1 15.4804 1.10536 15.2929 1.29289C15.1054 1.48043 15 1.73478 15 2V6H7C5.93913 6 4.92172 6.42143 4.17157 7.17157C3.42143 7.92172 3 8.93913 3 10V24C3 25.0609 3.42143 26.0783 4.17157 26.8284C4.92172 27.5786 5.93913 28 7 28H25C26.0609 28 27.0783 27.5786 27.8284 26.8284C28.5786 26.0783 29 25.0609 29 24V10C29 8.93913 28.5786 7.92172 27.8284 7.17157C27.0783 6.42143 26.0609 6 25 6ZM27 24C27 24.5304 26.7893 25.0391 26.4142 25.4142C26.0391 25.7893 25.5304 26 25 26H7C6.46957 26 5.96086 25.7893 5.58579 25.4142C5.21071 25.0391 5 24.5304 5 24V10C5 9.46957 5.21071 8.96086 5.58579 8.58579C5.96086 8.21071 6.46957 8 7 8H25C25.5304 8 26.0391 8.21071 26.4142 8.58579C26.7893 8.96086 27 9.46957 27 10V24ZM20.5 17H11.5C10.5717 17 9.6815 17.3687 9.02513 18.0251C8.36875 18.6815 8 19.5717 8 20.5C8 21.4283 8.36875 22.3185 9.02513 22.9749C9.6815 23.6313 10.5717 24 11.5 24H20.5C21.4283 24 22.3185 23.6313 22.9749 22.9749C23.6313 22.3185 24 21.4283 24 20.5C24 19.5717 23.6313 18.6815 22.9749 18.0251C22.3185 17.3687 21.4283 17 20.5 17ZM17.5 19V22H14.5V19H17.5ZM10 20.5C10 20.1022 10.158 19.7206 10.4393 19.4393C10.7206 19.158 11.1022 19 11.5 19H12.5V22H11.5C11.1022 22 10.7206 21.842 10.4393 21.5607C10.158 21.2794 10 20.8978 10 20.5ZM20.5 22H19.5V19H20.5C20.8978 19 21.2794 19.158 21.5607 19.4393C21.842 19.7206 22 20.1022 22 20.5C22 20.8978 21.842 21.2794 21.5607 21.5607C21.2794 21.842 20.8978 22 20.5 22ZM9 13.5C9 13.2033 9.08797 12.9133 9.2528 12.6666C9.41762 12.42 9.65189 12.2277 9.92597 12.1142C10.2001 12.0006 10.5017 11.9709 10.7926 12.0288C11.0836 12.0867 11.3509 12.2296 11.5607 12.4393C11.7704 12.6491 11.9133 12.9164 11.9712 13.2074C12.0291 13.4983 11.9994 13.7999 11.8858 14.074C11.7723 14.3481 11.58 14.5824 11.3334 14.7472C11.0867 14.912 10.7967 15 10.5 15C10.1022 15 9.72064 14.842 9.43934 14.5607C9.15804 14.2794 9 13.8978 9 13.5ZM20 13.5C20 13.2033 20.088 12.9133 20.2528 12.6666C20.4176 12.42 20.6519 12.2277 20.926 12.1142C21.2001 12.0006 21.5017 11.9709 21.7926 12.0288C22.0836 12.0867 22.3509 12.2296 22.5607 12.4393C22.7704 12.6491 22.9133 12.9164 22.9712 13.2074C23.0291 13.4983 22.9993 13.7999 22.8858 14.074C22.7723 14.3481 22.58 14.5824 22.3334 14.7472C22.0867 14.912 21.7967 15 21.5 15C21.1022 15 20.7206 14.842 20.4393 14.5607C20.158 14.2794 20 13.8978 20 13.5Z"></path></svg>';

  var ICONE_LOGICIELS = '<svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M4 5h24a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H18v3h5v2H9v-2h5v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 2v15h24V7Zm9.6 11.4L8.2 13l1.4-1.4 4 4 8.8-8.8L23.8 8Z"/></svg>';
  var ICONE_MANIFESTE = '<svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M7 2h13l7 7v19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm0 2v24h18V10h-6V4Zm14 1.4V8h2.6ZM10 14h12v2H10Zm0 5h12v2H10Zm0 5h8v2h-8Z"/></svg>';
  var ICONE_ACCUEIL = '<svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16 3 2 15h4v13h8v-9h4v9h8V15h4z"/></svg>';

  // Remplit <nav id="menu"> et branche l'ouverture du menu sur petit écran.
  function menu() {
    var nav = $("menu");
    if (!nav) return;
    var page = location.pathname.split("/").pop() || "index.html";
    nav.innerHTML =
      '<a class="logo" href="index.html" title="Accueil">' + CLE_PLATE + '<b>MINI-<span>OUTILS</span></b></a>' +
      '<span class="marque-sous">Écritures pour <span class="nom-propre">ACDCompta</span></span>' +
      '<div class="defile">' +
      '<a class="entree" href="index.html"' + (page === "index.html" ? ' aria-current="page"' : '') +
      ' title="Accueil"><span class="num">' + ICONE_ACCUEIL + '</span><span class="lib">Accueil</span></a>' +
      '<a class="entree" href="manifeste.html"' + (page === "manifeste.html" ? ' aria-current="page"' : '') +
      ' title="Manifeste"><span class="num">' + ICONE_MANIFESTE + '</span><span class="lib">Manifeste</span></a>' +
      '<h2 class="outil">Outils</h2>' +
      OUTILS.map(function (o, i) {
        return '<a class="entree outil" href="' + o.fichier + '"' + (o.fichier === page ? ' aria-current="page"' : '') +
               ' title="' + o.nom + '"><span class="num">' + deux(i + 1) + '</span><span class="lib">' + o.nom + '</span></a>';
      }).join("") +
      '<h2 class="outil">Dashboard</h2>' +
      (DASHBOARD.length ? DASHBOARD.map(function (o, i) {
        return '<a class="entree outil" href="' + o.fichier + '"' + (o.fichier === page ? ' aria-current="page"' : '') +
               ' title="' + o.nom + '"><span class="num">' + deux(i + 1) + '</span><span class="lib">' + o.nom + '</span></a>';
      }).join("") : '<span class="entree-vide outil">À venir</span>') +
      '<h2>À propos</h2>' +
      '<a class="entree" href="logiciels-compatibles.html"' + (page === "logiciels-compatibles.html" ? ' aria-current="page"' : '') +
      ' title="Logiciels compatibles"><span class="num">' + ICONE_LOGICIELS + '</span>' +
      '<span class="lib">Logiciels compatibles</span></a>' +
      '<a class="entree" href="versions.html"' + (page === "versions.html" ? ' aria-current="page"' : '') +
      ' title="Suivi des versions"><span class="num">' + ICONE_VERSIONS + '</span>' +
      '<span class="lib">Suivi des versions</span></a>' +
      '</div>' +
      // Encart slogan vers l'accueil, au-dessus du trait qui sépare le bas du menu ;
      // inutile sur l'accueil lui-même, qui porte déjà ce bandeau.
      (page === "index.html" ? '' :
        '<div class="encart-zone"><a class="encart" href="index.html"><strong>Quand la période fiscale se déchaîne, <em>gardez le cap.</em></strong>' +
        '<small>Laissez les écritures répétitives à Mini-outils-compta.fr</small></a></div>') +
      '<div class="pied"><button id="installer" type="button">Installer l’application</button>' +
      '<span id="installer-info" role="status" hidden></span>' +
      '<span>Calcul dans votre navigateur</span><span>Rien n\'est envoyé</span>' +
      '<a class="version" href="versions.html" title="Suivi des versions">Version ' + VERSION + '</a></div>';
    // Le menu n'est plus repliable : on efface le choix qu'une ancienne version a pu mémoriser.
    try { localStorage.removeItem("mini-outils-menu-replie"); } catch (e) {}

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
    // Accepte aussi la saisie française : JJ/MM/AAAA, JJ.MM.AAAA, JJ-MM-AAAA ou JJMMAAAA.
    txt = String(txt).trim();
    var d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(txt), r = null;
    if (d) r = { a: +d[1], m: +d[2], j: +d[3] };
    else {
      d = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(txt) || /^(\d{2})(\d{2})(\d{4})$/.exec(txt);
      if (d) r = { a: +d[3], m: +d[2], j: +d[1] };
    }
    if (!r || r.m < 1 || r.m > 12 || r.j < 1 || r.j > new Date(r.a, r.m, 0).getDate()) return null;
    return r;
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
  // huit : copie au format d'import ACDCompta à 8 colonnes. true = deux colonnes vides avant
  // le débit ; un tableau donne leur contenu, par exemple ["", "FAUX"].
  function rendre(liste, blocage, alertes, huit) {
    ecritures = liste;
    milieu = huit === true ? ["", ""] : (huit || []);
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
        .concat(milieu)
        .concat([e.debit === null ? "" : brut(e.debit), e.credit === null ? "" : brut(e.credit)])
        .map(function (c) { return String(c).replace(/[\t\r\n]+/g, " "); })
        .join("\t");
    }).join("\r\n");
  }

  function copie() {
    copierTexte(texteACopier(), ecritures.length + " lignes copiées");
  }

  // Copie réussie : petit jet de confettis depuis le bouton et message de félicitations.
  var bravo = null, bravoFin = null;
  function fete(bouton) {
    if (!bravo) {
      bravo = document.createElement("div");
      bravo.className = "bravo";
      bravo.setAttribute("role", "status");
      bravo.textContent = "Bravo ! Vous venez de gagner du temps !";
      document.body.appendChild(bravo);
    }
    bravo.classList.remove("visible");
    void bravo.offsetWidth; // relance l'animation d'apparition à chaque copie
    bravo.classList.add("visible");
    clearTimeout(bravoFin);
    bravoFin = setTimeout(function () { bravo.classList.remove("visible"); }, 3500);

    // Les confettis partent même si le système demande moins d'animations : ils sont
    // brefs et demandés expressément, et ce réglage est souvent actif sous Windows.
    if (!bouton || !bouton.animate) return;
    var r = bouton.getBoundingClientRect();
    var x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
    var couleurs = ["#1136DB", "#1B2450", "#9bb0ff", "#c7d2fa", "#1136DB"];
    for (var i = 0; i < 36; i++) {
      var c = document.createElement("span");
      c.className = "confetti";
      var taille = 5 + Math.round(Math.random() * 5);
      c.style.width = taille + "px";
      c.style.height = (Math.random() < 0.4 ? taille * 2 : taille) + "px";
      c.style.left = (x0 - taille / 2) + "px";
      c.style.top = (y0 - taille / 2) + "px";
      c.style.background = couleurs[i % couleurs.length];
      document.body.appendChild(c);
      var dx = (Math.random() - 0.5) * 320, haut = 70 + Math.random() * 110, tour = (Math.random() - 0.5) * 900;
      var anim = c.animate([
        { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
        { transform: "translate(" + dx * 0.6 + "px, " + -haut + "px) rotate(" + tour * 0.5 + "deg)", opacity: 1, offset: 0.35 },
        { transform: "translate(" + dx + "px, " + (haut * 0.8 + 60) + "px) rotate(" + tour + "deg)", opacity: 0 }
      ], { duration: 900 + Math.random() * 600, easing: "cubic-bezier(.2, .6, .4, 1)" });
      anim.onfinish = (function (el) { return function () { el.remove(); }; })(c);
    }
  }

  // Met un texte dans le presse-papiers et affiche le message dans #etat.
  function copierTexte(txt, message) {
    var ok = function () { $("etat").textContent = message; fete($("copier")); };
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

  // Calendrier maison : remplace celui du navigateur, qui ne peut pas être mis aux
  // couleurs de la page. Chaque <input type="date"> devient un champ JJ/MM/AAAA
  // avec un bouton qui ouvre le calendrier ; la saisie au clavier reste possible.
  function calendrier() {
    var MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août",
                "septembre", "octobre", "novembre", "décembre"];
    var JOURS = ["lu", "ma", "me", "je", "ve", "sa", "di"];
    var ouvert = null;

    function fermer() {
      if (!ouvert) return;
      ouvert.pop.remove();
      ouvert.bouton.setAttribute("aria-expanded", "false");
      ouvert = null;
    }
    function el(balise, classe, texte) {
      var e = document.createElement(balise);
      if (classe) e.className = classe;
      if (texte !== undefined) e.textContent = texte;
      if (balise === "button") e.type = "button";
      return e;
    }
    function choisir(champ, valeur) {
      champ.value = valeur;
      champ.dispatchEvent(new Event("input", { bubbles: true }));
      fermer();
      champ.focus();
    }

    function ouvrir(champ, bouton, cadre) {
      fermer();
      var auj = new Date();
      auj = { a: auj.getFullYear(), m: auj.getMonth() + 1, j: auj.getDate() };
      var choisi = lireDate(champ.value);
      var vue = choisi ? { a: choisi.a, m: choisi.m } : { a: auj.a, m: auj.m };
      var pop = el("div", "cal");
      pop.setAttribute("role", "dialog");
      pop.setAttribute("aria-label", "Choisir une date");

      function dessine() {
        pop.textContent = "";
        var tete = el("div", "cal-tete");
        var titre = el("span", "cal-titre");
        titre.appendChild(document.createTextNode(MOIS[vue.m - 1] + " "));
        titre.appendChild(el("em", "", String(vue.a)));
        var nav = el("span", "cal-nav");
        [["«", -12, "Année précédente"], ["‹", -1, "Mois précédent"],
         ["›", 1, "Mois suivant"], ["»", 12, "Année suivante"]].forEach(function (n) {
          var b = el("button", "", n[0]);
          b.setAttribute("aria-label", n[2]);
          b.title = n[2];
          b.addEventListener("click", function () {
            var d = decale({ a: vue.a, m: vue.m, j: 1 }, n[1]);
            vue = { a: d.a, m: d.m };
            dessine();
          });
          nav.appendChild(b);
        });
        tete.appendChild(titre);
        tete.appendChild(nav);
        pop.appendChild(tete);

        var grille = el("div", "cal-grille");
        JOURS.forEach(function (j) { grille.appendChild(el("span", "cal-jour-nom", j)); });
        // La grille commence au lundi de la semaine du 1er et montre 6 semaines.
        var premier = new Date(vue.a, vue.m - 1, 1);
        var depart = 1 - (premier.getDay() + 6) % 7;
        for (var i = 0; i < 42; i++) {
          var d = new Date(vue.a, vue.m - 1, depart + i);
          var j = { a: d.getFullYear(), m: d.getMonth() + 1, j: d.getDate() };
          var b = el("button", "cal-jour", String(j.j));
          if (j.m !== vue.m) b.classList.add("hors");
          if (j.a === auj.a && j.m === auj.m && j.j === auj.j) b.classList.add("auj");
          if (choisi && j.a === choisi.a && j.m === choisi.m && j.j === choisi.j) {
            b.classList.add("choisi");
            b.setAttribute("aria-current", "date");
          }
          b.setAttribute("aria-label", j.j + " " + MOIS[j.m - 1] + " " + j.a);
          b.addEventListener("click", (function (date) {
            return function () { choisir(champ, dateFr(date)); };
          })(j));
          grille.appendChild(b);
        }
        pop.appendChild(grille);

        var pied = el("div", "cal-pied");
        var effacer = el("button", "", "Effacer");
        effacer.addEventListener("click", function () { choisir(champ, ""); });
        var aujourdhui = el("button", "", "Aujourd'hui");
        aujourdhui.addEventListener("click", function () { choisir(champ, dateFr(auj)); });
        pied.appendChild(effacer);
        pied.appendChild(aujourdhui);
        pop.appendChild(pied);
      }

      dessine();
      cadre.appendChild(pop);
      bouton.setAttribute("aria-expanded", "true");
      ouvert = { pop: pop, bouton: bouton, cadre: cadre };
    }

    Array.prototype.forEach.call(document.querySelectorAll('input[type="date"]'), function (champ) {
      var depart = lireDate(champ.value);
      champ.type = "text";
      champ.value = depart ? dateFr(depart) : "";
      champ.placeholder = "jj/mm/aaaa";
      champ.inputMode = "numeric";
      champ.autocomplete = "off";
      champ.maxLength = 10;
      var cadre = el("span", "date-champ");
      champ.parentNode.insertBefore(cadre, champ);
      cadre.appendChild(champ);
      var bouton = el("button", "cal-bouton");
      bouton.setAttribute("aria-label", "Ouvrir le calendrier");
      bouton.setAttribute("aria-expanded", "false");
      bouton.title = "Ouvrir le calendrier";
      bouton.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges" fill="currentColor">' +
        '<path d="M2 3h12v11H2zM3 6v7h10V6z" fill-rule="evenodd"/><path d="M4 1h2v3H4zM10 1h2v3h-2zM5 8h2v2H5zM9 8h2v2H9z"/></svg>';
      cadre.appendChild(bouton);
      bouton.addEventListener("click", function () {
        if (ouvert && ouvert.cadre === cadre) fermer(); else ouvrir(champ, bouton, cadre);
      });
      // Une date tapée au clavier est remise au format JJ/MM/AAAA en quittant la case.
      champ.addEventListener("blur", function () {
        var d = lireDate(champ.value);
        if (d) champ.value = dateFr(d);
      });
    });
    document.addEventListener("mousedown", function (e) {
      if (ouvert && !ouvert.cadre.contains(e.target)) fermer();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && ouvert) { var b = ouvert.bouton; fermer(); b.focus(); }
    });
  }

  // Application installable (PWA) : le service worker met les pages en cache pour un
  // usage hors ligne. Il ne fonctionne que servi en https ou sur localhost, pas en
  // ouvrant le fichier par double-clic.
  var enLigne = /^https?:$/.test(location.protocol);
  if ("serviceWorker" in navigator && enLigne) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(function (reg) {
        document.addEventListener("visibilitychange", function () {
          if (document.visibilityState === "visible") reg.update().catch(function () {});
        });
      }).catch(function () {});
    });
  }

  // Mise à jour automatique : à l'ouverture et à chaque retour sur la page, on compare
  // la version chargée à celle du serveur. Si elle a changé, la page se recharge seule,
  // sauf si une saisie est en cours : dans ce cas un bandeau propose la mise à jour.
  var saisieEnCours = false;
  document.addEventListener("input", function () { saisieEnCours = true; }, true);
  function proposeMaj(version) {
    if (document.querySelector(".maj")) return;
    var b = document.createElement("div");
    b.className = "maj";
    b.setAttribute("role", "status");
    b.appendChild(document.createTextNode("Version " + version + " disponible"));
    var bouton = document.createElement("button");
    bouton.type = "button";
    bouton.textContent = "Mettre à jour";
    bouton.addEventListener("click", rechargeFrais);
    b.appendChild(bouton);
    document.body.appendChild(b);
  }
  // Avant de recharger, on redemande au serveur la page, les styles et le script
  // (cache: "reload"), pour que le navigateur n'assemble pas un nouveau script avec
  // d'anciens styles gardés en mémoire : c'est ce qui donnait un bouton sans style.
  function rechargeFrais() {
    var fichiers = [location.href.split("#")[0], "commun.css", "commun.js", "manifest.webmanifest"];
    Promise.all(fichiers.map(function (f) {
      return fetch(f, { cache: "reload" }).catch(function () {});
    })).then(function () { location.reload(); });
  }
  function verifieVersion() {
    if (!enLigne) return;
    fetch("commun.js", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.text() : ""; })
      .then(function (texte) {
        var m = /var VERSION = "([^"]+)"/.exec(texte);
        if (!m || m[1] === VERSION) return;
        var deja = null;
        try { deja = sessionStorage.getItem("mini-outils-maj"); } catch (e) {}
        // Un seul rechargement automatique par version, pour ne jamais boucler.
        if (!saisieEnCours && deja !== m[1]) {
          try { sessionStorage.setItem("mini-outils-maj", m[1]); } catch (e) {}
          rechargeFrais();
        } else proposeMaj(m[1]);
      })
      .catch(function () {});
  }
  verifieVersion();
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") verifieVersion();
  });

  // Bouton « Installer l'application » en bas du menu, toujours visible.
  // Le navigateur (Chrome, Edge) signale par l'événement beforeinstallprompt que
  // l'installation est possible : le clic ouvre alors sa fenêtre d'installation.
  // Sans ce signal (application déjà installée, ou navigateur qui ne le propose pas),
  // le clic affiche une explication sous le bouton au lieu de ne rien faire.
  var invite = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault(); // on garde l'invite pour la déclencher au clic
    invite = e;
  });
  window.addEventListener("appinstalled", function () { invite = null; });
  function brancheInstaller(b, info) {
    if (!b || !info) return;
    b.addEventListener("click", function () {
      if (invite) {
        info.hidden = true;
        invite.prompt();
        Promise.resolve(invite.userChoice).then(function () { invite = null; });
        return;
      }
      var enApplication = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
                          navigator.standalone === true;
      info.textContent = enApplication
        ? "L’application est déjà installée : vous l’utilisez en ce moment."
        : "Déjà installée sur ce poste, ou installation non proposée par ce navigateur. " +
          "Sinon, ouvrez le menu du navigateur puis « Installer Mini-outils ».";
      info.hidden = false;
    });
  }
  // Le bouton du menu, et tout bouton de page portant data-installer="id de sa zone de message".
  function installation() {
    brancheInstaller($("installer"), $("installer-info"));
    Array.prototype.forEach.call(document.querySelectorAll("[data-installer]"), function (b) {
      brancheInstaller(b, $(b.getAttribute("data-installer")));
    });
  }

  // Pied de page commun : liens légaux et mention « Un projet STRUCTURRE », ajoutés
  // après les indications propres à chaque page.
  function pied() {
    var c = document.querySelector(".site-footer .conteneur");
    if (!c) return;
    var bloc = document.createElement("div");
    bloc.className = "pied-commun";
    bloc.innerHTML =
      '<nav class="legal" aria-label="Liens légaux">' +
      '<a href="mentions-legales.html">Mentions légales</a>' +
      '<a href="mentions-legales.html#donnees">Données personnelles</a>' +
      '<a href="logiciels-compatibles.html">Logiciels compatibles</a>' +
      '<a href="versions.html">Suivi des versions</a></nav>' +
      '<span class="projet">Un projet <a href="https://structurre.fr" target="_blank" rel="noopener">' +
      '<img src="icones/structurre.svg" alt="" width="20" height="20">STRUCTURRE</a></span>';
    c.appendChild(bloc);
  }

  // Sur téléphone, seules les pages d'information sont affichées : les tableaux
  // d'écritures n'y sont pas lisibles. Les pages d'outil reçoivent la classe
  // « page-outil » et un message de remplacement ; c'est le CSS (écran de 820 px
  // de large au plus) qui masque l'outil et montre le message.
  function mobile() {
    var page = location.pathname.split("/").pop() || "index.html";
    var outil = OUTILS.filter(function (o) { return o.fichier === page; })[0];
    var contenu = $("contenu"), principal = document.querySelector("main");
    if (!outil || !contenu || !principal) return;
    document.body.classList.add("page-outil");
    var bloc = document.createElement("div");
    bloc.className = "mobile-info";
    var c = document.createElement("div");
    c.className = "conteneur";
    c.innerHTML = '<p class="eyebrow">Sur ordinateur</p>' +
      '<h1>Cet outil s’utilise <em>sur ordinateur.</em></h1>' +
      '<p class="lead"></p>' +
      '<a class="btn grand" href="index.html">Découvrir l’application</a>';
    c.querySelector(".lead").textContent = "« " + outil.nom + " » affiche des tableaux d’écritures qui ne sont pas " +
      "lisibles sur un écran de téléphone. Ouvrez Mini-outils depuis un ordinateur pour l’utiliser.";
    bloc.appendChild(c);
    contenu.insertBefore(bloc, principal);
  }

  calendrier();
  menu();
  mobile();
  pied();
  installation();
  icone();
  reinitialisation();

  return { $: $, centimes: centimes, deux: deux, affiche: affiche, lireDate: lireDate,
           decale: decale, dateFr: dateFr, copierTexte: copierTexte, verifieVersion: verifieVersion, rendre: rendre, texteACopier: texteACopier, brancher: brancher };
})();
