#!/usr/bin/env python3
"""Generate a star-history chart and contributor-origin map for the README."""
import html, json, os, urllib.request
from datetime import datetime, timezone
from pathlib import Path

OWNER, REPO = "MostafaMedhat19", "EyeTracking"
MAP_DATA = "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"

def get(url, accept="application/vnd.github+json"):
    headers = {"Accept": accept, "User-Agent": "EyeTracking-readme-visuals", "X-GitHub-Api-Version": "2022-11-28"}
    if os.environ.get("GITHUB_TOKEN"): headers["Authorization"] = f"Bearer {os.environ['GITHUB_TOKEN']}"
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=45) as response: return json.load(response)

def github(path, accept="application/vnd.github+json"): return get(f"https://api.github.com{path}", accept)

def shell(title, desc, body, width, height):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">
<title id="title">{html.escape(title)}</title><desc id="desc">{html.escape(desc)}</desc><defs>
<style>text{{font-family:Segoe UI,Arial,sans-serif;fill:#f2f2f2}}.heading{{font-size:17px;font-weight:600;fill:#2f81f7}}.sub{{font-size:12px;fill:#58a6ff}}.axis{{font:12px 'Segoe Print','Comic Sans MS',cursive;fill:#f2f2f2}}</style></defs>
<rect width="{width}" height="{height}" fill="#050505"/>{body}</svg>'''

def star_history(repo, stars):
    created = datetime.fromisoformat(repo["created_at"].replace("Z", "+00:00")); now = datetime.now(timezone.utc)
    left, top, width, height = 62, 112, 776, 205; duration = max((now-created).total_seconds(), 1)
    points = [(left, top+height)]
    for i, event in enumerate(sorted(stars, key=lambda item:item["starred_at"]), 1):
        date = datetime.fromisoformat(event["starred_at"].replace("Z", "+00:00"))
        points.append((left+((date-created).total_seconds()/duration)*width, top+height-(i/max(len(stars),1))*height))
    points.append((left+width, points[-1][1])); line = " ".join(f"{x:.1f},{y:.1f}" for x,y in points)
    labels=[]
    for i in range(5):
        ratio=i/4; date=created+(now-created)*ratio
        labels.append(f'<text x="{left+width*ratio:.1f}" y="344" text-anchor="middle" class="axis">{date.strftime("%b %Y")}</text>')
    note='<text x="450" y="224" text-anchor="middle" class="sub">Be the first person to star this project</text>' if not stars else ''
    body=f'''<text x="450" y="36" text-anchor="middle" font-family="Segoe Print,Comic Sans MS,cursive" font-size="22" font-weight="700">Star History</text>
<rect x="74" y="55" width="225" height="34" rx="4" fill="#090909" stroke="#f2f2f2"/><circle cx="92" cy="72" r="5" fill="#ff5a5f"/><text x="106" y="77" class="axis">{OWNER}/{REPO}</text>
<line x1="62" y1="317" x2="838" y2="317" stroke="#f2f2f2" stroke-width="3"/><line x1="62" y1="105" x2="62" y2="317" stroke="#f2f2f2" stroke-width="3"/>
<polyline points="{line}" fill="none" stroke="#ff5a5f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>{note}{''.join(labels)}
<text x="45" y="321" text-anchor="end" class="axis">0</text><text x="45" y="112" text-anchor="end" class="axis">{max(len(stars),1)}</text>
<text x="20" y="220" transform="rotate(-90 20 220)" text-anchor="middle" class="axis">GitHub Stars</text><text x="450" y="378" text-anchor="middle" class="axis">Timeline</text>'''
    return shell("EyeTracking star history", "GitHub stars over the lifetime of the project.", body, 900, 392)

def path_for(rings):
    paths=[]
    for ring in rings:
        commands=[]
        for i,(lon,lat,*_) in enumerate(ring):
            x=32+((lon+180)/360)*836; y=82+((90-lat)/180)*340
            commands.append(('M' if i==0 else 'L')+f'{x:.1f},{y:.1f}')
        if commands: paths.append(' '.join(commands)+' Z')
    return ' '.join(paths)

def contributor_map(contributors, locations, countries):
    active={code.upper() for login,code in locations.items() if any(c['login']==login for c in contributors)}; shapes=[]; names=[]
    for feature in countries['features']:
        props=feature['properties']; geometry=feature.get('geometry') or {}; code=props.get('ISO3166-1-Alpha-2','').upper(); polygons=geometry.get('coordinates',[])
        if geometry.get('type')=='Polygon': polygons=[polygons]
        selected=code in active
        if selected: names.append(props.get('name',code))
        for polygon in polygons:
            path=path_for(polygon)
            if path:
                fill,stroke=('#22c55e','#86efac') if selected else ('#ffffff','#777777')
                shapes.append(f'<path d="{path}" fill="{fill}" stroke="{stroke}" stroke-width=".45"/>')
    count=len([c for c in contributors if c['login']!='github-actions[bot]']); label=', '.join(sorted(names)) or 'Waiting for contributor locations'
    body=f'''<text x="24" y="28" class="heading">☆ Contributors</text><text x="450" y="60" text-anchor="middle" class="sub">Contributor origins</text>
<g>{''.join(shapes)}</g><circle cx="30" cy="452" r="6" fill="#22c55e"/><text x="45" y="456" class="sub">{html.escape(label)}</text>
<text x="870" y="456" text-anchor="end" class="sub">{count} contributor{'s' if count != 1 else ''}</text>'''
    return shell("EyeTracking contributor origins", "A world map highlighting contributor countries in green.", body, 900, 470)

def main():
    repo=github(f'/repos/{OWNER}/{REPO}'); stars=github(f'/repos/{OWNER}/{REPO}/stargazers?per_page=100','application/vnd.github.star+json')
    contributors=github(f'/repos/{OWNER}/{REPO}/contributors?per_page=100'); countries=get(MAP_DATA); locations=json.loads(Path('contributors-locations.json').read_text(encoding='utf-8'))
    Path('assets').mkdir(exist_ok=True); Path('assets/star-history.svg').write_text(star_history(repo,stars),encoding='utf-8'); Path('assets/contributor-map.svg').write_text(contributor_map(contributors,locations,countries),encoding='utf-8')
    print('Generated star history and contributor map')

if __name__=='__main__': main()
