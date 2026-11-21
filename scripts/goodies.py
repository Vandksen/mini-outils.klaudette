#!/usr/bin/env python3
"""Génère les goodies de la page « Goodies » dans le dossier goodies/.

Usage, depuis la racine du dépôt :

    python3 scripts/goodies.py

Les visuels sont dessinés dans scripts/goodies/visuels.html (un visuel par ancre) et rendus
par Google Chrome sans fenêtre : PNG pour les stickers et le fond d'écran au logo, JPG pour
le fond d'écran à la tempête (converti avec sips, livré avec macOS), PDF pour la planche A4.
À relancer seulement si le logo, le slogan ou un visuel change ; ensuite augmenter VERSION
dans commun.js puis commiter, comme pour toute publication.

Aucune dépendance Python : Python 3, Google Chrome et sips suffisent.
"""
import os
import subprocess
import sys
import tempfile

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(RACINE, "scripts", "goodies", "visuels.html")
SORTIE = os.path.join(RACINE, "goodies")

# (ancre dans visuels.html, fichier produit, largeur, hauteur, échelle)
# Sticker : 560 × 160 à l'échelle 2,5 = 1 400 × 400 px, soit environ 395 ppp à 9 cm de large.
IMAGES = [
    ("sticker-creme", "sticker-creme.png", 560, 160, 2.5),
    ("sticker-bleu", "sticker-bleu.png", 560, 160, 2.5),
    ("fond-tempete-bureau", "fond-ecran-tempete-bureau.jpg", 2560, 1440, 1),
    ("fond-tempete-telephone", "fond-ecran-tempete-telephone.jpg", 1179, 2556, 1),
    ("fond-logo-bureau", "fond-ecran-logo-bureau.png", 2560, 1440, 1),
    ("fond-logo-telephone", "fond-ecran-logo-telephone.png", 1179, 2556, 1),
]


def chrome(profil, *options):
    # Profil jetable : Chrome sans fenêtre ne touche pas au profil de l'utilisateur.
    commande = [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
                "--user-data-dir=" + profil, "--virtual-time-budget=4000",
                "--allow-file-access-from-files"] + list(options)
    subprocess.run(commande, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def main():
    if not os.path.exists(CHROME):
        sys.exit("Google Chrome est introuvable : " + CHROME)
    os.makedirs(SORTIE, exist_ok=True)
    url = "file://" + SOURCE
    with tempfile.TemporaryDirectory() as profil:
        for ancre, fichier, largeur, hauteur, echelle in IMAGES:
            cible = os.path.join(SORTIE, fichier)
            png = cible if fichier.endswith(".png") else os.path.join(profil, "rendu.png")
            chrome(profil, "--default-background-color=00000000", "--window-size=%d,%d" % (largeur, hauteur),
                   "--force-device-scale-factor=%s" % echelle, "--screenshot=" + png, url + "#" + ancre)
            if png != cible:
                subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "88", png, "--out", cible],
                               check=True, stdout=subprocess.DEVNULL)
            print("  ", fichier)
        chrome(profil, "--no-pdf-header-footer", "--print-to-pdf=" + os.path.join(SORTIE, "planche-stickers-a4.pdf"),
               url + "#planche")
        print("   planche-stickers-a4.pdf")
    print("Goodies générés dans", SORTIE)


if __name__ == "__main__":
    main()
