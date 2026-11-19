/* Mini-outils — questions aux clients (page questions-clients.html).
   Données reprises de la page Notion « Questions aux clients » le 19/11/2026 : seuls les
   tableaux de questions sont repris, pas les explications ni les procédures.
   Chaque question est écrite [rang du cycle dans cycles, situation, question, code].
   Le code peut être vide, et deux questions jumelles (singulier et pluriel) peuvent
   porter le même. Les retours à la ligne d'une question sont des « \n ». */
window.QUESTIONS = {
  cycles: ["Compte courant", "Fournisseurs", "Ventes", "Social", "Attente"],
  questions: [
    [0, "Compte courant d'associé", "Merci de consulter les mouvements de votre compte courant et d'y apposer votre signature.", "B1"],

    [1, "Avoir(s)", "Merci de me confirmer que cet/ces avoirs n'ont pas été déduits.\nDans l'affirmative, veillez à le déduire des prochains paiements ou à en demander le remboursement.", "C1"],
    [1, "Écart", "Un écart de XX Euros apparaît suite au règlement du XX.XX.20XX (en colonne Débit).\nEst-ce une erreur ? Me manque-t-il une pièce ?", "C2"],
    [1, "Extrait", "Merci de demander à votre fournisseur un extrait de compte au 31.12.202X (présentant le solde à date et les écritures lettrées sur le dernier semestre).", "C3"],
    [1, "Facture ouverte", "Merci de m'indiquer quand et comment cette facture sera réglée (colonne crédit).\nSi elle l'a déjà été, merci de m'indiquer le mode de paiement et la date.", "C4"],
    [1, "Factures ouvertes", "Merci de m'indiquer quand et comment ces factures seront réglées (colonne crédit).\nSi elles l'ont déjà été, merci de m'indiquer les modes de paiement et les dates.", "C5"],
    [1, "Mixte", "1. Merci de m'indiquer quand et comment la facture (de la colonne Crédit) sera réglée.\n\n2. Merci de me transmettre la facture relative au règlement (en colonne Débit).\n\nSi des règlements (de la colonne Débit) correspondent à des factures présentes dans le compte (colonne Crédit), merci de me le préciser.", "C6"],
    [1, "Mixtes", "1. Merci de m'indiquer quand et comment les factures (de la colonne Crédit) seront réglées.\n\n2. Merci de me transmettre les factures relatives aux règlements (en colonne Débit).\n\nSi des règlements (de la colonne Débit) correspondent à des factures présentes dans le compte (colonne Crédit), merci de me le préciser.", "C6"],
    [1, "Non payé(s)", "Merci de me confirmer que cette/ces facture(s) ne sont pas réglées :", "C7"],
    [1, "Perso", "Pourriez-vous m'indiquer si cette pièce a été payée sur vos deniers propres (CB personnelle, espèces, etc.) ?", "C8"],
    [1, "Persos", "Pourriez-vous m'indiquer si ces pièces ont été payées sur vos deniers propres (CB personnelle, espèces, etc.) ?", "C9"],
    [1, "Règlement", "Merci de me transmettre la facture relative à ce règlement (colonne Débit).", "C10"],
    [1, "Règlements", "Merci de me transmettre les factures relatives à ces règlements (colonne Débit).", "C11"],
    [1, "Solde", "Merci de me confirmer la justesse de ce solde de XX Euros au XX.XX.202X.", "C12"],

    [2, "Acompte", "Merci de me transmettre les factures relatives à ces acomptes. À défaut de facture, merci de m'indiquer les taux de TVA pour une déclaration au plus juste de votre TVA.", "E1"],
    [2, "Avoir(s)", "Merci de me confirmer que cet (ces) avoir(s) n'a (ont) pas été déduit(s). Dans l'affirmative, veillez à le faire déduire des prochains règlements ou à envisager un remboursement.", "E2"],
    [2, "Douteux", "Merci de m'indiquer si le recouvrement de cette créance est incertain : [ ] Oui  [ ] Non.\nDans l'affirmative, merci d'évaluer les risques de non-recouvrement : [ ] 25 %  [ ] 50 %  [ ] 75 %  [ ] 100 % de risque de non-paiement.", "E3"],
    [2, "Écart", "Un écart de XX Euros apparaît suite au règlement du XX.XX.20XX (en colonne Crédit). Est-ce une erreur ? Me manque-t-il une pièce ?", "E4"],
    [2, "Encaissement", "Merci de me transmettre la facture relative à cet encaissement (colonne Crédit).", "E5"],
    [2, "Encaissements", "Merci de me transmettre les factures relatives à ces encaissements (colonne Crédit).", "E6"],
    [2, "Facture ouverte", "Merci de m'indiquer quand et comment cette facture sera réglée (colonne débit). Si elle l'a déjà été, merci de m'indiquer le mode de paiement et la date.", "E7"],
    [2, "Factures ouvertes", "Merci de m'indiquer quand et comment ces factures seront réglées (colonne débit). Si elles l'ont déjà été, merci de m'indiquer les modes de paiement et les dates.", "E8"],
    [2, "Mixte", "1. Merci de m'indiquer quand et comment la facture (de la colonne Débit) sera réglée.\n\n2. Merci de me transmettre la facture relative au règlement (en colonne Crédit).\n\nSi des règlements (de la colonne Crédit) correspondent à des factures présentes dans le compte (colonne Débit), merci de me le préciser.", "E9"],
    [2, "Mixtes", "1. Merci de m'indiquer quand et comment les factures (de la colonne Débit) seront réglées.\n\n2. Merci de me transmettre les factures relatives aux règlements (en colonne Crédit).\n\nSi des règlements (de la colonne Crédit) correspondent à des factures présentes dans le compte (colonne Débit), merci de me le préciser.", "E9"],
    [2, "Rappro", "Merci de m'indiquer à quelle(s) facture(s) de la colonne Débit correspond(ent) le(s) encaissement(s) de la colonne Crédit.", "E10"],
    [2, "Solde", "Merci de me confirmer la justesse de ce solde de XX Euros au XX.XX.202X.", "E11"],

    [3, "Écart 421", "Je constate un écart entre les paiements des salaires et les fiches de paie.\nPour votre compréhension :\n- La colonne Débit indique les salaires versés\n- La colonne Crédit présente les montants dus aux salariés selon les fiches de paie\nMerci de m'aider à identifier l'origine de cet écart et à rapprocher les paiements avec les fiches de paie dues.", "H1"],
    [3, "Pas de paiement", "Ces fiches de paie ne semblent pas avoir été payées (pour rappel, la colonne Crédit présente les montants dus aux salariés selon les fiches de paie).", ""],
    [3, "Paiement non affecté", "Ce paiement semble correspondre à un salarié que je n'arrive pas à identifier. Pourriez-vous m'aider :", ""],
    [3, "421 pas payé", "Merci de m'indiquer quand et comment cette fiche de paie sera réglée (colonne crédit). Si elle l'a déjà été, merci de m'indiquer le mode de paiement et la date.", ""],

    [4, "Attente général", "Merci de me transmettre les justificatifs relatifs à ces mouvements bancaires (pour lesquels aucune facture correspondante n'a été trouvée).\n\nSi certains règlements correspondent à plusieurs pièces, merci de m'indiquer le détail des factures correspondant au paiement.\n\nPour rappel : les mouvements en colonne Débit sont vos paiements sortants, ceux en colonne Crédit sont vos encaissements reçus.\n—\nPour un suivi optimal, nous vous invitons à barrer les mouvements au fur et à mesure de leur traitement.", "K1"],
    [4, "Attente encaissements", "Merci de me transmettre les justificatifs relatifs à ces mouvements bancaires (pour lesquels aucune facture correspondante n'a été trouvée).", "K2"],
    [4, "Attente chèque", "Merci de nous fournir les informations suivantes concernant les chèques :\n- Pour les chèques émis (colonne débit) : le nom des bénéficiaires\n- Pour les chèques reçus (colonne crédit) : le nom des émetteurs et / ou le détail de la remise de chèques (afin de pouvoir affecter correctement les encaissements aux comptes clients)", "K3"],
    [4, "Factures qui semblent personnelles", "Vous trouverez ci-dessous les factures qui ne semblent pas liées à votre activité. Pourriez-vous me confirmer par retour écrit que ces dépenses n'ont pas un caractère personnel et qu'elles sont réalisées dans le cadre de l'activité de la société ? Pour les notes de restaurant, merci d'indiquer les personnes présentes au repas (nom des clients). Pour les cadeaux, merci d'indiquer le client bénéficiaire. Si ces dépenses ne sont pas liées à votre activité, elles seront reclassées en compte courant d'associé.", "K4"]
  ]
};
