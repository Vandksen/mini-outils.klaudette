#!/usr/bin/env python3
"""Produit le dossier dvf/ à partir du fichier le plus récent des « Demandes de valeurs
foncières » (DGFiP, data.gouv.fr) : les ventes immobilières d'un semestre ou d'une année.
Repris par ventes-immobilieres.html.

Usage :
  python3 scripts/dvf.py                  # télécharge le dernier fichier publié
  python3 scripts/dvf.py fichier.txt      # part d'un fichier déjà téléchargé (et dézippé)

Sorties (dossier dvf/, exclu des moteurs de recherche par robots.txt, comme l'exigent les
conditions d'utilisation des DVF) :
  dvf/meta.json        source, fichier, date de publication, période couverte, nombre de ventes
  dvf/communes.txt     « code INSEE|nom|département|nombre de ventes », une commune par ligne
  dvf/<dép>.txt        les ventes du département, une par ligne :
                       code INSEE|AAAAMMJJ|nature|valeur €|type|surface bâtie m2|pièces|
                       nombre de locaux|surface du terrain m2|adresse|code postal

Une vente (mutation) réunit plusieurs lignes du fichier : une par local et par parcelle.
Elles sont regroupées par date, nature, valeur, département, commune et numéro de
disposition ; locaux et parcelles répétés sont dédoublonnés. Le type de la vente est celui
de son bien principal : M maison, A appartement, L local industriel ou commercial,
D dépendance seule, T terrain sans bâti.
"""
import csv
import datetime
import io
import json
import os
import sys
import urllib.request
import zipfile

JEU = "demandes-de-valeurs-foncieres"
RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SORTIE = os.path.join(RACINE, "dvf")
NATURES = {"Vente": "V", "Vente en l'état futur d'achèvement": "F", "Vente terrain à bâtir": "B",
           "Adjudication": "A", "Echange": "E", "Expropriation": "X"}
TYPES = {"1": "M", "2": "A", "3": "D", "4": "L"}
PRIORITE = "MALD"   # ordre de choix du bien principal


def lire(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "mini-outils"})) as r:
        return r.read()


def nombre(x):
    x = (x or "").strip().replace(",", ".")
    try:
        return float(x)
    except ValueError:
        return 0.0


def dernier_fichier():
    meta = json.loads(lire("https://www.data.gouv.fr/api/1/datasets/%s/" % JEU))
    fichiers = [r for r in meta["resources"] if r["title"].startswith("Valeurs foncières")]
    r = max(fichiers, key=lambda x: (x["title"][18:22], x["title"]))   # année, puis « - Premier/Second semestre »
    return r, meta


