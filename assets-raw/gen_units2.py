#!/usr/bin/env python3
"""Vague 2 des portraits : fidèles aux croquis 2013 (horde zombie + DPS design)."""
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
OUT = HERE / "units2"
LOG = HERE / "cost_log.json"
KEY = open(os.path.expanduser("~/.config/megabattles/openai_key")).read().strip()
COST = 0.167
HARD_CAP = 15.0
_lock = threading.Lock()

STYLE = (
    "Character concept art for a tactical RPG board game, rendered like a premium "
    "collectible vinyl toy figurine (Toy Story energy), chibi proportions with an "
    "oversized expressive head, bold clean outlines, rich saturated colors, soft "
    "studio lighting with gentle rim light, subtle post-apocalyptic grime. Full body, "
    "standing pose, 3/4 view facing right, feet visible. Isolated on a fully "
    "transparent background, no ground, no shadow, no text, no logo, no frame. "
)

CHARS = {
    "humans_dps": (
        "A lean muscular human brawler: grey tank top (marcel), thin dark bandana "
        "tied across his forehead, messy black hair, right forearm wrapped in white "
        "bandages, holding a big combat dagger in reverse grip blade-down, military "
        "shorts with belt, combat boots, determined scowl."
    ),
    "humans_archer": (
        "A scrawny wiry human marksman: red headband knotted at the back, lit "
        "cigarette hanging from his mouth, smug half-closed eyes, olive sleeveless "
        "shirt, holding a long rifle low along his leg in one relaxed hand, "
        "rolled-up blue-grey pants, boots."
    ),
    "zombies_dps": (
        "A small skinny zombie in a torn dark-blue sweater and jeans: huge empty "
        "white eyes, black gaping oval mouth, messy dark hair, one arm outstretched "
        "forward with the hand DETACHED, floating a few centimeters beyond the "
        "stump, sickly green skin, worn sneakers."
    ),
    "zombies_tanker": (
        "A hugely obese round zombie: enormous bloated belly hanging over torn "
        "brown shorts, small round head with big blank round white eyes sunk "
        "between massive shoulders, round red sores and boils dotted on the body, "
        "stubby bare legs, thick drooping arms, sickly green skin."
    ),
    "zombies_archer": (
        "An undead winged skeleton archer: grinning white skull with black eye "
        "sockets and a row of teeth, ragged dark feathered wings spread behind, "
        "bony ribcage body, holding a crude wooden bow in front, crouched hovering "
        "pose with folded bony legs."
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
    name, desc = item
    dest = OUT / f"{name}.png"
    if dest.exists():
        print(f"SKIP {dest.name}", flush=True)
        return True
    if spent() + COST > HARD_CAP:
        print(f"STOP {dest.name} : cap atteint", flush=True)
        return False
    body = json.dumps({
        "model": "gpt-image-1", "prompt": STYLE + desc, "size": "1024x1024",
        "quality": "high", "background": "transparent", "n": 1,
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
    todo = [(n, d) for n, d in CHARS.items() if not (OUT / f"{n}.png").exists()]
    if spent() + len(todo) * COST > HARD_CAP:
        sys.exit("Refus : dépasserait le cap")
    print(f"{len(todo)} images (~{len(todo)*COST:.2f}$), déjà dépensé {spent():.2f}$", flush=True)
    with ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(gen, CHARS.items()))
    print(f"Terminé : {sum(results)}/{len(CHARS)} — total {spent():.2f}$", flush=True)
