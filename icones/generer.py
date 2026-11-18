"""Génère les icônes PNG de l'application (clé plate en pixels sur fond bleu).

À relancer seulement si le dessin du logo change :  python icones/generer.py
Le dessin doit rester identique à PIXELS dans commun.js. Aucune dépendance.
"""
import os
import struct
import zlib

PIXELS = [
    "................................",
    "................................",
    "................................",
    ".....................1133.......",
    "...................11133........",
    "..................11133.........",
    "..................1133..........",
    ".................1111.......3...",
    ".................11111.....13...",
    ".................111111...113...",
    ".................1111111.1133...",
    ".................11111111113....",
    "................111111111133....",
    "...............111111111333.....",
    "..............11111333333.......",
    ".............1111133............",
    "............1111133.............",
    ".......11111111133..............",
    ".....111111111133...............",
    "....111111111133................",
    "....11311111113.................",
    "...1133.1111113.................",
    "...133...111113.................",
    "...33.....11113.................",
    "...3.......1133.................",
    "..........1113..................",
    ".........11133..................",
    "........11333...................",
    ".......3333.....................",
    "................................",
    "................................",
    "................................",
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
png(os.path.join(ici, "icone-192.png"), 192, 5)
png(os.path.join(ici, "icone-512.png"), 512, 14)
# Icône « maskable » : dessin plus petit, pour rester dans la zone sûre une fois rognée en rond.
png(os.path.join(ici, "icone-512-maskable.png"), 512, 11)
png(os.path.join(ici, "icone-180.png"), 180, 5)   # écran d'accueil iPhone / iPad
print("Icônes générées dans", ici)
