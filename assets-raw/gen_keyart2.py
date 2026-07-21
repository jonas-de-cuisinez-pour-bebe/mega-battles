#!/usr/bin/env python3
"""Keyart v2 : cohérent avec les designs fidèles aux croquis 2013."""
import base64
import json
import os
import pathlib
import sys
import time
import urllib.request

HERE = pathlib.Path(__file__).parent
LOG = HERE / "cost_log.json"
KEY = open(os.path.expanduser("~/.config/megabattles/openai_key")).read().strip()
COST = 0.25  # high 1536x1024
HARD_CAP = 15.0

PROMPT = (
    "Epic video-game title-screen key art for a tactical RPG, humans versus zombies, "
    "rendered like premium collectible vinyl toy figurines (Toy Story energy), chibi "
    "proportions with oversized expressive heads, bold clean outlines, rich saturated "
    "colors, subtle post-apocalyptic grime. "
    "Left side: a squad of three chibi human toy soldiers standing on a ruined street — "
    "a heavily armored riot-shield tank with glowing blue visor, a lean brawler in a "
    "grey tank top with a dark bandana on his forehead and a big combat dagger, and a "
    "scrawny marksman with a red headband and a lit cigarette holding a long rifle low. "
    "Right side, facing them: three chibi zombie toys — a hugely obese round-bellied "
    "zombie covered in red boils wearing torn shorts, a small skinny zombie in a torn "
    "dark sweater and jeans with huge empty white eyes and one DETACHED hand floating "
    "beyond its outstretched stump, and a winged skeleton archer with a grinning skull "
    "and ragged dark feathered wings hovering with a crude bow. "
    "Dramatic burning sunset sky, embers floating, abandoned military camp and zombie "
    "barricades in the background, strong rim light on every character. Composition: "
    "characters in the lower two-thirds, upper third is moody sky with negative space "
    "for a game logo, slightly darkened bottom edge. No text, no logo, no letters."
)


def spent():
    return json.load(open(LOG))["total"] if LOG.exists() else 0.0


dest = HERE / "home" / "keyart_v3.png"
if dest.exists():
    sys.exit("déjà généré")
if spent() + COST > HARD_CAP:
    sys.exit("cap dépassé")
body = json.dumps({
    "model": "gpt-image-1", "prompt": PROMPT, "size": "1536x1024",
    "quality": "high", "n": 1,
}).encode()
req = urllib.request.Request(
    "https://api.openai.com/v1/images/generations", data=body,
    headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
t0 = time.time()
with urllib.request.urlopen(req, timeout=300) as r:
    data = json.load(r)
dest.write_bytes(base64.b64decode(data["data"][0]["b64_json"]))
total = round(spent() + COST, 3)
json.dump({"total": total, "updated": time.strftime("%F %T")}, open(LOG, "w"))
print(f"OK keyart_v3 en {time.time()-t0:.0f}s — total {total}$")
