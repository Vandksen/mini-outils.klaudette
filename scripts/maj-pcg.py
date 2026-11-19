#!/usr/bin/env python3
"""Met à jour pcg-donnees.js (page « Plan de comptes ») depuis la table « PCG » d'Airtable.

Usage, depuis la racine du dépôt :

    AIRTABLE_TOKEN=pat... python3 scripts/maj-pcg.py            # écrit pcg-donnees.js
    AIRTABLE_TOKEN=pat... python3 scripts/maj-pcg.py --apercu   # montre les écarts, n'écrit rien

Le jeton est un « personal access token » Airtable (airtable.com/create/tokens) avec le
droit data.records:read sur la base. Il se passe par la variable d'environnement
AIRTABLE_TOKEN : ne jamais l'écrire dans ce fichier, le dépôt est public.

Le script lit quatre colonnes : « Numéro (6) », « Libellé de compte », « Catégorie »
(la valeur de la colonne liée « Catégories ») et la colonne de la réforme du PCG 2025
(« Réforme PCG 2025 », « Avant Réforme PCG 2025 » ou vide). Il ne publie rien : après une mise à jour,
augmenter VERSION dans commun.js puis commiter, comme pour toute publication.
Si la forme du fichier change (une valeur de plus par compte, par exemple), augmenter
aussi le « ?v= » de la balise <script src="pcg-donnees.js?v=…"> dans pcg.html.

Aucune dépendance : Python 3 seul suffit.
"""
import argparse
import datetime
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

BASE = "app3VSngggAfxL6be"
TABLE = "tblcMpnXzMgTycfcS"            # table « PCG »
CHAMP_NUMERO = "fldmCcGHsSnlshD4M"     # « Numéro (6) »
CHAMP_LIBELLE = "fldpwL03OzyuAHsoh"    # « Libellé de compte »
CHAMP_CATEGORIE = "fldc0suh3O4Ugu67W"  # « Catégorie » : nom de la catégorie liée
CHAMP_REFORME = "fldTHVwMtmrsGtJVl"    # liste : « Réforme PCG 2025 » ou « Avant Réforme PCG 2025 »
# Code écrit dans pcg-donnees.js pour la réforme : 0 = compte non concerné,
# 1 = compte du nouveau plan (réforme 2025), 2 = compte de l'ancien plan (avant la réforme).
SANS_REFORME, NOUVEAU_PLAN, ANCIEN_PLAN = 0, 1, 2
SORTIE = Path(__file__).resolve().parent.parent / "pcg-donnees.js"


def code_reforme(valeur):
    """Code 0, 1 ou 2 d'après la valeur de la colonne de réforme."""
    texte = net(valeur).lower()
    if not texte:
        return SANS_REFORME
    if texte.startswith("avant"):
        return ANCIEN_PLAN
    if texte.startswith("réforme") or texte.startswith("reforme"):
        return NOUVEAU_PLAN
    sys.exit("Valeur inconnue dans la colonne de réforme : « %s ». Adapter code_reforme()." % net(valeur))


def net(texte):
    """Texte sans espaces en trop (début, fin, doubles)."""
    return re.sub(r"\s+", " ", str(texte or "")).strip()


def lire_airtable(jeton):
    """Tous les enregistrements de la table, page par page (100 au plus par appel)."""
    enregistrements, suite = [], None
    while True:
        parametres = [("pageSize", "100"), ("returnFieldsByFieldId", "true")]
        parametres += [("fields[]", c) for c in (CHAMP_NUMERO, CHAMP_LIBELLE, CHAMP_CATEGORIE, CHAMP_REFORME)]
        if suite:
            parametres.append(("offset", suite))
        url = "https://api.airtable.com/v0/%s/%s?%s" % (BASE, TABLE, urllib.parse.urlencode(parametres))
        requete = urllib.request.Request(url, headers={"Authorization": "Bearer " + jeton})
        try:
            with urllib.request.urlopen(requete, timeout=30) as reponse:
                page = json.load(reponse)
        except urllib.error.HTTPError as erreur:
            detail = erreur.read().decode("utf-8", "replace")[:300]
            sys.exit("Airtable a refusé la lecture (HTTP %s) : %s" % (erreur.code, detail))
        except urllib.error.URLError as erreur:
            sys.exit("Airtable est injoignable : %s" % erreur.reason)
        enregistrements += page.get("records", [])
        suite = page.get("offset")
        if not suite:
            return enregistrements


def comptes_depuis(enregistrements):
    """Liste triée de (numéro, libellé, catégorie, code de réforme) et liste des lignes écartées."""
    comptes, ecartes = [], []
    for e in enregistrements:
        champs = e.get("fields", {})
        numero, libelle = net(champs.get(CHAMP_NUMERO)), net(champs.get(CHAMP_LIBELLE))
        categorie = champs.get(CHAMP_CATEGORIE) or []
        categorie = net(categorie[0]) if isinstance(categorie, list) and categorie else net(categorie if isinstance(categorie, str) else "")
        if not numero or not libelle or not categorie:
            ecartes.append((numero or "(sans numéro)", libelle or "(sans libellé)", categorie or "(sans catégorie)"))
            continue
        comptes.append((numero, libelle, categorie, code_reforme(champs.get(CHAMP_REFORME))))
    # Comptes numériques d'abord, dans l'ordre du numéro ; comptes auxiliaires (lettres) à la fin.
    comptes.sort(key=lambda c: (not c[0][0].isdigit(), c[0], c[1]))
    return comptes, ecartes


