#!/usr/bin/env python3
"""Boutons d'action + texture carbone via gpt-image-1 (style Widget 0.1 de 2013)."""
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
OUT = HERE / "ui"
LOG = HERE / "cost_log.json"
KEY = open(os.path.expanduser("~/.config/megabattles/openai_key")).read().strip()
COST = 0.167  # high 1024x1024
HARD_CAP = 15.0
_lock = threading.Lock()

BTN = (
    "A single glossy circular video-game UI button, {color} glass dome with a strong "
    "specular highlight on the upper half, seated in a dark carbon-fiber ring frame "
    "with four small chrome rivets, subtle inner bevel, 2013 mobile game style, "
    "a {icon} embossed in glossy white glass centered on the dome, isolated on a "
    "fully transparent background, no text, front view, fills the frame."
)

JOBS = {
    "act_move": BTN.format(color="vivid green", icon="four-direction move arrows icon (cross of arrows)"),
    "act_attack": BTN.format(color="vivid red", icon="two crossed swords icon"),
    "act_skill": BTN.format(color="vivid amber-gold", icon="lightning bolt icon"),
    "act_end": BTN.format(color="steel-blue", icon="fast-forward skip icon (two right-pointing triangles)"),
    "carbon": (
        "Seamless dark carbon-fiber weave texture for a video-game UI panel, "
        "fine twill pattern, very dark grey, subtle sheen, flat and uniform, "
        "tileable, no border, no vignette, no text, no objects."
    ),
}


def spent():
    return json.load(open(LOG))["total"] if LOG.exists() else 0.0


def add_cost():
    with _lock:
        total = spent() + COST
        json.dump({"total": round(total, 3), "updated": time.strftime("%F %T")}, open(LOG, "w"))
        return total


def gen(item):
    name, prompt = item
    dest = OUT / f"{name}.png"
    if dest.exists():
        print(f"SKIP {dest.name}", flush=True)
        return True
    if spent() + COST > HARD_CAP:
        print(f"STOP {dest.name} : cap atteint", flush=True)
        return False
    body = json.dumps({
        "model": "gpt-image-1", "prompt": prompt, "size": "1024x1024",
        "quality": "high", "n": 1,
        "background": "auto" if name == "carbon" else "transparent",
    }).encode()
    for attempt in range(4):
        req = urllib.request.Request(
            "https://api.openai.com/v1/images/generations", data=body,
            headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
        try:
            t0 = time.time()
            with urllib.request.urlopen(req, timeout=300) as r:
                data = json.load(r)
            dest.write_bytes(base64.b64decode(data["data"][0]["b64_json"]))
            print(f"OK {dest.name} en {time.time()-t0:.0f}s — total {add_cost():.2f}$", flush=True)
            return True
        except urllib.error.HTTPError as e:
            print(f"ERR {dest.name} HTTP {e.code} : {e.read().decode()[:150]}", flush=True)
            if e.code in (429, 500, 502, 503):
                time.sleep(20 * (attempt + 1))
                continue
            return False
        except Exception as e:
            print(f"ERR {dest.name} : {e}", flush=True)
            time.sleep(10)
    return False


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    todo = [(n, p) for n, p in JOBS.items() if not (OUT / f"{n}.png").exists()]
    if spent() + len(todo) * COST > HARD_CAP:
        sys.exit("Refus : dépasserait le cap")
    print(f"{len(todo)} images (~{len(todo)*COST:.2f}$), déjà dépensé {spent():.2f}$", flush=True)
    with ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(gen, JOBS.items()))
    print(f"Terminé : {sum(results)}/{len(JOBS)} — total {spent():.2f}$", flush=True)
