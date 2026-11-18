"""Génère les icônes PNG de l'application (clé plate en pixels sur fond bleu).

À relancer seulement si le dessin du logo change :  python icones/generer.py
Le dessin doit rester identique à PIXELS dans commun.js. Aucune dépendance.
"""
import os
import struct
import zlib

PIXELS = [
    "........................",
    "........................",
    "................133.....",
    "..............1133......",
    ".............1133.......",
    ".............111.....3..",
    ".............1111...13..",
    ".............11111.133..",
    ".............11111113...",
    "............111111133...",
    "...........111333333....",
    "..........11133.........",
    ".........11133..........",
    "....111111133...........",
    "...111111133............",
    "...13111113.............",
    "..133.11113.............",
    "..33...1113.............",
    "..3.....113.............",
    ".......1133.............",
    "......1333..............",
    ".....333................",
    "........................",
    "........................",
]
FOND = (17, 54, 219)        # bleu du site
COULEURS = {"1": (255, 255, 255), "3": (155, 176, 255)}


def png(chemin, taille, case):
    """Écrit un PNG carré : fond bleu plein, clé plate centrée, `case` pixels par case."""
    n = len(PIXELS)
    marge = (taille - n * case) // 2
    lignes = []
    for y in range(taille):
        ligne = bytearray([0])  # filtre PNG « aucun »
        for x in range(taille):
            gx, gy = (x - marge) // case, (y - marge) // case
            couleur = FOND
            if 0 <= gx < n and 0 <= gy < n and x >= marge and y >= marge:
                couleur = COULEURS.get(PIXELS[gy][gx], FOND)
            ligne += bytes(couleur)
        lignes.append(bytes(ligne))

    def bloc(nom, donnees):
        corps = nom + donnees
        return struct.pack(">I", len(donnees)) + corps + struct.pack(">I", zlib.crc32(corps))

    entete = struct.pack(">IIBBBBB", taille, taille, 8, 2, 0, 0, 0)  # 8 bits, RVB
    with open(chemin, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + bloc(b"IHDR", entete)
                + bloc(b"IDAT", zlib.compress(b"".join(lignes), 9)) + bloc(b"IEND", b""))


ici = os.path.dirname(os.path.abspath(__file__))
png(os.path.join(ici, "icone-192.png"), 192, 7)
png(os.path.join(ici, "icone-512.png"), 512, 18)
# Icône « maskable » : dessin plus petit, pour rester dans la zone sûre une fois rognée en rond.
png(os.path.join(ici, "icone-512-maskable.png"), 512, 14)
png(os.path.join(ici, "icone-180.png"), 180, 6)   # écran d'accueil iPhone / iPad
print("Icônes générées dans", ici)
