// Mesure d'audience (Google Analytics, balise GTM-PR69GJ7Z), seulement avec l'accord du visiteur.
// Mêmes règles que capedinvisibilite.fr : rien n'est chargé ni déposé avant « Accepter ». Le choix
// est gardé 6 mois dans ce navigateur (recommandation CNIL), puis redemandé. Le bouton
// « Gérer les cookies » du pied de page rouvre le bandeau. Un refus après un accord efface les
// cookies _ga et recharge la page pour décharger la balise.
// Chargé par commun.js, avec consentement.css.
(function () {
  var BALISE = "GTM-PR69GJ7Z";
  var CLE = "mini-outils-consentement";
  var DUREE = 1000 * 60 * 60 * 24 * 182; // 6 mois

  function lire() {
    try {
      var choix = JSON.parse(localStorage.getItem(CLE) || "null");
      if (choix && Date.now() - choix.date < DUREE) return choix.valeur;
    } catch (e) { /* stockage indisponible : on redemande */ }
    return null;
  }

  function ecrire(valeur) {
    try { localStorage.setItem(CLE, JSON.stringify({ valeur: valeur, date: Date.now() })); } catch (e) { /* rien */ }
  }

  function chargerMesure() {
    if (window.__miniOutilsMesure) return;
    window.__miniOutilsMesure = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtm.js?id=" + BALISE;
    document.head.appendChild(script);
  }

  function effacerCookiesMesure() {
    // Cookies de Google Analytics (_ga, _ga_XXXX) sur le domaine du site
    var domaines = ["", location.hostname, "." + location.hostname.replace(/^www\./, "")];
    document.cookie.split(";").map(function (c) { return c.split("=")[0].trim(); })
      .filter(function (n) { return /^_ga/.test(n); })
      .forEach(function (nom) {
        domaines.forEach(function (d) {
          document.cookie = nom + "=; Max-Age=0; path=/" + (d ? "; domain=" + d : "");
        });
      });
  }

  // Bandeau flottant en bas d'écran s'il ne recouvre aucun contenu visible ; sinon, bande en haut
  // de la zone de contenu, qui pousse le contenu. Testé à l'affichage et quand la fenêtre change
  // de taille. Le bandeau flottant s'aligne sur la zone de contenu, à droite du menu.
  var CONTENU = "h1, h2, h3, p, li, label, input, select, textarea, table, button, .carte, .final";
  function placer(b) {
    if (b.hidden) { decalerCopier(b); return; }
    b.classList.remove("flottant");
    b.style.left = "";
    if (innerWidth < 900) return;
    var zone = document.getElementById("contenu");
    b.classList.add("flottant");
    if (zone) b.style.left = (zone.getBoundingClientRect().left + 16) + "px";
    var r = b.getBoundingClientRect();
    var recouvre = Array.prototype.some.call(document.querySelectorAll(CONTENU), function (e) {
      if (b.contains(e) || e.closest("footer, nav")) return false;
      var q = e.getBoundingClientRect();
      return q.height > 0 && q.top < r.bottom + 8 && q.bottom > r.top - 8 && q.left < r.right && q.right > r.left;
    });
    if (recouvre) { b.classList.remove("flottant"); b.style.left = ""; }
    decalerCopier(b);
  }

  // Le bouton « Copier le lien » est posé en haut de la zone de contenu : quand le bandeau
  // y occupe une bande, il descend d'autant pour ne pas le recouvrir.
  function decalerCopier(b) {
    var bouton = document.getElementById("copier-lien");
    if (!bouton) return;
    var enBande = !b.hidden && !b.classList.contains("flottant");
    bouton.style.top = enBande ? (b.offsetHeight + 24) + "px" : "";
  }

  // Rouvert depuis « Gérer les cookies » : quand le bandeau est en haut de page, on y remonte
  function montrer(b) {
    if (getComputedStyle(b).position !== "fixed") window.scrollTo({ top: 0 });
    b.querySelector("button").focus({ preventScroll: true });
  }

  function bandeau(rouvert) {
    var b = document.getElementById("consentement");
    if (b) { b.hidden = false; placer(b); montrer(b); return; }
    b = document.createElement("div");
    b.id = "consentement";
    b.className = "consentement";
    b.setAttribute("role", "dialog");
    b.setAttribute("aria-live", "polite");
    b.setAttribute("aria-label", "Mesure d'audience");
    b.innerHTML =
      '<p><strong>Mesure d\'audience.</strong> Avec votre accord, ce site compte ses visites avec Google ' +
      'Analytics. Vos saisies, elles, restent sur votre poste. <a href="mentions-legales.html#cookies">En savoir plus</a></p>' +
      '<div class="consentement-choix">' +
      '<button type="button" data-choix="refus">Refuser</button>' +
      '<button type="button" data-choix="accord">Accepter</button>' +
      "</div>";
    b.addEventListener("click", function (e) {
      var bouton = e.target.closest("[data-choix]");
      if (!bouton) return;
      var accord = bouton.getAttribute("data-choix") === "accord";
      var avant = lire();
      ecrire(accord ? "accord" : "refus");
      b.hidden = true;
      decalerCopier(b);
      if (accord) chargerMesure();
      else if (avant === "accord" || window.__miniOutilsMesure) { effacerCookiesMesure(); location.reload(); }
    });
    // En tête de la zone de contenu : sur petit écran, il pousse le contenu au lieu de le recouvrir
    (document.getElementById("contenu") || document.body).prepend(b);
    placer(b);
    addEventListener("resize", function () { placer(b); });
    if (rouvert) montrer(b);
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-gerer-cookies]")) { e.preventDefault(); bandeau(true); }
  });

  var choix = lire();
  if (choix === "accord") chargerMesure();
  else if (choix === null) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { bandeau(false); });
    else bandeau(false);
  }
})();
