#!/usr/bin/env python3
"""Écran d'accueil Mega Battles : key art + logo + boutons glossy via gpt-image-1.

Réutilise le même garde-fou budget que gen_assets.py (cost_log.json, cap 15 $).
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
OUT = HERE / "home"
LOG = HERE / "cost_log.json"
KEY = open(os.path.expanduser("~/.config/megabattles/openai_key")).read().strip()

# gpt-image-1 quality high : 1024x1024 = 0.167 $, 1536x1024 = 0.25 $
HARD_CAP = 15.0
_lock = threading.Lock()

FIGURINE = (
    "rendered like premium collectible vinyl toy figurines (Toy Story energy), chibi "
    "proportions with oversized expressive heads, bold clean outlines, rich saturated "
    "colors, soft studio lighting, subtle post-apocalyptic grime. "
)

JOBS = {
    # key art : les deux factions face à face, place pour logo en haut et boutons en bas
    "keyart": {
        "size": "1536x1024", "cost": 0.25, "variants": 2, "background": "auto",
        "prompt": (
            "Epic video-game title-screen key art for a tactical RPG, humans versus "
            "zombies. Left side: a squad of three chibi human toy soldiers — a heavily "
            "armored riot-shield tank with glowing blue visor, a scrawny commando with "
            "red headband and combat knife and a cigarette, a calm sniper with a long "
            "scoped rifle — standing on a ruined street. Right side, facing them: three "
            "chibi zombie toys — a massive bloated zombie brute holding a dented car "
            "door as a shield, a sick skinny feral zombie in a torn hoodie with huge "
            "empty white eyes, a hunched zombie spitter with a glowing toxic throat sac. "
            + FIGURINE +
            "Dramatic burning sunset sky, embers floating, abandoned military camp and "
            "zombie barricades in the background, strong rim light on every character. "
            "Composition: characters in the lower two-thirds, upper third is moody sky "
            "with negative space for a game logo, slightly darkened bottom edge. "
            "No text, no logo, no letters anywhere."
        ),
    },
    # logo avec le titre (texte court : fiable)
    "logo": {
        "size": "1536x1024", "cost": 0.25, "variants": 2, "background": "transparent",
        "prompt": (
            "Video-game logo with the text \"MEGA BATTLES\" in two stacked lines, "
            "chunky beveled metallic letters with scratched olive-drab military paint "
            "and stitched zombie-green cracks glowing faintly, slight comic-book "
            "perspective tilt, thick dark outline, subtle orange warning-stripe accents, "
            "cartoon post-apocalyptic mobile-game style, isolated on a fully transparent "
            "background, no other text, no characters."
        ),
    },
    # boutons glossy vierges façon benchmark 2013 (carbone + rivets + verre coloré)
    "btn_orange": {
        "size": "1536x1024", "cost": 0.25, "variants": 1, "background": "transparent",
        "prompt": (
            "A single blank glossy video-game UI button, wide rounded-rectangle pill "
            "shape, vivid orange glass surface with strong specular highlight on top "
            "half, dark carbon-fiber outer frame with small chrome rivets, subtle inner "
            "bevel, mobile game style from 2013, isolated on a fully transparent "
            "background, absolutely no text, no icon, front view, fills the frame width."
        ),
    },
    "btn_green": {
        "size": "1536x1024", "cost": 0.25, "variants": 1, "background": "transparent",
        "prompt": (
            "A single blank glossy video-game UI button, wide rounded-rectangle pill "
            "shape, vivid green glass surface with strong specular highlight on top "
            "half, dark carbon-fiber outer frame with small chrome rivets, subtle inner "
            "bevel, mobile game style from 2013, isolated on a fully transparent "
            "background, absolutely no text, no icon, front view, fills the frame width."
        ),
    },
}


def spent():
    if LOG.exists():
        return json.load(open(LOG))["total"]
    return 0.0


def add_cost(c):
    with _lock:
        total = spent() + c
        json.dump({"total": round(total, 3), "updated": time.strftime("%F %T")}, open(LOG, "w"))
        return total


def gen(job):
    name, variant, spec = job
    dest = OUT / f"{name}_v{variant}.png"
    if dest.exists():
        print(f"SKIP {dest.name}", flush=True)
        return True
    if spent() + spec["cost"] > HARD_CAP:
        print(f"STOP {dest.name} : cap {HARD_CAP}$ atteint", flush=True)
        return False
    body = json.dumps({
        "model": "gpt-image-1",
        "prompt": spec["prompt"],
        "size": spec["size"],
        "quality": "high",
        "background": spec["background"],
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
            total = add_cost(spec["cost"])
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
    OUT.mkdir(exist_ok=True)
    jobs = [(n, v, spec) for n, spec in JOBS.items() for v in range(1, spec["variants"] + 1)]
    todo = [j for j in jobs if not (OUT / f"{j[0]}_v{j[1]}.png").exists()]
    est = sum(j[2]["cost"] for j in todo)
    if spent() + est > HARD_CAP:
        sys.exit(f"Refus : {est:.2f}$ ferait dépasser le cap de {HARD_CAP}$")
    print(f"{len(todo)} images (~{est:.2f}$), déjà dépensé : {spent():.2f}$", flush=True)
    with ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(gen, jobs))
    print(f"Terminé : {sum(results)}/{len(jobs)} OK — total {spent():.2f}$", flush=True)
