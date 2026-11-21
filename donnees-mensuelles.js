/* Mini-outils — données publiées chaque mois, reprises par plusieurs pages.
   Fichier tenu à jour par la tâche planifiée mensuelle « maj-donnees-mini-outils » :
   chaque bloc indique sa source et la date de sa dernière vérification.
   Pour ajouter une donnée suivie : un bloc ici, et sa consigne dans la tâche planifiée. */
window.DONNEES_MENSUELLES = {

  // Taux maximal des intérêts déductibles sur comptes courants d'associés (CGI, art. 39-1-3°),
  // pour un exercice de 12 mois, selon la date de clôture.
  // Chaque ligne : [première date de clôture, dernière date de clôture, taux en %], dates AAAA-MM-JJ,
  // de la plus ancienne à la plus récente. Ajouter les nouvelles lignes à la fin.
  tauxMaxDeductible: {
    source: "https://entreprendre.service-public.gouv.fr/vosdroits/F32966",
    verifieLe: "2026-11-21",
    lignes: [
      ["2025-10-31", "2025-11-29", 4.73],
      ["2025-11-30", "2025-12-30", 4.64],
      ["2025-12-31", "2026-01-30", 4.55],
      ["2026-01-31", "2026-02-27", 4.49],
      ["2026-02-28", "2026-03-30", 4.44],
      ["2026-03-31", "2026-04-29", 4.39],
      ["2026-04-30", "2026-05-30", 4.37],
      ["2026-05-31", "2026-06-29", 4.34],
      ["2026-06-30", "2026-07-30", 4.33],
      ["2026-07-31", "2026-08-30", 4.33],
      ["2026-08-31", "2026-09-29", 4.33],
      ["2026-09-30", "2026-10-30", 4.40],
      ["2026-10-31", "2026-11-29", 4.43],
      ["2026-11-30", "2026-12-30", 4.45]
    ]
  }

};
