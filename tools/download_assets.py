"""Download freely-licensed photos from Wikimedia Commons for the museum.

Searches Commons for each asset slug, downloads a 1600px-wide rendition,
and writes assets/manifest.json. Re-run any time; existing files are kept.

Usage:  python tools/download_assets.py
"""
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "assets", "img")
os.makedirs(OUT, exist_ok=True)

API = "https://commons.wikimedia.org/w/api.php"
HEADERS = {"User-Agent": "RealMadridMuseum/1.1 (educational CG project)"}
THROTTLE_S = 3.0  # be polite; avoids HTTP 429


def _open_json(req, retries=4):
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < retries - 1:
                wait = 8 * (attempt + 1)
                print("      429 rate-limited; waiting %ds" % wait)
                time.sleep(wait)
                continue
            raise
    return {}

# slug -> list of Commons search queries, tried in order
QUERIES = {
    "bernabeu_old": [
        'intitle:"Bernabeu" stadium 2005',
        'intitle:"Bernabeu" 2006',
        "Estadio Santiago Bernabeu 2007 night",
    ],
    "bernabeu_new": [
        'intitle:"Bernabeu" 2023 stadium',
        "Santiago Bernabeu stadium 2024",
        "New Santiago Bernabeu stadium",
    ],
    "ucl_trophy": [
        "UEFA Champions League trophy 2019 final",
        'intitle:"trophy" UEFA Champions League -EHF -handball -mini',
        "European Champion Clubs Cup trophy",
    ],
    "copa_trophy": ['intitle:"Copa del Rey" trophy', "Copa del Rey trophy"],
    "laliga_trophy": ['intitle:"La Liga" trophy', "LaLiga trophy", "Spanish league trophy"],
    "cr7": [
        'intitle:"Cristiano Ronaldo" 2018 Real Madrid',
        "Cristiano Ronaldo Real Madrid 2017",
        "Cristiano Ronaldo 2015",
    ],
    "cr7_portrait": [
        'intitle:"Cristiano Ronaldo" 2018',
        'intitle:"Cristiano Ronaldo" 2017 portrait',
        "Cristiano Ronaldo Portugal national team 2018 face",
        "Cristiano Ronaldo press conference 2016",
    ],
    "distefano": ["Alfredo Di Stefano", "Di Stefano Real Madrid"],
    "kopa": ["Raymond Kopa", "Raymond Kopa Real Madrid"],
    "figo": ['intitle:"Figo" Real Madrid', "Luis Figo 2001"],
    "ronaldo9": [
        'intitle:"Ronaldo" 2002 World Cup final',
        "Ronaldo Nazario 2002",
        "Ronaldo Brazil Yokohama 2002",
    ],
    "cannavaro": [
        'intitle:"Cannavaro" 2006',
        "Fabio Cannavaro Italy 2006",
        "Cannavaro Ballon d'Or 2006",
    ],
    "modric": ['intitle:"Modric" 2018', "Luka Modric Real Madrid 2018"],
    "benzema": ['intitle:"Benzema" 2022', "Karim Benzema 2021"],
    "fans": ["Real Madrid fans Bernabeu", "Real Madrid supporters"],
    "final_2014": [
        "Real Madrid Decima celebration 2014",
        'intitle:"2014" intitle:"Champions League" Madrid',
        "Real Madrid Atletico Lisbon 2014",
    ],
    "final_2016": ["2016 UEFA Champions League Final Milan", "Real Madrid Atletico 2016 final"],
    "final_2017": [
        "Real Madrid celebration Cardiff 2017",
        'intitle:"2017" "Champions League Final" Juventus Real',
        "Real Madrid Duodecima celebration",
    ],
    "final_2018": [
        "Real Madrid celebration 2018 Champions League",
        'intitle:"2018" "Champions League Final" Kiev',
        "Cibeles Real Madrid 2018",
    ],
    "final_2022": [
        "Real Madrid celebration 2022 Champions League",
        'intitle:"2022" "Champions League Final"',
        "Real Madrid Decimocuarta celebration",
    ],
    "final_2024": [
        "Real Madrid celebration 2024 Champions League",
        'intitle:"2024" "Champions League Final" Wembley',
        "Real Madrid Decimoquinta",
    ],
    "final_2002": ['intitle:"2002" Real Madrid Glasgow', "Zidane 2002 Hampden", "Novena Real Madrid 2002"],
    "final_2000": ['intitle:"2000" "Champions League Final"', "Real Madrid Octava 2000"],
    "final_1998": ['intitle:"1998" "Champions League Final"', "Real Madrid Septima 1998"],
    "final_1966": ["European Cup Final 1966 Real Madrid"],
    "final_1960": ["European Cup Final 1960 Hampden", "Real Madrid Eintracht 1960"],
    "final_1959": ["European Cup Final 1959"],
    "final_1958": ["European Cup Final 1958"],
    "final_1957": ["European Cup Final 1957"],
    "final_1956": ["European Cup Final 1956"],
}


def api_search(query, limit=8):
    time.sleep(THROTTLE_S)
    params = {
        "action": "query",
        "format": "json",
        "formatversion": "2",
        "generator": "search",
        "gsrsearch": query,
        "gsrnamespace": "6",
        "gsrlimit": str(limit),
        "prop": "imageinfo",
        "iiprop": "url|mime|size",
        "iiurlwidth": "1600",
    }
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=HEADERS)
    return _open_json(req)


def pick_file(data):
    pages = (data.get("query") or {}).get("pages") or []
    best = None
    for p in pages:
        for info in p.get("imageinfo") or []:
            if info.get("mime") not in ("image/jpeg", "image/png"):
                continue
            if (info.get("width") or 0) < 500:
                continue
            cand = {
                "url": info.get("thumburl") or info.get("url"),
                "title": p.get("title", ""),
                "width": info.get("width", 0),
            }
            if best is None or cand["width"] > best["width"]:
                best = cand
    return best


def download(url, dest):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=60) as r, open(dest, "wb") as f:
        f.write(r.read())


def main():
    manifest_path = os.path.join(ROOT, "assets", "manifest.json")
    manifest = {}
    if os.path.exists(manifest_path):
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)

    only = set(sys.argv[1:])
    for slug, queries in QUERIES.items():
        if only and slug not in only:
            continue
        dest = os.path.join(OUT, slug + ".jpg")
        if slug in manifest and os.path.exists(dest):
            print("keep  %-16s (already downloaded)" % slug)
            continue
        found = None
        for q in queries:
            try:
                found = pick_file(api_search(q))
            except Exception as e:
                print("warn  %-16s query error: %s" % (slug, e))
                continue
            if found:
                break
        if not found:
            print("MISS  %-16s (no suitable image; procedural fallback will be used)" % slug)
            continue
        try:
            download(found["url"], dest)
            manifest[slug] = {"file": "assets/img/%s.jpg" % slug, "source": found["title"]}
            print("ok    %-16s <- %s" % (slug, found["title"][:70]))
        except Exception as e:
            print("fail  %-16s %s" % (slug, e))

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print("\n%d assets in manifest" % len(manifest))


if __name__ == "__main__":
    main()