def contenu_js(comptes, date):
    categories = sorted(set(c[2] for c in comptes))
    lignes = [
        "/* Mini-outils — plan de comptes normé (page pcg.html).",
        "   Données reprises de la table « PCG » d'Airtable le %s : colonnes" % date,
        "   « Numéro (6) », « Libellé de compte », « Catégories » et réforme du PCG 2025.",
        "   Chaque compte est écrit [numéro, libellé, rang de la catégorie dans categories,",
        "   réforme], où réforme vaut 0 (compte non concerné), 1 (compte du nouveau plan,",
        "   « Réforme PCG 2025 ») ou 2 (compte de l'ancien plan, « Avant Réforme PCG 2025 »).",
        "   Fichier généré par scripts/maj-pcg.py : ne pas le modifier à la main. */",
        "window.PCG = {",
        "  categories: " + json.dumps(categories, ensure_ascii=False) + ",",
        "  comptes: [",
    ]
    for i, (numero, libelle, categorie, reforme) in enumerate(comptes):
        virgule = "," if i < len(comptes) - 1 else ""
        lignes.append("    " + json.dumps([numero, libelle, categories.index(categorie), reforme], ensure_ascii=False) + virgule)
    lignes += ["  ]", "};", ""]
    return "\n".join(lignes)


def comptes_actuels():
    """Comptes du fichier déjà en place, pour montrer ce qui change."""
    if not SORTIE.exists():
        return []
    texte = SORTIE.read_text(encoding="utf-8")
    categories = re.search(r"categories: (\[.*\]),", texte)
    if not categories:
        return []
    categories = json.loads(categories.group(1))
    actuels = []
    for ligne in texte.splitlines():
        ligne = ligne.strip().rstrip(",")
        if ligne.startswith('["'):
            # Les fichiers d'avant la colonne de réforme n'ont que trois valeurs par compte.
            valeurs = json.loads(ligne)
            numero, libelle, rang = valeurs[:3]
            actuels.append((numero, libelle, categories[rang], valeurs[3] if len(valeurs) > 3 else SANS_REFORME))
    return actuels


def montre(titre, lignes, maximum=40):
    if not lignes:
        return
    print("\n%s (%d)" % (titre, len(lignes)))
    for ligne in lignes[:maximum]:
        print("  " + "  |  ".join(str(valeur) for valeur in ligne))
    if len(lignes) > maximum:
        print("  … et %d autres" % (len(lignes) - maximum))


def main():
    analyseur = argparse.ArgumentParser(description="Met à jour pcg-donnees.js depuis Airtable.")
    analyseur.add_argument("--apercu", action="store_true", help="montrer les écarts sans écrire le fichier")
    analyseur.add_argument("--depuis", metavar="FICHIER", help="lire une réponse Airtable enregistrée (JSON) au lieu d'appeler Airtable")
    options = analyseur.parse_args()

    if options.depuis:
        enregistrements = json.loads(Path(options.depuis).read_text(encoding="utf-8"))["records"]
    else:
        jeton = os.environ.get("AIRTABLE_TOKEN", "").strip()
        if not jeton:
            sys.exit("Variable AIRTABLE_TOKEN absente. Exemple : AIRTABLE_TOKEN=pat... python3 scripts/maj-pcg.py")
        enregistrements = lire_airtable(jeton)

    comptes, ecartes = comptes_depuis(enregistrements)
    if not comptes:
        sys.exit("Aucun compte exploitable reçu d'Airtable : pcg-donnees.js n'est pas modifié.")

    avant, apres = Counter(comptes_actuels()), Counter(comptes)
    ajoutes = sorted((apres - avant).elements())
    retires = sorted((avant - apres).elements())
    print("%d comptes lus dans Airtable, %d dans le fichier actuel." % (len(comptes), sum(avant.values())))
    montre("Ajoutés ou modifiés", ajoutes)
    montre("Retirés ou remplacés", retires)

    # Points à regarder dans Airtable ; ils n'empêchent pas la mise à jour.
    montre("Lignes écartées, car incomplètes", ecartes)
    par_numero = Counter(c[0] for c in comptes)
    montre("Numéros présents plusieurs fois", [c for c in comptes if par_numero[c[0]] > 1])
    montre("Numéros qui n'ont pas six chiffres", [c for c in comptes if not re.fullmatch(r"\d{6}", c[0])])

    if not ajoutes and not retires:
        print("\nAucun changement : pcg-donnees.js est déjà à jour.")
        return
    if options.apercu:
        print("\nAperçu seulement : pcg-donnees.js n'est pas modifié.")
        return
    SORTIE.write_text(contenu_js(comptes, datetime.date.today().strftime("%d/%m/%Y")), encoding="utf-8")
    print("\npcg-donnees.js est mis à jour. Pour publier : augmenter VERSION dans commun.js, puis commiter.")


if __name__ == "__main__":
    main()
