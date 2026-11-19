"""Génère les icônes PNG de l'application (le « M » du logo en pixels sur fond bleu).

À relancer seulement si le dessin change :  python3 icones/generer.py
Le dessin doit rester identique à PIXELS dans commun.js. Aucune dépendance.
"""
import os
import struct
import zlib

PIXELS = [
    "........................",
    "........................",
    "........................",
    "........................",
    "...1111........1111.....",
    "...1111........1111.....",
    "...111111....11111133...",
    "...111111....11111133...",
    "...111111111111111133...",
    "...111111111111111133...",
    "...111133111133111133...",
    "...111133111133111133...",
    "...111133..3333111133...",
    "...111133..3333111133...",
    "...111133......111133...",
    "...111133......111133...",
    "...111133......111133...",
    "...111133......111133...",
    ".....3333........3333...",
    ".....3333........3333...",
    "........................",
    "........................",
    "........................",
    "........................",
]
FOND = (17, 54, 219)        # bleu du site
COULEURS = {"1": (255, 255, 255), "3": (155, 176, 255)}


def png(chemin, taille, case):
    """Écrit un PNG carré : fond bleu plein, dessin centré, `case` pixels par case."""
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
png(os.path.join(ici, "icone-m-192.png"), 192, 7)
png(os.path.join(ici, "icone-m-512.png"), 512, 18)
# Icône « maskable » : dessin plus petit, pour rester dans la zone sûre une fois rognée en rond.
png(os.path.join(ici, "icone-m-512-maskable.png"), 512, 14)
png(os.path.join(ici, "icone-m-180.png"), 180, 6)   # écran d'accueil iPhone / iPad
print("Icônes générées dans", ici)