def main():
    if len(sys.argv) > 1:
        texte = open(sys.argv[1], encoding="utf-8").read()
        ressource = {"title": os.path.basename(sys.argv[1]), "url": "", "last_modified": ""}
        meta = {"last_update": ""}
    else:
        ressource, meta = dernier_fichier()
        z = zipfile.ZipFile(io.BytesIO(lire(ressource["url"])))
        texte = z.read(z.namelist()[0]).decode("utf-8")
    ventes = {}
    lecteur = csv.reader(io.StringIO(texte), delimiter="|")
    titres = next(lecteur)
    i = {t: k for k, t in enumerate(titres)}
    for c in lecteur:
        if len(c) < len(titres):
            continue
        dep, com = c[i["Code departement"]], c[i["Code commune"]].zfill(3)
        insee = (dep[:2] + com) if len(dep) == 3 else (dep.zfill(2) + com)
        cle = (c[i["Date mutation"]], c[i["Nature mutation"]], c[i["Valeur fonciere"]], dep, insee, c[i["No disposition"]])
        v = ventes.get(cle)
        if v is None:
            v = ventes[cle] = {"locaux": {}, "parcelles": {}, "adresse": "", "cp": "", "nom": c[i["Commune"]]}
        parcelle = (c[i["Section"]], c[i["No plan"]])
        typ = TYPES.get(c[i["Code type local"]])
        if typ:
            local = parcelle + (typ, c[i["Surface reelle bati"]], c[i["Nombre pieces principales"]], c[i["1er lot"]])
            v["locaux"][local] = (typ, nombre(c[i["Surface reelle bati"]]), int(nombre(c[i["Nombre pieces principales"]])))
        if c[i["Surface terrain"]]:
            v["parcelles"][parcelle + (c[i["Nature culture"]],)] = nombre(c[i["Surface terrain"]])
        adresse = " ".join(x for x in [c[i["No voie"]].lstrip("0") + c[i["B/T/Q"]], c[i["Type de voie"]], c[i["Voie"]]] if x).strip()
        if adresse and (not v["adresse"] or (typ in ("M", "A", "L") and not v.get("adresseLocal"))):
            v["adresse"], v["cp"] = adresse, c[i["Code postal"]]
            if typ in ("M", "A", "L"):
                v["adresseLocal"] = True

    par_dep, communes, debut, fin = {}, {}, None, None
    for (date, nature, valeur, dep, insee, _), v in ventes.items():
        j, m, a = date.split("/")
        jour = a + m + j
        debut = jour if debut is None or jour < debut else debut
        fin = jour if fin is None or jour > fin else fin
        locaux = list(v["locaux"].values())
        types = [t for t, _, _ in locaux]
        principal = next((t for t in PRIORITE if t in types), "T" if v["parcelles"] else "")
        if not principal:
            continue
        surface = sum(s for t, s, _ in locaux if t == principal) if principal != "T" else 0
        pieces = sum(p for t, _, p in locaux if t == principal) if principal in ("M", "A") else 0
        nb = sum(1 for t in types if t == principal)
        terrain = sum(v["parcelles"].values())
        ligne = "|".join([insee, jour, NATURES.get(nature, "?"), str(round(nombre(valeur))), principal, str(round(surface)), str(pieces),
                          str(nb), str(round(terrain)), v["adresse"].replace("|", " "), v["cp"]])
        dossier = dep.zfill(2) if len(dep) < 3 else dep
        par_dep.setdefault(dossier, []).append(ligne)
        c = communes.setdefault(insee, [v["nom"], dossier, 0])
        c[2] += 1

    os.makedirs(SORTIE, exist_ok=True)
    for f in os.listdir(SORTIE):
        if f.endswith(".txt"):
            os.remove(os.path.join(SORTIE, f))
    for dep, lignes in par_dep.items():
        lignes.sort(key=lambda l: (l.split("|")[0], l.split("|")[1]), reverse=False)
        with open(os.path.join(SORTIE, dep + ".txt"), "w", encoding="utf-8") as f:
            f.write("\n".join(lignes) + "\n")
    with open(os.path.join(SORTIE, "communes.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join("|".join([code, nom, dep, str(nb)]) for code, (nom, dep, nb) in sorted(communes.items())) + "\n")
    fmt = lambda s: s[:4] + "-" + s[4:6] + "-" + s[6:]
    with open(os.path.join(SORTIE, "meta.json"), "w", encoding="utf-8") as f:
        json.dump({
            "source": "https://www.data.gouv.fr/datasets/demandes-de-valeurs-foncieres/",
            "producteur": "Direction générale des finances publiques (DGFiP)",
            "fichier": ressource["title"],
            "url": ressource["url"],
            "publieLe": (ressource.get("last_modified") or meta.get("last_update") or "")[:10],
            "du": fmt(debut), "au": fmt(fin),
            "ventes": sum(len(l) for l in par_dep.values()),
            "verifieLe": datetime.date.today().isoformat(),
        }, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("%d ventes, %d communes, %d départements, du %s au %s" % (sum(len(l) for l in par_dep.values()), len(communes), len(par_dep), fmt(debut), fmt(fin)))


if __name__ == "__main__":
    main()
