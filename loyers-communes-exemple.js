// Fichier produit par scripts/loyers-communes.py : ne pas le modifier à la main.
// Loyers d'annonce au m2, charges comprises, par commune (« Carte des loyers », data.gouv.fr).
// communes : une commune par ligne, « code INSEE|nom|département|loyer appartement en
// centimes par m2|prudence (1 ou 0)|loyer maison en centimes par m2|prudence ».
// Version réduite à la commune de l'exemple ; loyers-communes.js contient toutes les communes.
window.LOYERS_COMMUNES = {
  titre: "« Carte des loyers » - Indicateurs de loyers d'annonce par commune en 2025",
  source: "https://www.data.gouv.fr/datasets/693aa2feed1bf4da603faa49/",
  producteur: "Ministère de la Transition écologique (DHUP), avec l'ANIL",
  millesime: 2025,
  misAJour: "2025-12-11",
  verifieLe: "2026-11-21",
  partiel: true,
  communes: "44109|Nantes|44|1450|0|1435|0"
};
