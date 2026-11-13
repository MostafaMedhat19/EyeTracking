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
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#07111F"/><stop offset="1" stop-color="#0B1220"/></linearGradient>
<linearGradient id="blue" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#0032F1"/><stop offset="1" stop-color="#22D3EE"/></linearGradient>
<filter id="glow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<style>text{{font-family:Inter,Segoe UI,Arial,sans-serif;fill:#F8FAFC}}.heading{{font-size:24px;font-weight:800}}.sub{{font-size:12px;fill:#8FA7C5}}.axis{{font-size:10px;fill:#7890AE}}</style></defs>
<rect x="1" y="1" width="{width-2}" height="{height-2}" rx="22" fill="url(#bg)" stroke="#263957" stroke-width="2"/>{body}</svg>'''

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
    body=f'''<circle cx="852" cy="46" r="48" fill="#0032F1" opacity=".13"/><text x="54" y="43" class="heading">STAR HISTORY</text>
<text x="54" y="64" class="sub">Growth of the EyeTracking open-source community</text><text x="838" y="44" text-anchor="end" font-size="28" font-weight="800">★ {len(stars)}</text>
<text x="838" y="64" text-anchor="end" class="sub">GitHub stars</text><line x1="62" y1="317" x2="838" y2="317" stroke="#263957"/><line x1="62" y1="214" x2="838" y2="214" stroke="#17263C"/><line x1="62" y1="112" x2="838" y2="112" stroke="#17263C"/>
<polygon points="{left},{top+height} {line} {left+width},{top+height}" fill="#0032F1" opacity=".14"/><polyline points="{line}" fill="none" stroke="url(#blue)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>{note}{''.join(labels)}
<text x="838" y="374" text-anchor="end" class="sub">Updated {now.strftime('%d %b %Y')}</text>'''
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
                fill,stroke=('#22C55E','#86EFAC') if selected else ('#17263C','#3A4E6A')
                shapes.append(f'<path d="{path}" fill="{fill}" stroke="{stroke}" stroke-width=".45"/>')
    count=len([c for c in contributors if c['login']!='github-actions[bot]']); label=', '.join(sorted(names)) or 'Waiting for contributor locations'
    body=f'''<text x="54" y="43" class="heading">CONTRIBUTOR ORIGINS</text><text x="54" y="64" class="sub">Countries turn green when contributors add their location to the project map</text>
<text x="846" y="43" text-anchor="end" font-size="24" font-weight="800">{count}</text><text x="846" y="61" text-anchor="end" class="sub">contributors</text><g>{''.join(shapes)}</g>
<circle cx="55" cy="446" r="7" fill="#22C55E"/><text x="70" y="450" class="sub">{html.escape(label)}</text><text x="846" y="450" text-anchor="end" class="sub">Public, opt-in country codes only</text>'''
    return shell("EyeTracking contributor origins", "A world map highlighting contributor countries in green.", body, 900, 470)

def main():
    repo=github(f'/repos/{OWNER}/{REPO}'); stars=github(f'/repos/{OWNER}/{REPO}/stargazers?per_page=100','application/vnd.github.star+json')
    contributors=github(f'/repos/{OWNER}/{REPO}/contributors?per_page=100'); countries=get(MAP_DATA); locations=json.loads(Path('contributors-locations.json').read_text(encoding='utf-8'))
    Path('assets').mkdir(exist_ok=True); Path('assets/star-history.svg').write_text(star_history(repo,stars),encoding='utf-8'); Path('assets/contributor-map.svg').write_text(contributor_map(contributors,locations,countries),encoding='utf-8')
    print('Generated star history and contributor map')

if __name__=='__main__': main()
