/* Mini-outils — fonctions communes : montants, dates, tableau d'écritures, copie pour ACDCompta.
   Chaque page attend les éléments d'id : lignes, vide, copier, etat, alertes ; et, si elle
   affiche le bloc de contrôle, totDebit, totCredit, equilibre, nbLignes. */
window.MiniOutils = (function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var ecritures = [];
  var milieu = [];

  // Numéro de version affiché en bas du menu. À augmenter à CHAQUE publication :
  // dernier chiffre pour une retouche, chiffre du milieu pour un nouvel outil.
  // C'est ce numéro qui déclenche la mise à jour automatique des pages déjà ouvertes
  // (voir verifieVersion) : sans changement de numéro, pas de mise à jour.
  // Mettre le MÊME numéro dans version.json : c'est ce petit fichier que les pages ouvertes
  // consultent pour savoir si une nouvelle version est publiée.
  // Ajouter aussi un bloc en tête de versions.html pour décrire ce qui change.
  var VERSION = "1.26.2";

  // Type de chaque outil (champ « type ») : ce sur quoi il travaille, affiché en étiquette sur
  // sa page et sur sa carte de l'accueil (voir etiquettesType).
  //   calcul  : des paramètres saisis (taux, montants, dates) ;
  //   balance : une balance collée ;
  //   detail  : le détail collé d'un compte (grand livre, relevé, écritures).
  var TYPES = {
    calcul: { nom: "Calcul", aide: "Outil de calcul : il travaille sur les paramètres que vous saisissez." },
    balance: { nom: "Balance", aide: "Il travaille sur une balance collée." },
    detail: { nom: "Détail d'un compte", aide: "Il travaille sur le détail collé d'un compte : grand livre, relevé ou écritures." }
  };

  // Catégorie « Outils de production » du menu : écritures courantes de la tenue.
  // Pour ajouter un outil : une ligne ici, à sa place dans l'ordre d'affichage.
  var PRODUCTION = [
    { fichier: "extournes.html", nom: "Extournes", type: "detail" },
    { fichier: "abo-mensuel.html", nom: "Abonnement mensuel", type: "calcul" },
    { fichier: "loyer-bureau.html", nom: "Loyer du bureau à domicile", type: "calcul" },
    { fichier: "rem-gerance.html", nom: "Rémunération gérance", type: "calcul" },
    { fichier: "indemnites-km.html", nom: "Indemnités kilométriques", type: "calcul" },
    { fichier: "import-banque.html", nom: "Import banque", type: "detail" }
  ];
  // Catégorie « Outils de révision » du menu : calculs et écritures de clôture.
  var REVISION = [
    { fichier: "fnp.html", nom: "Calcul de FNP", type: "calcul" },
    { fichier: "avantage-nature.html", nom: "Avantage en nature", type: "calcul" },
    { fichier: "tva-avantages-nature.html", nom: "TVA avantages en nature", type: "calcul" },
    { fichier: "tva-annee.html", nom: "TVA de l'année", type: "detail" },
    { fichier: "interets-courus.html", nom: "Intérêts courus", type: "detail" },
    { fichier: "decomposition-immeuble.html", nom: "Décomposition immeuble", type: "calcul" },
    { fichier: "plafond-vehicule.html", nom: "Plafond véhicule", type: "calcul" },
    { fichier: "medecins-secteur1.html", nom: "Médecins secteur 1", type: "calcul" },
    { fichier: "revenu-brut-social.html", nom: "Revenu brut social", type: "calcul" },
    { fichier: "revalorisation-loyer.html", nom: "Revalorisation de loyer", type: "detail" }
  ];
  var OUTILS = PRODUCTION.concat(REVISION);
  // Catégorie « Analyse » du menu : contrôles et revues à partir de données collées.
  // Pour y ajouter une page : une ligne ici, de la même forme que dans OUTILS.
  var ANALYSE = [
    { fichier: "controle-coherence.html", nom: "Contrôle de cohérence", type: "balance" },
    { fichier: "dates-week-end.html", nom: "Dates de week-end", type: "detail" },
    { fichier: "analyse-achats.html", nom: "Analyse des achats", type: "detail" }
  ];
  // Catégorie « Dashboard » du menu : outils qui s'appuient sur les comptes 4886 et 4887
  // tenus par cycle. Pour y ajouter une page :
  // une ligne ici, de la même forme que dans OUTILS.
  var DASHBOARD = [
    { fichier: "etalement.html", nom: "Cutter", type: "calcul" }
  ];
  // Catégorie « Référentiel » du menu : pages de consultation, lisibles aussi sur téléphone.
  // Pour y ajouter une page : une ligne ici, de la même forme que dans OUTILS.
  var REFERENTIEL = [
    { fichier: "pcg.html", nom: "Plan de comptes" },
    { fichier: "questions-clients.html", nom: "Questions aux clients" }
  ];
  // Icône du site : le « M » du logo, agrandi deux fois, avec son ombre dure, sur une
  // grille de 24 × 24 cases. "1" = couleur principale, "3" = ombre, "." = vide.
  // Le même dessin est recopié dans icones/generer.py pour les icônes de l'application,
  // et dans pdf.js (ICONE_M) pour l'en-tête des justificatifs.
  var PIXELS = [
    "........................",
    "........................",
    "........................",
    "........................",
    "...1111........1111.....",
    "...1111........1111.....",
    "...111111....11111133...",
    "...111111....11111133...",
    "...111111111111111133...",
    "...111111111111111133...",
    "...111133111133111133...",
    "...111133111133111133...",
    "...111133..3333111133...",
    "...111133..3333111133...",
    "...111133......111133...",
    "...111133......111133...",
    "...111133......111133...",
    "...111133......111133...",
    ".....3333........3333...",
    ".....3333........3333...",
    "........................",
    "........................",
    "........................",
    "........................"
  ];
  function iconeM(couleur, ombre) {
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
    // Cadré au plus près du dessin, dans un carré de 20 cases. Sert à l'icône d'onglet ;
    // le logo du menu est le nom du site seul.
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="2 2 20 20" shape-rendering="crispEdges" aria-hidden="true">' +
      '<path fill="' + ombre + '" d="' + forme + '"/><path fill="' + couleur + '" d="' + principal + '"/></svg>';
  }

  // Le nom du site en lettres de 7 cases de haut, dessinées case par case comme la clé.
  // « OUTILS » est penché (les lignes du haut décalées vers la droite) pour garder
  // l'italique de l'ancien logo. Une ombre dure bleu foncé, décalée d'une case, donne le relief
  // sans boucher les jours d'une case (M, N, S) ; le tiret fait 2 cases pour aérer MINI-OUTILS.
  var LETTRES = {
    M: ["11....11", "111..111", "11111111", "11.11.11", "11....11", "11....11", "11....11"],
    I: ["11", "11", "11", "11", "11", "11", "11"],
    N: ["11...11", "111..11", "1111.11", "11.1111", "11..111", "11...11", "11...11"],
    "-": ["..", "..", "..", "11", "..", "..", ".."],
    O: [".1111.", "11..11", "11..11", "11..11", "11..11", "11..11", ".1111."],
    U: ["11..11", "11..11", "11..11", "11..11", "11..11", "11..11", ".1111."],
    T: ["111111", "..11..", "..11..", "..11..", "..11..", "..11..", "..11.."],
    L: ["11...", "11...", "11...", "11...", "11...", "11...", "11111"],
    S: [".1111.", "11..11", "11....", ".1111.", "....11", "11..11", ".1111."]
  };
  var PENTE = [2, 2, 1, 1, 1, 0, 0];
  function motPixel(droit, penche, couleur, ombre) {
    var trace = "", x0 = 0;
    (droit + penche).split("").forEach(function (lettre, i) {
      var dessin = LETTRES[lettre], incline = i >= droit.length;
      dessin.forEach(function (ligne, y) {
        for (var x = 0; x < ligne.length; x++) {
          if (ligne[x] === "1") trace += "M" + (x0 + x + (incline ? PENTE[y] : 0)) + " " + y + "h1v1h-1z";
        }
      });
      x0 += dessin[0].length + 1;
    });
    var l = x0 + 2, h = 8;
    return '<svg class="mot" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + l + ' ' + h + '" width="' + l * 2 + '" height="' + h * 2 +
      '" shape-rendering="crispEdges" aria-hidden="true"><path fill="' + ombre + '" transform="translate(1 1)" d="' + trace + '"/>' +
      '<path fill="' + couleur + '" d="' + trace + '"/></svg>';
  }
  var MOT_LOGO = motPixel("MINI-", "OUTILS", "#ffffff", "#0A1F8C");

  // Icône de l'entrée « Suivi des versions » du menu (petit robot), fournie par Simon.
  var ICONE_VERSIONS = '<svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M25 6H17V2C17 1.73478 16.8946 1.48043 16.7071 1.29289C16.5196 1.10536 16.2652 1 16 1C15.7348 1 15.4804 1.10536 15.2929 1.29289C15.1054 1.48043 15 1.73478 15 2V6H7C5.93913 6 4.92172 6.42143 4.17157 7.17157C3.42143 7.92172 3 8.93913 3 10V24C3 25.0609 3.42143 26.0783 4.17157 26.8284C4.92172 27.5786 5.93913 28 7 28H25C26.0609 28 27.0783 27.5786 27.8284 26.8284C28.5786 26.0783 29 25.0609 29 24V10C29 8.93913 28.5786 7.92172 27.8284 7.17157C27.0783 6.42143 26.0609 6 25 6ZM27 24C27 24.5304 26.7893 25.0391 26.4142 25.4142C26.0391 25.7893 25.5304 26 25 26H7C6.46957 26 5.96086 25.7893 5.58579 25.4142C5.21071 25.0391 5 24.5304 5 24V10C5 9.46957 5.21071 8.96086 5.58579 8.58579C5.96086 8.21071 6.46957 8 7 8H25C25.5304 8 26.0391 8.21071 26.4142 8.58579C26.7893 8.96086 27 9.46957 27 10V24ZM20.5 17H11.5C10.5717 17 9.6815 17.3687 9.02513 18.0251C8.36875 18.6815 8 19.5717 8 20.5C8 21.4283 8.36875 22.3185 9.02513 22.9749C9.6815 23.6313 10.5717 24 11.5 24H20.5C21.4283 24 22.3185 23.6313 22.9749 22.9749C23.6313 22.3185 24 21.4283 24 20.5C24 19.5717 23.6313 18.6815 22.9749 18.0251C22.3185 17.3687 21.4283 17 20.5 17ZM17.5 19V22H14.5V19H17.5ZM10 20.5C10 20.1022 10.158 19.7206 10.4393 19.4393C10.7206 19.158 11.1022 19 11.5 19H12.5V22H11.5C11.1022 22 10.7206 21.842 10.4393 21.5607C10.158 21.2794 10 20.8978 10 20.5ZM20.5 22H19.5V19H20.5C20.8978 19 21.2794 19.158 21.5607 19.4393C21.842 19.7206 22 20.1022 22 20.5C22 20.8978 21.842 21.2794 21.5607 21.5607C21.2794 21.842 20.8978 22 20.5 22ZM9 13.5C9 13.2033 9.08797 12.9133 9.2528 12.6666C9.41762 12.42 9.65189 12.2277 9.92597 12.1142C10.2001 12.0006 10.5017 11.9709 10.7926 12.0288C11.0836 12.0867 11.3509 12.2296 11.5607 12.4393C11.7704 12.6491 11.9133 12.9164 11.9712 13.2074C12.0291 13.4983 11.9994 13.7999 11.8858 14.074C11.7723 14.3481 11.58 14.5824 11.3334 14.7472C11.0867 14.912 10.7967 15 10.5 15C10.1022 15 9.72064 14.842 9.43934 14.5607C9.15804 14.2794 9 13.8978 9 13.5ZM20 13.5C20 13.2033 20.088 12.9133 20.2528 12.6666C20.4176 12.42 20.6519 12.2277 20.926 12.1142C21.2001 12.0006 21.5017 11.9709 21.7926 12.0288C22.0836 12.0867 22.3509 12.2296 22.5607 12.4393C22.7704 12.6491 22.9133 12.9164 22.9712 13.2074C23.0291 13.4983 22.9993 13.7999 22.8858 14.074C22.7723 14.3481 22.58 14.5824 22.3334 14.7472C22.0867 14.912 21.7967 15 21.5 15C21.1022 15 20.7206 14.842 20.4393 14.5607C20.158 14.2794 20 13.8978 20 13.5Z"></path></svg>';

  var ICONE_LOGICIELS = '<svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M22.5 18H20V14H22.5C23.39 14 24.26 13.7361 25.0001 13.2416C25.7401 12.7471 26.3169 12.0443 26.6575 11.2221C26.9981 10.3998 27.0872 9.49501 26.9135 8.6221C26.7399 7.74918 26.3113 6.94736 25.682 6.31802C25.0526 5.68868 24.2508 5.2601 23.3779 5.08647C22.505 4.91283 21.6002 5.00195 20.7779 5.34254C19.9557 5.68314 19.2529 6.25991 18.7584 6.99994C18.2639 7.73996 18 8.60999 18 9.5V12H14V9.5C14 8.60999 13.7361 7.73996 13.2416 6.99994C12.7471 6.25991 12.0443 5.68314 11.2221 5.34254C10.3998 5.00195 9.49501 4.91283 8.6221 5.08647C7.74918 5.2601 6.94736 5.68868 6.31802 6.31802C5.68868 6.94736 5.2601 7.74918 5.08647 8.6221C4.91283 9.49501 5.00195 10.3998 5.34254 11.2221C5.68314 12.0443 6.25991 12.7471 6.99994 13.2416C7.73996 13.7361 8.60999 14 9.5 14H12V18H9.5C8.60999 18 7.73996 18.2639 6.99994 18.7584C6.25991 19.2529 5.68314 19.9557 5.34254 20.7779C5.00195 21.6002 4.91283 22.505 5.08647 23.3779C5.2601 24.2508 5.68868 25.0526 6.31802 25.682C6.94736 26.3113 7.74918 26.7399 8.6221 26.9135C9.49501 27.0872 10.3998 26.9981 11.2221 26.6575C12.0443 26.3169 12.7471 25.7401 13.2416 25.0001C13.7361 24.26 14 23.39 14 22.5V20H18V22.5C18 23.39 18.2639 24.26 18.7584 25.0001C19.2529 25.7401 19.9557 26.3169 20.7779 26.6575C21.6002 26.9981 22.505 27.0872 23.3779 26.9135C24.2508 26.7399 25.0526 26.3113 25.682 25.682C26.3113 25.0526 26.7399 24.2508 26.9135 23.3779C27.0872 22.505 26.9981 21.6002 26.6575 20.7779C26.3169 19.9557 25.7401 19.2529 25.0001 18.7584C24.26 18.2639 23.39 18 22.5 18ZM20 9.5C20 9.00555 20.1466 8.5222 20.4213 8.11108C20.696 7.69995 21.0865 7.37952 21.5433 7.1903C22.0001 7.00108 22.5028 6.95158 22.9877 7.04804C23.4727 7.1445 23.9181 7.3826 24.2678 7.73223C24.6174 8.08187 24.8555 8.52732 24.952 9.01228C25.0484 9.49723 24.9989 9.9999 24.8097 10.4567C24.6205 10.9135 24.3001 11.304 23.8889 11.5787C23.4778 11.8534 22.9945 12 22.5 12H20V9.5ZM7 9.5C7 8.83696 7.26339 8.20108 7.73223 7.73223C8.20108 7.26339 8.83696 7 9.5 7C10.163 7 10.7989 7.26339 11.2678 7.73223C11.7366 8.20108 12 8.83696 12 9.5V12H9.5C8.83696 12 8.20108 11.7366 7.73223 11.2678C7.26339 10.7989 7 10.163 7 9.5ZM12 22.5C12 22.9945 11.8534 23.4778 11.5787 23.8889C11.304 24.3001 10.9135 24.6205 10.4567 24.8097C9.9999 24.9989 9.49723 25.0484 9.01228 24.952C8.52732 24.8555 8.08187 24.6174 7.73223 24.2678C7.3826 23.9181 7.1445 23.4727 7.04804 22.9877C6.95158 22.5028 7.00108 22.0001 7.1903 21.5433C7.37952 21.0865 7.69995 20.696 8.11108 20.4213C8.5222 20.1466 9.00555 20 9.5 20H12V22.5ZM14 14H18V18H14V14ZM22.5 25C21.837 25 21.2011 24.7366 20.7322 24.2678C20.2634 23.7989 20 23.163 20 22.5V20H22.5C23.163 20 23.7989 20.2634 24.2678 20.7322C24.7366 21.2011 25 21.837 25 22.5C25 23.163 24.7366 23.7989 24.2678 24.2678C23.7989 24.7366 23.163 25 22.5 25Z"/></svg>';
  // Icône de l'entrée « Manifeste » du menu : Chat Teardrop Text (Phosphor, graisse Fill).
  var ICONE_MANIFESTE = '<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M132,24A100.11,100.11,0,0,0,32,124v84a16,16,0,0,0,16,16h84a100,100,0,0,0,0-200Zm32,128H96a8,8,0,0,1,0-16h68a8,8,0,0,1,0,16Zm0-32H96a8,8,0,0,1,0-16h68a8,8,0,0,1,0,16Z"/></svg>';
  // Icônes du menu : bibliothèque Phosphor, graisse Regular (fichier Figma de Simon :
  // https://www.figma.com/design/nO8Hxc4PzMOU5bTxXDJFJW). « Goodies » : Images, graisse Fill.
  var ICONE_GOODIES = '<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M216,40H72A16,16,0,0,0,56,56V72H40A16,16,0,0,0,24,88V200a16,16,0,0,0,16,16H184a16,16,0,0,0,16-16V184h16a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM172,72a12,12,0,1,1-12,12A12,12,0,0,1,172,72Zm12,128H40V88H56v80a16,16,0,0,0,16,16H184Zm32-32H72V120.69l30.34-30.35a8,8,0,0,1,11.32,0L163.31,140,189,114.34a8,8,0,0,1,11.31,0L216,130.07V168Z"/></svg>';
  // Croix dans un rond plein (Phosphor X Circle, graisse Fill), pour annuler la recherche du menu :
  // arrondie comme le champ en pilule.
  var ICONE_EFFACER = '<svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm37.66,130.34a8,8,0,0,1-11.32,11.32L128,139.31l-26.34,26.35a8,8,0,0,1-11.32-11.32L116.69,128,90.34,101.66a8,8,0,0,1,11.32-11.32L128,116.69l26.34-26.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/></svg>';
  // Fantôme (Phosphor Ghost, graisse Fill), en crème, quand la recherche du menu ne trouve rien.
  var ICONE_FANTOME = '<svg class="fantome" width="28" height="28" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M128,24a96.11,96.11,0,0,0-96,96v96a8,8,0,0,0,13.07,6.19l24.26-19.85L93.6,222.19a8,8,0,0,0,10.13,0L128,202.34l24.27,19.85a8,8,0,0,0,10.13,0l24.27-19.85,24.26,19.85A8,8,0,0,0,224,216V120A96.11,96.11,0,0,0,128,24ZM100,128a12,12,0,1,1,12-12A12,12,0,0,1,100,128Zm56,0a12,12,0,1,1,12-12A12,12,0,0,1,156,128Z"/></svg>';
  var CHEVRON = '<svg class="chevron" width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3.5 5 6.5 8 3.5"/></svg>';
  var ICONE_INSTALLER = '<svg class="icone-installer" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M30.9999 16C31.0062 18.3814 30.2336 20.6996 28.7999 22.6012C28.7209 22.7063 28.6221 22.7948 28.5089 22.8616C28.3958 22.9284 28.2705 22.9724 28.1404 22.9908C28.0103 23.0093 27.8778 23.0019 27.7505 22.9692C27.6233 22.9364 27.5037 22.8789 27.3986 22.8C27.2936 22.721 27.2051 22.6221 27.1383 22.509C27.0714 22.3958 27.0275 22.2706 27.0091 22.1405C26.9906 22.0104 26.9979 21.8779 27.0307 21.7506C27.0634 21.6234 27.1209 21.5038 27.1999 21.3987C28.3734 19.844 29.0056 17.9478 28.9999 16C28.9999 13.613 28.0517 11.3238 26.3638 9.63601C24.676 7.94819 22.3868 6.99997 19.9999 6.99997C17.6129 6.99997 15.3238 7.94819 13.6359 9.63601C11.9481 11.3238 10.9999 13.613 10.9999 16C10.9999 16.2652 10.8945 16.5195 10.707 16.7071C10.5195 16.8946 10.2651 17 9.99988 17C9.73467 17 9.48031 16.8946 9.29278 16.7071C9.10524 16.5195 8.99988 16.2652 8.99988 16C8.9994 14.9908 9.13778 13.9864 9.41113 13.015C9.27489 13 9.13738 13 8.99988 13C7.40859 13 5.88246 13.6321 4.75724 14.7573C3.63203 15.8826 2.99988 17.4087 2.99988 19C2.99988 20.5913 3.63203 22.1174 4.75724 23.2426C5.88246 24.3678 7.40859 25 8.99988 25H11.9999C12.2651 25 12.5195 25.1053 12.707 25.2929C12.8945 25.4804 12.9999 25.7348 12.9999 26C12.9999 26.2652 12.8945 26.5195 12.707 26.7071C12.5195 26.8946 12.2651 27 11.9999 27H8.99988C7.9001 27.0002 6.81208 26.7737 5.80377 26.3346C4.79546 25.8955 3.88853 25.2532 3.1396 24.4478C2.39068 23.6424 1.81585 22.6913 1.45103 21.6538C1.08621 20.6162 0.939225 19.5147 1.01926 18.4178C1.09929 17.3209 1.40462 16.2523 1.91619 15.2788C2.42775 14.3052 3.13455 13.4476 3.99245 12.7595C4.85035 12.0713 5.84092 11.5675 6.90229 11.2794C7.96366 10.9913 9.07304 10.9251 10.1611 11.085C11.2691 8.86892 13.0928 7.09182 15.3368 6.04151C17.5808 4.99121 20.1136 4.72922 22.525 5.29798C24.9365 5.86674 27.0853 7.23294 28.6234 9.17529C30.1616 11.1176 30.9989 13.5224 30.9999 16ZM22.2924 21.2925L19.9999 23.5862V16C19.9999 15.7348 19.8945 15.4804 19.707 15.2929C19.5195 15.1053 19.2651 15 18.9999 15C18.7347 15 18.4803 15.1053 18.2928 15.2929C18.1052 15.4804 17.9999 15.7348 17.9999 16V23.5862L15.7074 21.2925C15.5197 21.1048 15.2652 20.9994 14.9999 20.9994C14.7345 20.9994 14.48 21.1048 14.2924 21.2925C14.1047 21.4801 13.9993 21.7346 13.9993 22C13.9993 22.2653 14.1047 22.5198 14.2924 22.7075L18.2924 26.7075C18.3853 26.8005 18.4955 26.8742 18.6169 26.9245C18.7383 26.9749 18.8685 27.0008 18.9999 27.0008C19.1313 27.0008 19.2614 26.9749 19.3828 26.9245C19.5042 26.8742 19.6145 26.8005 19.7074 26.7075L23.7074 22.7075C23.895 22.5198 24.0004 22.2653 24.0004 22C24.0004 21.7346 23.895 21.4801 23.7074 21.2925C23.5197 21.1048 23.2652 20.9994 22.9999 20.9994C22.7345 20.9994 22.48 21.1048 22.2924 21.2925Z"/></svg>';
  var ICONE_LIEN = '<svg width="18" height="18" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M30.0002 11.0287C29.9501 12.7695 29.2342 14.4248 28.0002 15.6537L23.6565 19.9999C23.0238 20.636 22.2713 21.1403 21.4424 21.4837C20.6136 21.827 19.7249 22.0024 18.8277 21.9999H18.8215C17.909 21.9993 17.0059 21.8158 16.1656 21.4603C15.3253 21.1048 14.5647 20.5844 13.9288 19.93C13.2929 19.2756 12.7947 18.5004 12.4634 17.6502C12.1322 16.8 11.9747 15.892 12.0002 14.9799C12.0077 14.7147 12.1202 14.4633 12.313 14.2811C12.5058 14.0988 12.7631 14.0006 13.0283 14.0081C13.2936 14.0155 13.545 14.128 13.7272 14.3209C13.9095 14.5137 14.0077 14.771 14.0002 15.0362C13.982 15.6811 14.0933 16.3231 14.3274 16.9243C14.5615 17.5255 14.9138 18.0736 15.3633 18.5364C15.8129 18.9991 16.3507 19.367 16.9448 19.6184C17.539 19.8698 18.1776 19.9995 18.8227 19.9999C19.4569 20.0016 20.0852 19.8775 20.6711 19.6348C21.2571 19.3921 21.7891 19.0357 22.2365 18.5862L26.5802 14.2424C27.4764 13.335 27.9772 12.1098 27.9732 10.8343C27.9692 9.55891 27.4608 8.33686 26.5589 7.435C25.6571 6.53313 24.435 6.0247 23.1596 6.02071C21.8842 6.01672 20.659 6.51749 19.7515 7.41369L18.3765 8.78869C18.1874 8.96831 17.9357 9.06697 17.6749 9.06363C17.4141 9.0603 17.165 8.95522 16.9806 8.77082C16.7962 8.58642 16.6911 8.33728 16.6878 8.07652C16.6844 7.81576 16.7831 7.56401 16.9627 7.37494L18.3377 5.99994C18.9721 5.36536 19.7253 4.86196 20.5542 4.51851C21.3832 4.17506 22.2717 3.99829 23.169 3.99829C24.0663 3.99829 24.9548 4.17506 25.7837 4.51851C26.6127 4.86196 27.3659 5.36536 28.0002 5.99994C28.6573 6.65864 29.1735 7.44416 29.5173 8.30868C29.8611 9.1732 30.0254 10.0986 30.0002 11.0287ZM13.6252 23.2074L12.2502 24.5824C11.8018 25.0339 11.268 25.3917 10.68 25.635C10.0921 25.8784 9.46157 26.0024 8.82522 25.9999C7.8706 25.9992 6.93763 25.7155 6.14418 25.1847C5.35073 24.6539 4.73242 23.8998 4.36737 23.0177C4.00232 22.1357 3.9069 21.1652 4.09319 20.2289C4.27947 19.2926 4.73909 18.4326 5.41398 17.7574L9.75023 13.4137C10.4332 12.7271 11.3069 12.2617 12.2577 12.0781C13.2086 11.8944 14.1927 12.0008 15.0823 12.3836C15.9718 12.7664 16.7258 13.4078 17.2461 14.2246C17.7665 15.0413 18.0292 15.9957 18.0002 16.9637C17.9928 17.2289 18.091 17.4862 18.2732 17.679C18.4555 17.8719 18.7069 17.9844 18.9721 17.9918C19.2373 17.9993 19.4946 17.9011 19.6874 17.7188C19.8803 17.5366 19.9928 17.2852 20.0002 17.0199C20.0242 16.0914 19.8593 15.1676 19.5155 14.3046C19.1717 13.4417 18.6562 12.6576 18.0002 11.9999C16.7192 10.7195 14.9821 10.0002 13.1708 10.0002C11.3596 10.0002 9.6225 10.7195 8.34148 11.9999L4.00023 16.3437C3.04551 17.298 2.39512 18.5139 2.13124 19.8378C1.86736 21.1616 2.00183 22.534 2.51766 23.7814C3.0335 25.0289 3.90754 26.0954 5.02934 26.8463C6.15113 27.5971 7.47033 27.9986 8.82022 27.9999C9.71756 28.0025 10.6065 27.8271 11.4356 27.4838C12.2647 27.1405 13.0174 26.6361 13.6502 25.9999L15.0252 24.6249C15.1871 24.4343 15.2716 24.19 15.2622 23.9401C15.2528 23.6902 15.1501 23.453 14.9744 23.275C14.7987 23.0971 14.5627 22.9915 14.3129 22.979C14.0632 22.9665 13.8178 23.048 13.6252 23.2074Z"/></svg>';
  // Icône de l'entrée « Accueil » du menu : House (Phosphor, graisse Fill).
  var ICONE_ACCUEIL = '<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M224,120v96a8,8,0,0,1-8,8H160a8,8,0,0,1-8-8V164a4,4,0,0,0-4-4H108a4,4,0,0,0-4,4v52a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V120a16,16,0,0,1,4.69-11.31l80-80a16,16,0,0,1,22.62,0l80,80A16,16,0,0,1,224,120Z"/></svg>';

  // Remplit <nav id="menu"> et branche l'ouverture du menu sur petit écran.
  // Le site et les outils sont en bêta : étiquette sur le logo du menu et dans la barre mobile.
  var BETA = '<span class="beta">Bêta</span>';
  // Raccourci de la recherche du menu, écrit comme sur le clavier du poste : ⌘K sur Mac, Ctrl+K ailleurs.
  var RACCOURCI = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘K" : "Ctrl+K";
  function menu() {
    var nav = $("menu");
    if (!nav) return;
    var barre = document.querySelector("#barre-mobile > span");
    if (barre && !barre.querySelector(".beta")) barre.insertAdjacentHTML("beforeend", " " + BETA);
    var page = location.pathname.split("/").pop() || "index.html";
    // Chaque catégorie du menu est un accordéon : son titre est un bouton qui déplie ses
    // entrées. À chaque chargement, seule « Outils de production » est dépliée ; les autres
    // sont repliées, sauf celle de la page affichée. Un clic sur un titre replie ou déplie
    // sa seule catégorie.
    var rubrique = function (cle, titre, contenu, classe) {
      var ouverte = cle === "production" || contenu.indexOf('aria-current="page"') !== -1;
      return '<h2' + (classe ? ' class="' + classe + '"' : '') + '><button type="button" class="rubrique" data-cle="' + cle +
             '" aria-expanded="' + ouverte + '" aria-controls="rubrique-' + cle + '"><span>' + titre + '</span>' + CHEVRON + '</button></h2>' +
             '<div class="groupe' + (classe ? ' ' + classe : '') + '" id="rubrique-' + cle + '"' + (ouverte ? '' : ' hidden') + '>' + contenu + '</div>';
    };
    nav.innerHTML =
      '<a class="logo" href="index.html" title="Accueil" aria-label="Mini-outils, version bêta, accueil"><span class="logo-mot">' + MOT_LOGO + BETA + '</span></a>' +
      '<div class="recherche-menu"><input id="recherche-menu" type="search" autocomplete="off" spellcheck="false" ' +
      'placeholder="Chercher un outil en cliquant ' + RACCOURCI + '" aria-label="Rechercher un outil dans le menu" aria-keyshortcuts="Control+K Meta+K" title="Ctrl+K ou ⌘K">' +
      '<button type="button" id="effacer-recherche" class="effacer-recherche" aria-label="Annuler la recherche" title="Annuler la recherche" hidden>' +
      ICONE_EFFACER + '</button></div>' +
      '<div class="defile">' +
      '<a class="entree" href="index.html"' + (page === "index.html" ? ' aria-current="page"' : '') +
      ' title="Accueil"><span class="num">' + ICONE_ACCUEIL + '</span><span class="lib">Accueil</span></a>' +
      '<a class="entree" href="manifeste.html"' + (page === "manifeste.html" ? ' aria-current="page"' : '') +
      ' title="Manifeste"><span class="num">' + ICONE_MANIFESTE + '</span><span class="lib">Manifeste</span></a>' +
      rubrique("production", "Outils de production", PRODUCTION.map(function (o, i) {
        return '<a class="entree outil" href="' + o.fichier + '"' + (o.fichier === page ? ' aria-current="page"' : '') +
               ' title="' + o.nom + '"><span class="num">' + deux(i + 1) + '</span><span class="lib">' + o.nom + '</span></a>';
      }).join(""), "outil") +
      rubrique("revision", "Outils de révision", REVISION.map(function (o, i) {
        return '<a class="entree outil" href="' + o.fichier + '"' + (o.fichier === page ? ' aria-current="page"' : '') +
               ' title="' + o.nom + '"><span class="num">' + deux(i + 1) + '</span><span class="lib">' + o.nom + '</span></a>';
      }).join(""), "outil") +
      rubrique("analyse", "Analyse", ANALYSE.map(function (o, i) {
        return '<a class="entree outil" href="' + o.fichier + '"' + (o.fichier === page ? ' aria-current="page"' : '') +
               ' title="' + o.nom + '"><span class="num">' + deux(i + 1) + '</span><span class="lib">' + o.nom + '</span></a>';
      }).join(""), "outil") +
      rubrique("dashboard", "Dashboard", DASHBOARD.length ? DASHBOARD.map(function (o, i) {
        return '<a class="entree outil" href="' + o.fichier + '"' + (o.fichier === page ? ' aria-current="page"' : '') +
               ' title="' + o.nom + '"><span class="num">' + deux(i + 1) + '</span><span class="lib">' + o.nom + '</span></a>';
      }).join("") : '<span class="entree-vide">À venir</span>', "outil") +
      rubrique("referentiel", "Référentiel", REFERENTIEL.map(function (o, i) {
        return '<a class="entree" href="' + o.fichier + '"' + (o.fichier === page ? ' aria-current="page"' : '') +
               ' title="' + o.nom + '"><span class="num">' + deux(i + 1) + '</span><span class="lib">' + o.nom + '</span></a>';
      }).join("")) +
      rubrique("a-propos", "À propos",
      '<a class="entree" href="logiciels-compatibles.html"' + (page === "logiciels-compatibles.html" ? ' aria-current="page"' : '') +
      ' title="Logiciels compatibles"><span class="num">' + ICONE_LOGICIELS + '</span>' +
      '<span class="lib">Logiciels compatibles</span></a>' +
      '<a class="entree" href="versions.html"' + (page === "versions.html" ? ' aria-current="page"' : '') +
      ' title="Suivi des versions"><span class="num">' + ICONE_VERSIONS + '</span>' +
      '<span class="lib">Suivi des versions</span></a>' +
      '<a class="entree" href="goodies.html"' + (page === "goodies.html" ? ' aria-current="page"' : '') +
      ' title="Goodies"><span class="num">' + ICONE_GOODIES + '</span>' +
      '<span class="lib">Goodies</span></a>') +
      '<span class="entree-vide" id="menu-aucun" hidden>' + ICONE_FANTOME + 'Aucune page trouvée</span>' +
      '</div>' +
      // Encart slogan vers l'accueil, au-dessus du trait qui sépare le bas du menu ;
      // inutile sur l'accueil lui-même, qui porte déjà ce bandeau.
      (page === "index.html" ? '' :
        '<div class="encart-zone"><a class="encart" href="index.html"><strong>Quand la période fiscale se déchaîne, <em>gardez le cap.</em></strong>' +
        '<small>Laissez les écritures répétitives à Mini-outils-compta.fr</small></a></div>') +
      '<div class="pied"><button id="installer" type="button">Installer l’application</button>' +
      '<span id="installer-info" role="status" hidden></span>' +
      // Deux lignes pour gagner de la place : « bêta » reste sur la pastille du logo.
      '<span>Calcul dans votre navigateur</span>' +
      '<span>Rien n\'est envoyé · <a class="version" href="versions.html" title="Version ' + VERSION + ' (bêta) : suivi des versions">v' + VERSION + '</a></span></div>';
    // Le menu n'est plus repliable : on efface le choix qu'une ancienne version a pu mémoriser.
    try { localStorage.removeItem("mini-outils-menu-replie"); } catch (e) {}
    // Les accordéons ne mémorisent plus rien non plus.
    try { localStorage.removeItem("mini-outils-rubriques-repliees"); } catch (e) {}

    nav.addEventListener("click", function (e) {
      var b = e.target.closest(".rubrique");
      if (!b) return;
      var ouvrir = b.getAttribute("aria-expanded") !== "true";
      b.setAttribute("aria-expanded", String(ouvrir));
      $("rubrique-" + b.getAttribute("data-cle")).hidden = !ouvrir;
    });

    // Recherche du menu : elle filtre les entrées à la frappe, toutes catégories confondues.
    // Chaque mot saisi doit se retrouver dans le nom de la page ou dans celui de sa
    // catégorie, sans tenir compte des accents ni des majuscules. Les catégories qui ont
    // un résultat se déplient, les autres disparaissent ; vider le champ remet le menu
    // comme il était. Entrée ouvre le premier résultat, Échap vide le champ.
    var champ = $("recherche-menu"), avant = null;
    var simple = function (t) { return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); };
    var filtre = function () {
      var mots = simple(champ.value).split(/\s+/).filter(Boolean);
      var titres = nav.querySelectorAll(".rubrique"), libres = nav.querySelectorAll(".defile > .entree");
      if (!mots.length) {
        if (!avant) return;
        Array.prototype.forEach.call(nav.querySelectorAll(".defile .entree"), function (a) { a.hidden = false; });
        Array.prototype.forEach.call(titres, function (b) {
          b.parentNode.hidden = false;
          b.setAttribute("aria-expanded", String(avant[b.getAttribute("data-cle")]));
          $("rubrique-" + b.getAttribute("data-cle")).hidden = !avant[b.getAttribute("data-cle")];
        });
        $("menu-aucun").hidden = true;
        avant = null;
        return;
      }
      if (!avant) {
        avant = {};
        Array.prototype.forEach.call(titres, function (b) { avant[b.getAttribute("data-cle")] = b.getAttribute("aria-expanded") === "true"; });
      }
      var correspond = function (texte) { return mots.every(function (m) { return texte.indexOf(m) !== -1; }); };
      var trouves = 0;
      Array.prototype.forEach.call(libres, function (a) {
        a.hidden = !correspond(simple(a.textContent));
        if (!a.hidden) trouves++;
      });
      Array.prototype.forEach.call(titres, function (b) {
        var groupe = $("rubrique-" + b.getAttribute("data-cle")), titre = simple(b.textContent), nombre = 0;
        Array.prototype.forEach.call(groupe.querySelectorAll(".entree"), function (a) {
          a.hidden = !correspond(titre + " " + simple(a.querySelector(".lib").textContent));
          if (!a.hidden) nombre++;
        });
        b.parentNode.hidden = !nombre;
        b.setAttribute("aria-expanded", String(nombre > 0));
        groupe.hidden = !nombre;
        trouves += nombre;
      });
      $("menu-aucun").hidden = trouves > 0;
    };
    // La croix crème au bout du champ n'apparaît que s'il y a du texte ; elle vide le champ
    // comme Échap et y laisse le curseur.
    var effacer = $("effacer-recherche");
    var croix = function () { effacer.hidden = !champ.value; };
    var vide = function () { champ.value = ""; filtre(); croix(); };
    champ.addEventListener("input", function () { filtre(); croix(); });
    effacer.addEventListener("click", function () { vide(); champ.focus(); });
    champ.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && champ.value) { vide(); e.stopPropagation(); }
      if (e.key === "Enter") {
        var premier = nav.querySelector(".defile .entree:not([hidden])");
        if (premier && champ.value.trim()) location.href = premier.getAttribute("href");
      }
    });

    var ouvrir = $("ouvrir"), fond = $("fond");
    var bascule = function (etat) {
      document.body.classList.toggle("menu-ouvert", etat);
      if (ouvrir) ouvrir.setAttribute("aria-expanded", String(etat));
    };
    if (ouvrir) ouvrir.addEventListener("click", function () { bascule(!document.body.classList.contains("menu-ouvert")); });
    if (fond) fond.addEventListener("click", function () { bascule(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") bascule(false); });
    // Ctrl+K (Cmd+K sur Mac) place le curseur dans la recherche du menu, en ouvrant le
    // menu sur petit écran ; le texte déjà tapé est sélectionné pour être remplacé.
    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        bascule(true);
        champ.focus();
        champ.select();
      }
    });
  }

  // Montant saisi "1 234,56" -> centimes (entier). Vide -> 0. Invalide -> NaN.
  function centimes(txt) {
    var s = String(txt).replace(/[\s  €%]/g, "").replace(",", ".");
    if (s === "") return 0;
    if (!/^-?\d*\.?\d*$/.test(s) || s === "." || s === "-") return NaN;
    return Math.round(parseFloat(s) * 100);
  }
  function deux(n) { return (n < 10 ? "0" : "") + n; }
  // Code de pièce de six caractères, lettres majuscules et chiffres (« 7K2QF9 »), calculé
  // à partir d'un texte : le même texte redonne toujours le même code.
  function code6(texte) {
    var h = 7;
    for (var i = 0; i < texte.length; i++) h = (h * 131 + texte.charCodeAt(i)) % 2176782336;   // 36 puissance 6
    return ("00000" + h.toString(36).toUpperCase()).slice(-6);
  }
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
    // Bloc de contrôle (totaux, équilibre, nombre de lignes) : facultatif, une page peut s'en passer.
    if ($("totDebit")) $("totDebit").textContent = affiche(totD);
    if ($("totCredit")) $("totCredit").textContent = affiche(totC);
    var eq = $("equilibre");
    if (eq) {
      eq.className = ecritures.length ? (equilibre ? "ok" : "ecart") : "";
      eq.textContent = ecritures.length ? (equilibre ? "OK" : "Écart de " + affiche(Math.abs(totD - totC))) : "—";
    }
    if ($("nbLignes")) $("nbLignes").textContent = ecritures.length;
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
    copierTexte(texteACopier(), ecritures.length + " lignes copiées", tempsGagne(ecritures.length));
  }

  // Temps gagné à la copie : on part du principe qu'une ligne d'écriture saisie à la
  // main prend 25 secondes en moyenne. Renvoie le titre affiché dans le message.
  var SECONDES_PAR_LIGNE = 25;
  // La durée est arrondie à la minute inférieure, avec un minimum d'une minute.
  function duree(secondes) {
    var minutes = Math.max(1, Math.floor(secondes / 60));
    var h = Math.floor(minutes / 60), m = minutes % 60;
    if (h) return h + " h" + (m ? " " + deux(m) + " min" : "");
    return m + (m > 1 ? " minutes" : " minute");
  }
  function tempsGagne(lignes) {
    if (!lignes) return null;
    // Seule la durée est affichée, sans le détail du calcul.
    return { titre: "Bravo ! Vous venez de gagner approximativement " + duree(lignes * SECONDES_PAR_LIGNE) + "." };
  }

  // Copie réussie : petit jet de confettis depuis le bouton et message de félicitations.
  // « message » vient de tempsGagne() ; sans lui, le message reste général.
  var bravo = null, bravoFin = null;
  function fete(bouton, message) {
    if (!bravo) {
      bravo = document.createElement("div");
      bravo.className = "bravo";
      bravo.setAttribute("role", "status");
      document.body.appendChild(bravo);
    }
    bravo.textContent = "";
    var titre = document.createElement("strong");
    titre.textContent = message ? message.titre : "Bravo ! Vous venez de gagner du temps !";
    bravo.appendChild(titre);
    if (message && message.detail) {
      var detail = document.createElement("small");
      detail.textContent = message.detail;
      bravo.appendChild(detail);
    }
    bravo.classList.remove("visible");
    void bravo.offsetWidth; // relance l'animation d'apparition à chaque copie
    bravo.classList.add("visible");
    clearTimeout(bravoFin);
    bravoFin = setTimeout(function () { bravo.classList.remove("visible"); }, 4500);

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
  function copierTexte(txt, message, gain) {
    var ok = function () { $("etat").textContent = message; fete($("copier"), gain); };
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

  // Bouton « Copier le lien pour le partager », en haut à droite de chaque page : copie
  // l'adresse de la page, sans ses paramètres. Sur téléphone, seule l'icône est affichée.
  function lienPage() {
    var contenu = $("contenu");
    if (!contenu) return;
    var bouton = document.createElement("button");
    bouton.type = "button";
    bouton.id = "copier-lien";
    bouton.title = "Copier le lien de cette page pour le partager";
    // Le nom du bouton reste annoncé sur téléphone, où son texte est masqué.
    bouton.setAttribute("aria-label", "Copier le lien pour le partager");
    bouton.innerHTML = ICONE_LIEN + '<span class="texte">Copier le lien pour le partager</span>';
    contenu.appendChild(bouton);
    var message = $("message-copie");
    if (!message) {
      message = document.createElement("div");
      message.id = "message-copie";
      message.setAttribute("role", "status");
      message.setAttribute("aria-live", "polite");
      document.body.appendChild(message);
    }
    var fin = null;
    var annonce = function (texte, reussi) {
      message.textContent = texte;
      message.classList.add("visible");
      bouton.classList.toggle("fait", reussi);
      clearTimeout(fin);
      fin = setTimeout(function () { message.classList.remove("visible"); bouton.classList.remove("fait"); }, 1600);
    };
    bouton.addEventListener("click", function () {
      var adresse = location.origin + location.pathname.replace(/index\.html$/, "");
      var ok = function () { annonce("Lien copié : " + adresse.replace(/^https?:\/\//, ""), true); };
      var secours = function () {
        var ta = document.createElement("textarea");
        ta.value = adresse;
        ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        var reussi = false;
        try { reussi = document.execCommand("copy"); } catch (e) { reussi = false; }
        document.body.removeChild(ta);
        if (reussi) ok(); else annonce("Copie impossible dans ce navigateur", false);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(adresse).then(ok, secours);
      else secours();
    });
  }

  // Icône d'onglet : le « M » du logo, en bleu.
  function icone() {
    var lien = document.createElement("link");
    lien.rel = "icon";
    lien.href = "data:image/svg+xml," + encodeURIComponent(iconeM("#1136DB", "#7d93f0"));
    document.head.appendChild(lien);
  }

  // Recherche des pages du référentiel (colonne de filtres) : la même croix ronde que la
  // recherche du menu, en bleu, au bout du champ. Elle n'apparaît que s'il y a du texte
  // (règle CSS sur le texte d'invite) ; elle vide le champ, comme Échap, et y laisse le curseur.
  function croixRecherche() {
    Array.prototype.forEach.call(document.querySelectorAll("#filtres input[type=search]"), function (champ) {
      var cadre = document.createElement("div");
      cadre.className = "recherche-ref";
      champ.parentNode.insertBefore(cadre, champ);
      cadre.appendChild(champ);
      var croix = document.createElement("button");
      croix.type = "button";
      croix.className = "effacer-recherche";
      croix.setAttribute("aria-label", "Annuler la recherche");
      croix.title = "Annuler la recherche";
      croix.innerHTML = ICONE_EFFACER;
      cadre.appendChild(croix);
      var vide = function () { champ.value = ""; champ.dispatchEvent(new Event("input", { bubbles: true })); };
      croix.addEventListener("click", function () { vide(); champ.focus(); });
      champ.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && champ.value) { vide(); e.stopPropagation(); }
      });
    });
  }

  // Note de calcul lisible : une phrase par ligne. Une phrase qui énumère au moins trois
  // éléments séparés par « ; » devient une liste : son introduction (jusqu'au « : » qui précède
  // la liste) sur une ligne, puis un élément par ligne précédé de « - ». Une coupure ne se fait
  // qu'après un point suivi d'une majuscule : « art. 39 » ou « 6,8 / 9,7 » ne sont pas coupés.
  // La note copiée garde ces retours à la ligne. Dans une note, les milliers sont séparés par un
  // point (« 7.200,00 ») : l'espace fine insécable que mettent affiche() et les formats des pages
  // devient « . » ; une espace ordinaire entre deux nombres (« T2 2025 136,81 ») reste.
  function aLaLigne(texte) {
    if (!texte) return texte;
    return String(texte).replace(/(\d)[\u202f\u00a0](?=\d{3}(?!\d))/g, "$1.").split("\n").map(function (bloc) {
      // Découpe après « . » suivi d'une majuscule, ou après un chiffre suivi de « . » puis d'un
      // chiffre (« au 26/09/2026. 3 écritures »), sans « lookbehind », que d'anciens Safari ignorent.
      var phrases = bloc.replace(/\. (?=[A-ZÀ-ÖØ-ÞŒ«(])/g, ".\u0001").replace(/(\d)\. (?=\d)/g, "$1.\u0001").split("\u0001");
      return phrases.map(function (phrase) {
        var elements = phrase.split(" ; ");
        if (elements.length < 2) return phrase;
        if (elements.length < 3) return elements.join(" ;\n");
        var deux = elements[0].lastIndexOf(" : "), intro = "";
        if (deux !== -1) { intro = elements[0].slice(0, deux) + " :\n"; elements[0] = elements[0].slice(deux + 3); }
        return intro + elements.map(function (e, k) { return "- " + e + (k < elements.length - 1 ? " ;" : ""); }).join("\n");
      }).join("\n");
    }).join("\n");
  }

  // Calculs d'une note (« 7 200,00 Euros x 50 % = 3 600,00 Euros », « (8 000 km x 0,357) + 1 395 »),
  // affichés en bleu gras. Un calcul : des opérandes (montant avec son unité, code de case suivi
  // d'un montant comme « BK 15 000,00 », mots suivis d'un montant comme « somme des crédits
  // 20,00 Euros », ou mot seul comme « solde ») reliés par x, /, +, - ou =, avec au moins un =,
  // un x ou un / : « compte 445660 - Restaurant » ou « 13/06/2026 » ne sont pas des calculs.
  var CALCUL = (function () {
    var nb = "\\(*\\d+(?:[. \\u202f\\u00a0]\\d{3})*(?:,\\d+)?(?: ?(?:Euros|€\\/m2|€|m2|%|km|jours?|lavages?|ans))?\\)*";
    var mots = "[a-zà-ÿœ']+(?: [a-zà-ÿœ']+){0,3}";
    // Le premier opérande n'est jamais précédé de mots (« coefficients 6,8 / 9,7 » -> « 6,8 / 9,7 ») ;
    // les suivants peuvent l'être (« - somme des crédits 20,00 Euros », « - abattement de 26 % … »).
    var premier = "(?:\\(*[A-Z]{2} " + nb + "|" + nb + "|\\(*[a-zà-ÿœ]+\\)*)";
    var operande = "(?:\\(*[A-Z]{2} " + nb + "|\\(*" + mots + " " + nb + "(?: " + nb + ")?|" + nb + "|\\(*[a-zà-ÿœ]+\\)*)";
    return new RegExp(premier + "(?: (?:x|×|/|\\+|-|=) " + operande + ")+", "g");
  })();
  // Petits mots qu'un calcul ne garde pas en tête (« soit 48 lavages x 4,00 » -> « 48 lavages… »).
  var MOTS_VIDES = /^(?:(?:de|du|des|d'|le|la|les|l'|à|au|aux|pour|par|sur|en|et|soit|porté|portée|portés|portées) )+/;
  function calculs(texte) {
    var morceaux = [], debut = 0, m;
    CALCUL.lastIndex = 0;
    while ((m = CALCUL.exec(texte))) {
      var i = m.index, t = m[0];
      // Pas de départ au milieu d'un mot (« omme des… » dans « Somme des… »).
      if (i > 0 && /[A-Za-zÀ-ÿœ']/.test(texte.charAt(i - 1))) { CALCUL.lastIndex = i + 1; continue; }
      if (!/ (?:=|x|×|\/) /.test(t) || !/\d/.test(t)) continue;
      var vide = t.match(MOTS_VIDES);
      if (vide) { i += vide[0].length; t = t.slice(vide[0].length); }
      // Un mot suivi de « = » en tête est le nom du résultat (« mensuel = 14,50… »), pas un opérande.
      var nomResultat = t.match(/^[a-zà-ÿœ']+ = (?=\S)/);
      if (nomResultat && /\d/.test(t.charAt(nomResultat[0].length)) ) { i += nomResultat[0].length; t = t.slice(nomResultat[0].length); }
      morceaux.push({ texte: texte.slice(debut, i) }, { texte: t, calcul: true });
      debut = i + t.length;
    }
    morceaux.push({ texte: texte.slice(debut) });
    return morceaux;
  }
  // Affiche une note dans son cadre : texte brut (retours à la ligne compris), calculs en
  // <strong class="calcul">. Rien n'est interprété comme du HTML.
  function afficheNote(cadre, texte) {
    cadre.textContent = "";
    calculs(String(texte || "")).forEach(function (m) {
      if (!m.texte) return;
      if (m.calcul) { var s = document.createElement("strong"); s.className = "calcul"; s.textContent = m.texte; cadre.appendChild(s); }
      else cadre.appendChild(document.createTextNode(m.texte));
    });
  }

  // Second menu repliable des pages du référentiel (colonne #filtres) : un chevron en haut de
  // la colonne la replie sur ordinateur. Le champ de recherche (le même, avec sa croix) passe
  // alors au-dessus de la liste (#liste), avec le nombre de résultats, un bouton « Filtres »
  // qui rouvre la colonne et le rappel des filtres restés actifs. La colonne est affichée à
  // chaque visite ; sur téléphone, elle reste un volet.
  //   var repli = M.secondMenu(["compte", "comptes"]);
  //   repli.maj(nombre, ["catégorie « D. Charges »"]);   // à la fin de chaque affichage
  var CHEVRON_GAUCHE = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5"/></svg>';
  var CHEVRON_DROITE = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5"/></svg>';
  function secondMenu(unite) {
    var filtres = $("filtres"), liste = $("liste"), champ = $("recherche");
    if (!filtres || !liste || !champ) return { maj: function () {} };
    var cadre = champ.parentNode, ancre = cadre.nextElementSibling;
    var replier = document.createElement("button");
    replier.type = "button";
    replier.id = "replier-filtres";
    replier.className = "replier-filtres";
    replier.setAttribute("aria-controls", "filtres");
    replier.setAttribute("aria-expanded", "true");
    replier.setAttribute("aria-label", "Replier la recherche et les filtres");
    replier.title = "Replier la recherche et les filtres";
    replier.innerHTML = CHEVRON_GAUCHE;
    filtres.querySelector("header div").appendChild(replier);
    var barre = document.createElement("div");
    barre.className = "pcg-recherche-haut";
    barre.id = "recherche-haut";
    barre.hidden = true;
    barre.innerHTML = '<div class="ligne"><div class="emplacement" id="emplacement-haut"></div><span class="etat" id="compteur-haut"></span>' +
      '<button id="deplier-filtres" class="btn ghost" type="button" aria-controls="filtres" aria-expanded="false" ' +
      'title="Afficher la recherche et les filtres">Filtres ' + CHEVRON_DROITE + '</button></div>' +
      '<p class="filtre-actif" id="filtre-haut" hidden><span id="filtre-haut-texte"></span> <button type="button" id="effacer-haut">Tout afficher</button></p>';
    liste.parentNode.insertBefore(barre, liste);
    var large = window.matchMedia("(min-width: 821px)"), choisi = false;
    // Une version précédente gardait le repli du plan de comptes d'une visite à l'autre.
    try { localStorage.removeItem("mini-outils-pcg-filtres-replies"); } catch (e) {}
    var replie = function (etat) {
      etat = etat && large.matches;
      document.body.classList.toggle("filtres-replies", etat);
      barre.hidden = !etat;
      if (etat) $("emplacement-haut").appendChild(cadre);
      else filtres.querySelector(".defile").insertBefore(cadre, ancre);
      replier.setAttribute("aria-expanded", String(!etat));
      $("deplier-filtres").setAttribute("aria-expanded", String(!etat));
    };
    var choisit = function (etat) {
      choisi = etat;
      replie(etat);
      (etat ? champ : replier).focus();
    };
    replier.addEventListener("click", function () { choisit(true); });
    $("deplier-filtres").addEventListener("click", function () { choisit(false); });
    $("effacer-haut").addEventListener("click", function () { if ($("effacer")) $("effacer").click(); });
    var suit = function () { replie(choisi); };
    if (large.addEventListener) large.addEventListener("change", suit); else if (large.addListener) large.addListener(suit);
    return {
      maj: function (nombre, actifs) {
        $("compteur-haut").textContent = ($("compteur") ? $("compteur").textContent : String(nombre)) + " " + unite[nombre > 1 ? 1 : 0];
        $("filtre-haut").hidden = !actifs.length;
        $("filtre-haut-texte").textContent = actifs.length ? "Filtre actif : " + actifs.join(", ") + "." : "";
      }
    };
  }

  // Étiquette du type d'outil (Calcul, Balance, Détail d'un compte) : sur la page de l'outil, à la
  // suite du surtitre au-dessus du titre ; sur l'accueil, sur la carte de chaque outil.
  function etiquettesType() {
    var tous = OUTILS.concat(ANALYSE, DASHBOARD);
    var etiquette = function (outil) {
      var t = TYPES[outil.type];
      if (!t) return null;
      var e = document.createElement("span");
      e.className = "type-outil type-" + outil.type;
      e.textContent = t.nom;
      e.title = t.aide;
      return e;
    };
    var page = location.pathname.split("/").pop() || "index.html";
    var outil = tous.filter(function (o) { return o.fichier === page; })[0];
    var surtitre = document.querySelector("main .conteneur > .eyebrow");
    if (outil && surtitre) { var e = etiquette(outil); if (e) surtitre.appendChild(e); }
    Array.prototype.forEach.call(document.querySelectorAll("a.carte[href]"), function (carte) {
      var o = tous.filter(function (x) { return x.fichier === carte.getAttribute("href"); })[0];
      var e = o && etiquette(o), suite = carte.querySelector(".suite");
      if (e) carte.insertBefore(e, suite);
    });
  }

  // Ajoute « Réinitialiser » en tête du premier panneau de saisie : tous les champs
  // reprennent les données de départ de l'outil (exemple compris), puis le calcul est relancé.
  // Ces valeurs sont relevées une fois la page chargée, après que son propre script a rempli
  // ses champs. Une page qui garde un choix en mémoire hors des champs (ligne ou journal
  // cochés dans un tableau) écoute l'évènement « mini-outils-reinitialise », envoyé quand les
  // champs ont repris leurs valeurs et avant que le calcul soit relancé.
  function reinitialisation() {
    var champs = document.querySelectorAll("#contenu input, #contenu select, #contenu textarea");
    if (!champs.length) return;
    var panneau = champs[0].closest(".panel");
    var titre = panneau.querySelector(".eyebrow");
    var barre = document.createElement("div");
    barre.className = "barre";
    titre.parentNode.insertBefore(barre, titre);
    barre.appendChild(titre);
    var bouton = document.createElement("button");
    bouton.type = "button";
    bouton.id = "reinit";
    bouton.className = "btn ghost";
    bouton.textContent = "Réinitialiser";
    bouton.title = "Remettre les données de départ de l'outil";
    barre.appendChild(bouton);
    // Données de départ : relevées au chargement complet de la page. Un champ de fichier ne
    // peut pas être rempli par le script : il est seulement vidé.
    var depart = null;
    var releve = function () {
      depart = Array.prototype.map.call(champs, function (c) { return c.type === "checkbox" || c.type === "radio" ? c.checked : c.value; });
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", releve);
    else setTimeout(releve, 0);
    bouton.addEventListener("click", function () {
      if (!depart) releve();
      Array.prototype.forEach.call(champs, function (c, k) {
        if (c.type === "checkbox" || c.type === "radio") c.checked = depart[k];
        else if (c.type === "file") c.value = "";
        else c.value = depart[k];
      });
      document.dispatchEvent(new Event("mini-outils-reinitialise"));
      Array.prototype.forEach.call(champs, function (c) {
        c.dispatchEvent(new Event("input", { bubbles: true }));
        if (c.tagName === "SELECT" || c.type === "checkbox" || c.type === "radio") c.dispatchEvent(new Event("change", { bubbles: true }));
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
    // La page, le manifeste, puis tous les scripts et feuilles de style que la page charge
    // depuis le site : une page comme le plan de comptes a aussi son fichier de données.
    var fichiers = [location.href.split("#")[0], "manifest.webmanifest"];
    Array.prototype.forEach.call(document.querySelectorAll('script[src], link[rel="stylesheet"][href]'), function (e) {
      var adresse = e.src || e.href;
      if (adresse.indexOf(location.origin + "/") === 0 && fichiers.indexOf(adresse) === -1) fichiers.push(adresse);
    });
    Promise.all(fichiers.map(function (f) {
      return fetch(f, { cache: "reload" }).catch(function () {});
    })).then(function () { location.reload(); });
  }
  var DELAI_MAJ = 60000, majPrevue = null;   // une minute entre la détection et le rechargement
  function verifieVersion() {
    if (!enLigne) return;
    // Le numéro publié est lu dans version.json (quelques octets) plutôt qu'en retéléchargeant
    // commun.js en entier à chaque page vue.
    fetch("version.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (publie) {
        var m = publie && publie.version ? [null, String(publie.version)] : null;
        if (!m || m[1] === VERSION) return;
        var deja = null;
        try { deja = sessionStorage.getItem("mini-outils-maj"); } catch (e) {}
        // Un seul rechargement automatique par version, pour ne jamais boucler.
        if (!saisieEnCours && deja !== m[1]) {
          // On laisse au déploiement le temps d'atteindre tous les fichiers : pendant
          // quelques secondes, commun.js peut déjà être le nouveau alors qu'un fichier
          // de données ou de styles est encore l'ancien. Recharger tout de suite
          // assemblait alors une page à moitié à jour, qui le restait.
          if (majPrevue) return;
          majPrevue = setTimeout(function () {
            majPrevue = null;
            if (saisieEnCours) { proposeMaj(m[1]); return; }
            try { sessionStorage.setItem("mini-outils-maj", m[1]); } catch (e) {}
            rechargeFrais();
          }, DELAI_MAJ);
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
    if ($("installer")) $("installer").insertAdjacentHTML("afterbegin", ICONE_INSTALLER);
    Array.prototype.forEach.call(document.querySelectorAll("[data-installer]"), function (b) {
      b.insertAdjacentHTML("afterbegin", ICONE_INSTALLER);
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
      '<button type="button" class="lien-cookies" data-gerer-cookies>Gérer les cookies</button>' +
      '<a href="logiciels-compatibles.html">Logiciels compatibles</a>' +
      '<a href="versions.html">Suivi des versions</a></nav>' +
      '<span class="projet">Un projet <a href="https://structurre.fr" target="_blank" rel="noopener">' +
      '<img src="icones/structurre.svg" alt="" width="20" height="20">STRUCTURRE</a></span>';
    c.appendChild(bloc);
  }

  // Bandeau de consentement à la mesure d'audience : consentement.css et consentement.js,
  // chargés ici pour toutes les pages. Rien n'est envoyé à Google sans l'accord du visiteur.
  function consentement() {
    var css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "consentement.css";
    // Le script attend la feuille de style : le bandeau est placé d'après sa taille réelle.
    css.onload = css.onerror = function () {
      var js = document.createElement("script");
      js.src = "consentement.js";
      document.body.appendChild(js);
    };
    document.head.appendChild(css);
  }

  // Sur téléphone, seules les pages d'information sont affichées : les tableaux
  // d'écritures n'y sont pas lisibles. Les pages d'outil reçoivent la classe
  // « page-outil » et un message de remplacement ; c'est le CSS (écran de 820 px
  // de large au plus) qui masque l'outil et montre le message.
  function mobile() {
    var page = location.pathname.split("/").pop() || "index.html";
    var outil = OUTILS.concat(ANALYSE, DASHBOARD).filter(function (o) { return o.fichier === page; })[0];
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

  // Sélecteur à segments : une liste déroulante de classe « segments » est remplacée à
  // l'écran par des boutons accolés, un par choix. La liste reste dans la page, masquée :
  // les calculs lisent toujours sa valeur et « Réinitialiser » agit sur elle comme avant.
  function segments() {
    Array.prototype.forEach.call(document.querySelectorAll("select.segments"), function (liste) {
      var groupe = document.createElement("div");
      groupe.className = "segments";
      groupe.setAttribute("role", "group");
      var libelle = liste.id && document.querySelector('label[for="' + liste.id + '"]');
      if (libelle) groupe.setAttribute("aria-label", libelle.textContent.trim());
      var boutons = Array.prototype.map.call(liste.options, function (option) {
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = option.textContent;
        b.addEventListener("click", function () {
          if (liste.value === option.value) return;
          liste.value = option.value;
          liste.dispatchEvent(new Event("input", { bubbles: true }));
          liste.dispatchEvent(new Event("change", { bubbles: true }));
        });
        groupe.appendChild(b);
        return b;
      });
      var accorde = function () {
        boutons.forEach(function (b, i) { b.setAttribute("aria-pressed", String(i === liste.selectedIndex)); });
      };
      liste.addEventListener("input", accorde);
      liste.addEventListener("change", accorde);
      accorde();
      liste.hidden = true;
      liste.parentNode.insertBefore(groupe, liste.nextSibling);
    });
  }

  // Zones de collage (balance, grand livre, relevé) : à l'entrée dans la zone, tout son
  // contenu est sélectionné, pour qu'un nouveau collage remplace l'ancien. Un second clic
  // place le curseur comme d'habitude.
  function selectionCollage() {
    Array.prototype.forEach.call(document.querySelectorAll("textarea.saisie"), function (zone) {
      var entree = false;
      zone.addEventListener("focus", function () {
        if (!zone.value) return;
        zone.select();
        entree = true;
      });
      // Le relâchement du clic qui a donné le focus annulerait la sélection.
      zone.addEventListener("mouseup", function (e) {
        if (entree) e.preventDefault();
        entree = false;
      });
      zone.addEventListener("blur", function () { entree = false; });
    });
  }

  segments();
  selectionCollage();
  calendrier();
  menu();
  mobile();
  pied();
  consentement();
  installation();
  icone();
  reinitialisation();
  croixRecherche();
  etiquettesType();
  lienPage();

  return { VERSION: VERSION, $: $, centimes: centimes, deux: deux, code6: code6, affiche: affiche, lireDate: lireDate,
           decale: decale, dateFr: dateFr, copierTexte: copierTexte, fete: fete, tempsGagne: tempsGagne, verifieVersion: verifieVersion, rendre: rendre, texteACopier: texteACopier, brancher: brancher,
           secondMenu: secondMenu, aLaLigne: aLaLigne, afficheNote: afficheNote, calculs: calculs };
})();
