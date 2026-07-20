#!/usr/bin/env python3
"""Génération des personnages Mega Battles via gpt-image-1.

Garde-fous : coût loggé par appel dans cost_log.json, arrêt dur à 15 $.
Usage : python3 gen_assets.py [--variants 3]
"""
import base64
import json
import os
import pathlib
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

HERE = pathlib.Path(__file__).parent
OUT = HERE / "units"
LOG = HERE / "cost_log.json"
KEY = open(os.path.expanduser("~/.config/megabattles/openai_key")).read().strip()

COST_PER_IMAGE = 0.167  # gpt-image-1, quality high, 1024x1024
HARD_CAP = 15.0
_lock = threading.Lock()

STYLE = (
    "Character concept art for a tactical RPG board game, rendered like a premium "
    "collectible vinyl toy figurine (Toy Story energy), chibi proportions with an "
    "oversized expressive head, bold clean outlines, rich saturated colors, soft "
    "studio lighting with gentle rim light, subtle post-apocalyptic grime and "
    "scratches. Full body, confident dynamic standing pose, 3/4 view facing right, "
    "feet visible. Isolated on a fully transparent background, no ground, no shadow, "
    "no text, no logo, no frame. "
)

CHARS = {
    "humans_tanker": (
        "A heavily armored human riot-soldier tank: bulky stacked armor plates, a huge "
        "scratched riot shield held forward, closed helmet with glowing blue visor, "
        "olive-drab and navy-blue color scheme with orange warning stripes."
    ),
    "humans_dps": (
        "A scrawny wiry human commando: sleeveless shirt, red headband, lit cigarette "
        "hanging from his mouth, smug half-closed eyes, a big combat knife held low in "
        "one hand, dog tags, fingerless gloves, rolled-up military pants, blue-grey palette."
    ),
    "humans_archer": (
        "A calm human sniper: long rifle with oversized scope resting on the shoulder, "
        "baseball cap worn low, scarf covering the mouth, small backpack with antenna, "
        "blue-grey and olive palette."
    ),
    "zombies_tanker": (
        "A massive bloated zombie brute in torn military gear: swollen sickly-green body, "
        "tiny angry head sunk between huge shoulders, scraps of armor strapped with belts, "
        "dragging a dented car door as a shield, green and dark-red palette."
    ),
    "zombies_dps": (
        "A sick skinny feral zombie in a torn hoodie: huge empty white eyes, black goo "
        "drooling from its fanged mouth, long claw hands, hunched aggressive pose ready "
        "to pounce, sickly green skin, dark-red stains, ragged sneakers."
    ),
    "zombies_archer": (
        "A hunched zombie spitter: distended unhinged jaw, glowing toxic throat sac, "
        "ragged clothes fused with skin, cheeks inflated ready to spit a glowing "
        "projectile, sickly green skin with purple boils."
    ),
}


def spent():
    if LOG.exists():
        return json.load(open(LOG))["total"]
    return 0.0


def add_cost():
    with _lock:
        total = spent() + COST_PER_IMAGE
        json.dump({"total": round(total, 3), "updated": time.strftime("%F %T")}, open(LOG, "w"))
        return total


def gen(job):
    name, variant = job
    dest = OUT / f"{name}_v{variant}.png"
    if dest.exists():
        print(f"SKIP {dest.name} (déjà là)", flush=True)
        return True
    if spent() + COST_PER_IMAGE > HARD_CAP:
        print(f"STOP {dest.name} : cap {HARD_CAP}$ atteint", flush=True)
        return False
    body = json.dumps({
        "model": "gpt-image-1",
        "prompt": STYLE + CHARS[name],
        "size": "1024x1024",
        "quality": "high",
        "background": "transparent",
        "n": 1,
    }).encode()
    for attempt in range(4):
        req = urllib.request.Request(
            "https://api.openai.com/v1/images/generations",
            data=body,
            headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
        )
        try:
            t0 = time.time()
            with urllib.request.urlopen(req, timeout=300) as r:
                data = json.load(r)
            dest.write_bytes(base64.b64decode(data["data"][0]["b64_json"]))
            total = add_cost()
            print(f"OK {dest.name} en {time.time()-t0:.0f}s — total {total:.2f}$", flush=True)
            return True
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:200]
            print(f"ERR {dest.name} HTTP {e.code} (essai {attempt+1}) : {msg}", flush=True)
            if e.code in (429, 500, 502, 503):
                time.sleep(20 * (attempt + 1))
                continue
            return False
        except Exception as e:
            print(f"ERR {dest.name} (essai {attempt+1}) : {e}", flush=True)
            time.sleep(10)
    return False


if __name__ == "__main__":
    variants = 3
    if "--variants" in sys.argv:
        variants = int(sys.argv[sys.argv.index("--variants") + 1])
    OUT.mkdir(exist_ok=True)
    jobs = [(n, v) for n in CHARS for v in range(1, variants + 1)]
    todo = [j for j in jobs if not (OUT / f"{j[0]}_v{j[1]}.png").exists()]
    est = len(todo) * COST_PER_IMAGE
    if spent() + est > HARD_CAP:
        sys.exit(f"Refus : {len(todo)} images = {est:.2f}$ ferait dépasser le cap de {HARD_CAP}$")
    print(f"{len(todo)} images à générer (~{est:.2f}$), déjà dépensé : {spent():.2f}$", flush=True)
    with ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(gen, jobs))
    print(f"Terminé : {sum(results)}/{len(jobs)} OK — total {spent():.2f}$", flush=True)
