#!/usr/bin/env python3
"""Produit loyers-communes.js à partir de la « Carte des loyers » du ministère de la Transition
écologique (data.gouv.fr) : loyer d'annonce au m2, charges comprises, par commune, pour un
appartement et pour une maison. Repris par loyer-bureau.html.

Usage :
  python3 scripts/loyers-communes.py                      # édition 2025 (jeu de données par défaut)
  python3 scripts/loyers-communes.py <identifiant>        # autre édition : identifiant du jeu sur data.gouv.fr

Le jeu de données de chaque édition s'appelle « "Carte des loyers" - Indicateurs de loyers
d'annonce par commune en AAAA ». Le script y prend les fichiers « Indicateurs de loyer
appartement » et « Indicateurs de loyer maison » (CSV, séparateur « ; », encodage latin-1).

Une commune est marquée « prudence » quand le ministère invite à lire son indicateur avec
précaution : moins de 30 annonces dans la commune, R2 ajusté inférieur à 0,5, ou valeur estimée
à partir de communes voisines (TYPPRED différent de « commune »).
"""
import csv
import datetime
import io
import json
import os
import sys
import urllib.request

JEU_PAR_DEFAUT = "693aa2feed1bf4da603faa49"   # édition 2025, publiée le 11/12/2025
SORTIE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "loyers-communes.js")
# Petit fichier chargé à l'ouverture de loyer-bureau.html : la source et la seule commune de
# l'exemple prérempli, pour afficher le résultat sans attendre le gros fichier (environ 400 Ko
# compressés), qui n'est chargé qu'au premier usage du champ commune.
SORTIE_EXEMPLE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "loyers-communes-exemple.js")
COMMUNE_EXEMPLE = "44109"   # Nantes, commune préremplie dans loyer-bureau.html


def ecrire(chemin, entete, communes, partiel):
    with open(chemin, "w", encoding="utf-8") as f:
        f.write("// Fichier produit par scripts/loyers-communes.py : ne pas le modifier à la main.\n")
        f.write("// Loyers d'annonce au m2, charges comprises, par commune (« Carte des loyers », data.gouv.fr).\n")
        f.write("// communes : une commune par ligne, « code INSEE|nom|département|loyer appartement en\n")
        f.write("// centimes par m2|prudence (1 ou 0)|loyer maison en centimes par m2|prudence ».\n")
        if partiel:
            f.write("// Version réduite à la commune de l'exemple ; loyers-communes.js contient toutes les communes.\n")
        f.write("window.LOYERS_COMMUNES = {\n")
        for k, v in entete.items():
            f.write("  %s: %s,\n" % (k, json.dumps(v, ensure_ascii=False)))
        if partiel:
            f.write("  partiel: true,\n")
        f.write("  communes: %s\n};\n" % json.dumps("\n".join(communes), ensure_ascii=False))


def lire(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "mini-outils"})) as r:
        return r.read()


def lignes_csv(url):
    return list(csv.DictReader(io.StringIO(lire(url).decode("latin-1")), delimiter=";"))


def prudence(x):
    try:
        return x["TYPPRED"] != "commune" or int(x["nbobs_com"]) < 30 or float(x["R2_adj"].replace(",", ".")) < 0.5
    except ValueError:
        return True


def centimes(x):
    return str(round(float(x["loypredm2"].replace(",", ".")) * 100))


def main():
    jeu = sys.argv[1] if len(sys.argv) > 1 else JEU_PAR_DEFAUT
    meta = json.loads(lire("https://www.data.gouv.fr/api/1/datasets/%s/" % jeu))
    urls = {}
    for r in meta["resources"]:
        t = r["title"].lower()
        if r.get("format") == "csv" and "appartement" in t and "pièce" not in t:
            urls["app"] = r["url"]
        elif r.get("format") == "csv" and "maison" in t:
            urls["mai"] = r["url"]
    if set(urls) != {"app", "mai"}:
        sys.exit("Fichiers appartement / maison introuvables dans le jeu %s" % jeu)
    app, mai = lignes_csv(urls["app"]), lignes_csv(urls["mai"])
    maisons = {x["INSEE_C"]: x for x in mai}
    communes = []
    for x in sorted(app, key=lambda c: c["INSEE_C"]):
        m = maisons.get(x["INSEE_C"])
        if not m:
            continue
        nom = x["LIBGEO"].replace("|", " ").strip()
        communes.append("|".join([x["INSEE_C"], nom, x["DEP"], centimes(x), "1" if prudence(x) else "0",
                                  centimes(m), "1" if prudence(m) else "0"]))
    millesime = "".join(ch for ch in meta["title"][-4:] if ch.isdigit())
    entete = {
        "titre": meta["title"].replace('"Carte des loyers"', "« Carte des loyers »"),
        "source": "https://www.data.gouv.fr/datasets/%s/" % jeu,
        "producteur": "Ministère de la Transition écologique (DHUP), avec l'ANIL",
        "millesime": int(millesime) if millesime else None,
        "misAJour": (meta.get("last_update") or "")[:10],
        "verifieLe": datetime.date.today().isoformat(),
    }
    ecrire(SORTIE, entete, communes, False)
    exemple = [c for c in communes if c.startswith(COMMUNE_EXEMPLE + "|")]
    if not exemple:
        sys.exit("Commune de l'exemple %s absente du jeu %s" % (COMMUNE_EXEMPLE, jeu))
    ecrire(SORTIE_EXEMPLE, entete, exemple, True)
    print("%d communes écrites dans %s, et l'exemple dans %s" % (len(communes), os.path.normpath(SORTIE), os.path.normpath(SORTIE_EXEMPLE)))


if __name__ == "__main__":
    main()
