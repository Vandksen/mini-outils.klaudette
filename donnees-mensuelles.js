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
  },

  // Indices trimestriels des loyers publiés par l'Insee, repris par revalorisation-loyer.html.
  // Chaque série : son nom, son identifiant dans la banque de données macroéconomiques de l'Insee
  // (idBdm : page https://www.insee.fr/fr/statistiques/serie/<idBdm>) et ses valeurs par année,
  // trimestres T1 à T4 dans l'ordre. Un trimestre qui paraît s'ajoute à la fin de son année ;
  // le premier trimestre d'une année ouvre une nouvelle ligne.
  indicesLoyers: {
    source: "https://www.insee.fr/fr/statistiques/serie/",
    verifieLe: "2026-11-21",
    series: {
      ILC: { nom: "Indice des loyers commerciaux (ILC)", idBdm: "001532540", valeurs: {
        2018: [111.87, 112.59, 113.45, 114.06], 2019: [114.64, 115.21, 115.60, 116.16], 2020: [116.23, 115.42, 115.70, 115.79],
        2021: [116.73, 118.41, 119.70, 118.59], 2022: [120.61, 123.65, 126.13, 126.05], 2023: [128.68, 131.81, 133.66, 132.63],
        2024: [134.58, 136.72, 137.71, 135.30], 2025: [135.87, 136.81, 137.09, 134.62], 2026: [135.26, 137.16] } },
      ILAT: { nom: "Indice des loyers des activités tertiaires (ILAT)", idBdm: "001617112", valeurs: {
        2018: [111.45, 112.01, 112.74, 113.30], 2019: [113.88, 114.47, 114.85, 115.43], 2020: [115.53, 114.33, 114.23, 114.06],
        2021: [114.87, 116.46, 117.61, 118.97], 2022: [120.73, 122.65, 124.53, 126.66], 2023: [128.59, 130.64, 132.15, 133.69],
        2024: [135.13, 136.45, 137.12, 137.29], 2025: [137.29, 137.15, 137.07, 137.21], 2026: [137.42, 138.01] } },
      ICC: { nom: "Indice du coût de la construction (ICC)", idBdm: "000008630", valeurs: {
        2018: [1671, 1699, 1733, 1703], 2019: [1728, 1746, 1746, 1769], 2020: [1770, 1753, 1765, 1795],
        2021: [1822, 1821, 1886, 1886], 2022: [1948, 1966, 2037, 2052], 2023: [2077, 2123, 2106, 2162],
        2024: [2227, 2205, 2143, 2108], 2025: [2146, 2086, 2056, 2058], 2026: [2084, 2103] } }
    }
  }

};
