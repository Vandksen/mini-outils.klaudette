/* Mini-outils — petit générateur de PDF, sans dépendance : le fichier est fabriqué dans le
   navigateur, rien n'est envoyé.

   Il sait faire ce qu'il faut pour un justificatif d'une page A4 : du texte en Helvetica
   (normal ou gras), des traits et des rectangles pleins. Les positions sont données en
   points (1/72 de pouce) depuis le coin haut gauche de la page, qui mesure 595 × 842.

   Usage :
     var doc = MiniPdf.creer();
     doc.texte(40, 60, "Titre", { taille: 20, gras: true });
     var y = doc.paragraphe(40, 90, 515, "Un texte long, coupé à la largeur donnée.");
     doc.telecharger("justificatif.pdf");
*/
(function () {
  "use strict";

  var LARGEUR = 595, HAUTEUR = 842;
  var COULEURS = {
    bleu: [0.067, 0.212, 0.859], encre: [0.106, 0.141, 0.314], gris: [0.337, 0.365, 0.471],
    trait: [0.82, 0.80, 0.74], fond: [0.957, 0.937, 0.890], blanc: [1, 1, 1]
  };

  // Largeurs des caractères d'Helvetica et d'Helvetica gras, en millièmes du corps, pour les
  // codes 32 à 126. Elles servent à aligner à droite et à couper les lignes.
  var NORMAL = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
    556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
    1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
    667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
    333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
    556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
  var GRAS = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
    556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
    975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
    667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
    333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
    611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];
  // Caractères hors de la plage 32-126 : code dans le jeu WinAnsi et largeur [normal, gras].
  var SPECIAUX = {
    "€": [128, 556, 556], "’": [146, 222, 278], "‘": [145, 222, 278], "“": [147, 333, 500], "”": [148, 333, 500],
    "–": [150, 556, 556], "—": [151, 1000, 1000], "…": [133, 1000, 1000], "œ": [156, 944, 944], "Œ": [140, 1000, 1000],
    "«": [171, 556, 556], "»": [187, 556, 556], "°": [176, 400, 400], "×": [215, 584, 584], "·": [183, 278, 278]
  };

  // Un caractère -> [code WinAnsi, largeur]. Les espaces insécables deviennent des espaces ;
  // une lettre accentuée a la largeur de sa lettre de base ; un caractère inconnu devient « ? ».
  function car(c, gras) {
    var table = gras ? GRAS : NORMAL, n = c.charCodeAt(0);
    if (n === 160 || n === 8239 || n === 8201 || n === 9) { c = " "; n = 32; }
    if (n >= 32 && n <= 126) return [n, table[n - 32]];
    if (SPECIAUX[c]) return [SPECIAUX[c][0], SPECIAUX[c][gras ? 2 : 1]];
    if (n >= 192 && n <= 255) {
      var base = c.normalize("NFD").charCodeAt(0);
      return [n, base >= 32 && base <= 126 ? table[base - 32] : 556];
    }
    return [63, table[63 - 32]];
  }

  function largeur(texte, taille, gras) {
    var total = 0;
    for (var i = 0; i < texte.length; i++) total += car(texte.charAt(i), gras)[1];
    return total * taille / 1000;
  }

  // Texte -> chaîne PDF entre parenthèses, en octets WinAnsi.
  function chaine(texte, gras) {
    var s = "(";
    for (var i = 0; i < texte.length; i++) {
      var code = car(texte.charAt(i), gras)[0];
      if (code === 40 || code === 41 || code === 92) s += "\\";
      s += String.fromCharCode(code);
    }
    return s + ")";
  }

  function nombre(n) { return String(Math.round(n * 100) / 100); }
  function couleur(c) {
    var v = COULEURS[c] || COULEURS.encre;
    return nombre(v[0]) + " " + nombre(v[1]) + " " + nombre(v[2]);
  }

  // Coupe un texte en lignes qui tiennent dans la largeur donnée.
  function couper(texte, max, taille, gras) {
    var lignes = [];
    String(texte).split("\n").forEach(function (bloc) {
      var ligne = "";
      bloc.split(" ").forEach(function (mot) {
        var essai = ligne ? ligne + " " + mot : mot;
        if (ligne && largeur(essai, taille, gras) > max) { lignes.push(ligne); ligne = mot; }
        else ligne = essai;
      });
      lignes.push(ligne);
    });
    return lignes;
  }

  function creer() {
    var contenu = [];
    var doc = {
      largeur: LARGEUR, hauteur: HAUTEUR,
      mesure: largeur,
      // options : taille (10), gras, couleur (nom dans COULEURS), align ("droite" : x est le bord droit).
      texte: function (x, y, texte, o) {
        o = o || {};
        texte = String(texte);
        var taille = o.taille || 10;
        if (o.align === "droite") x -= largeur(texte, taille, o.gras);
        contenu.push("BT /" + (o.gras ? "F2" : "F1") + " " + nombre(taille) + " Tf " + couleur(o.couleur) + " rg " +
                     nombre(x) + " " + nombre(HAUTEUR - y) + " Td " + chaine(texte, o.gras) + " Tj ET");
        return doc;
      },
      // Texte coupé à la largeur donnée. Renvoie la position verticale de la ligne suivante.
      paragraphe: function (x, y, max, texte, o) {
        o = o || {};
        var taille = o.taille || 10, pas = o.interligne || taille * 1.45;
        couper(texte, max, taille, o.gras).forEach(function (ligne) {
          doc.texte(x, y, ligne, o);
          y += pas;
        });
        return y;
      },
      trait: function (x1, y1, x2, y2, nom, epaisseur) {
        contenu.push(couleur(nom || "trait") + " RG " + nombre(epaisseur || 0.6) + " w " + nombre(x1) + " " + nombre(HAUTEUR - y1) +
                     " m " + nombre(x2) + " " + nombre(HAUTEUR - y2) + " l S");
        return doc;
      },
      rectangle: function (x, y, l, h, nom) {
        contenu.push(couleur(nom || "fond") + " rg " + nombre(x) + " " + nombre(HAUTEUR - y - h) + " " + nombre(l) + " " + nombre(h) + " re f");
        return doc;
      },
      // Le fichier, sous forme de tableau d'octets.
      octets: function () {
        var flux = contenu.join("\n");
        var objets = [
          "<< /Type /Catalog /Pages 2 0 R >>",
          "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
          "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + LARGEUR + " " + HAUTEUR + "] /Contents 4 0 R " +
            "/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>",
          "<< /Length " + flux.length + " >>\nstream\n" + flux + "\nendstream",
          "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
          "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
        ];
        // Chaque caractère de « pdf » vaut un octet : les textes sont déjà en WinAnsi.
        var pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", positions = [];
        objets.forEach(function (o, i) {
          positions.push(pdf.length);
          pdf += (i + 1) + " 0 obj\n" + o + "\nendobj\n";
        });
        var table = pdf.length;
        pdf += "xref\n0 " + (objets.length + 1) + "\n0000000000 65535 f \n";
        positions.forEach(function (p) { pdf += ("0000000000" + p).slice(-10) + " 00000 n \n"; });
        pdf += "trailer\n<< /Size " + (objets.length + 1) + " /Root 1 0 R >>\nstartxref\n" + table + "\n%%EOF\n";
        var octets = new Uint8Array(pdf.length);
        for (var i = 0; i < pdf.length; i++) octets[i] = pdf.charCodeAt(i) & 255;
        return octets;
      },
      telecharger: function (nom) {
        var url = URL.createObjectURL(new Blob([doc.octets()], { type: "application/pdf" }));
        var lien = document.createElement("a");
        lien.href = url;
        lien.download = nom;
        document.body.appendChild(lien);
        lien.click();
        document.body.removeChild(lien);
        setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
      }
    };
    return doc;
  }

  // Nom de fichier sans accents ni caractères gênants : « IK 2025 – Été » -> « IK-2025-Ete ».
  function nomFichier(texte) {
    return String(texte).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  window.MiniPdf = { creer: creer, nomFichier: nomFichier };
})();
