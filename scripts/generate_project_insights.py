#!/usr/bin/env python3
"""Generate a star-history chart and contributor-origin map for the README."""
import base64, html, json, math, os, re, urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

OWNER, REPO = "MostafaMedhat19", "EyeTracking"
MAP_DATA = "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"

def get(url, accept="application/vnd.github+json"):
    headers = {"Accept": accept, "User-Agent": "EyeTracking-readme-visuals", "X-GitHub-Api-Version": "2022-11-28"}
    if os.environ.get("GITHUB_TOKEN"): headers["Authorization"] = f"Bearer {os.environ['GITHUB_TOKEN']}"
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=45) as response: return json.load(response)

def github(path, accept="application/vnd.github+json"): return get(f"https://api.github.com{path}", accept)

def binary(url):
    request = urllib.request.Request(url, headers={"User-Agent": "EyeTracking-readme-visuals"})
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read(), response.headers.get_content_type()

def shell(title, desc, body, width, height):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">
<title id="title">{html.escape(title)}</title><desc id="desc">{html.escape(desc)}</desc><defs>
<style>text{{font-family:Segoe UI,Arial,sans-serif;fill:#f2f2f2}}.heading{{font-size:17px;font-weight:600;fill:#2f81f7}}.sub{{font-size:12px;fill:#58a6ff}}.count{{font-size:11px;fill:#8b949e}}.axis{{font:12px 'Segoe Print','Comic Sans MS',cursive;fill:#f2f2f2}}</style></defs>
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

def normalized(value):
    return re.sub(r'[^a-z0-9]+', ' ', value.casefold()).strip()

def country_lookup(countries):
    codes = {}
    for feature in countries['features']:
        props = feature['properties']
        code = props.get('ISO3166-1-Alpha-2', '').upper()
        if not code:
            continue
        codes[normalized(code)] = code
        for key in ('name', 'official_name', 'ISO3166-1-Alpha-3'):
            if props.get(key):
                codes[normalized(str(props[key]))] = code
    codes.update({
        'uk': 'GB', 'u k': 'GB', 'usa': 'US', 'u s a': 'US',
        'uae': 'AE', 'u a e': 'AE', 'south korea': 'KR',
    })
    return codes

def resolve_country(location, lookup):
    if not location:
        return None
    parts = [normalized(part) for part in reversed(location.split(','))]
    for part in parts:
        if part in lookup:
            return lookup[part]
    value = normalized(location)
    matches = [(len(name), code) for name, code in lookup.items() if len(name) >= 4 and re.search(rf'\b{re.escape(name)}\b', value)]
    return max(matches, default=(0, None))[1]

def contributor_countries(contributors, overrides, countries):
    lookup = country_lookup(countries)
    valid_codes = set(lookup.values())
    counts, unknown = Counter(), 0
    people = [c for c in contributors if c.get('type') != 'Bot' and not c['login'].endswith('[bot]')]
    for contributor in people:
        login = contributor['login']
        override = str(overrides.get(login, '')).upper()
        code = override if override in valid_codes else None
        if not code:
            profile = github(f'/users/{login}')
            code = resolve_country(profile.get('location'), lookup)
        if code:
            counts[code] += 1
        else:
            unknown += 1
    return people, counts, unknown

def contributor_color(count):
    if count >= 4:
        return '#f97316', '#fdba74'
    if count >= 2:
        return '#eab308', '#fde047'
    return '#22c55e', '#86efac'

def contributor_gallery(contributors):
    people = [c for c in contributors if c.get('type') != 'Bot' and not c['login'].endswith('[bot]')]
    columns = min(max(len(people), 1), 5)
    rows = max(math.ceil(len(people) / 5), 1)
    card_width, card_height = 160, 145
    start_x = (900 - columns * card_width) / 2
    clips, cards = [], []
    for index, contributor in enumerate(people):
        row, column = divmod(index, 5)
        row_columns = min(5, len(people) - row * 5)
        row_start = (900 - row_columns * card_width) / 2
        center_x = row_start + column * card_width + card_width / 2
        center_y = 72 + row * card_height
        image, mime = binary(f"{contributor['avatar_url']}&s=128")
        encoded = base64.b64encode(image).decode()
        clips.append(f'<clipPath id="avatar-{index}"><circle cx="{center_x:.0f}" cy="{center_y}" r="48"/></clipPath>')
        cards.append(
            f'<circle cx="{center_x:.0f}" cy="{center_y}" r="51" fill="#0d1117" stroke="#2f81f7" stroke-width="2"/>'
            f'<image href="data:{mime};base64,{encoded}" x="{center_x-48:.0f}" y="{center_y-48}" width="96" height="96" clip-path="url(#avatar-{index})"/>'
            f'<text x="{center_x:.0f}" y="{center_y+70}" text-anchor="middle" class="sub">@{html.escape(contributor["login"])}</text>'
            f'<text x="{center_x:.0f}" y="{center_y+87}" text-anchor="middle" class="count">{contributor.get("contributions", 0)} contribution{"s" if contributor.get("contributions", 0) != 1 else ""}</text>'
        )
    height = 170 + (rows - 1) * card_height
    body = f'<defs>{"".join(clips)}</defs>{"".join(cards)}'
    return shell("EyeTracking contributors", "GitHub contributors and their contribution counts.", body, 900, height)

def contributor_map(contributors, locations, countries):
    people, counts, unknown = contributor_countries(contributors, locations, countries)
    shapes=[]; country_items=[]
    for feature in countries['features']:
        props=feature['properties']; geometry=feature.get('geometry') or {}; code=props.get('ISO3166-1-Alpha-2','').upper(); polygons=geometry.get('coordinates',[])
        if geometry.get('type')=='Polygon': polygons=[polygons]
        count=counts.get(code, 0)
        if count:
            country_items.append((props.get('name', code), count, contributor_color(count)[0]))
        for polygon in polygons:
            path=path_for(polygon)
            if path:
                fill,stroke=contributor_color(count) if count else ('#ffffff','#777777')
                shapes.append(f'<path d="{path}" fill="{fill}" stroke="{stroke}" stroke-width=".45"/>')
    total=len(people); unknown_label=f' · {unknown} unknown' if unknown else ''
    country_items.sort(key=lambda item: (-item[1], item[0]))
    legend=[]
    for index, (name, count, color) in enumerate(country_items):
        row, column = divmod(index, 4)
        x, y = 30 + column * 215, 452 + row * 24
        label = f'{name} — {count} contributor{"s" if count != 1 else ""}'
        legend.append(f'<circle cx="{x}" cy="{y-4}" r="6" fill="{color}"/><text x="{x+13}" y="{y}" class="sub">{html.escape(label)}</text>')
    legend_rows=max(math.ceil(len(country_items)/4), 1)
    footer_y=456 + legend_rows * 24
    map_height=footer_y + 14
    body=f'''<text x="24" y="28" class="heading">☆ Contributors</text><text x="450" y="60" text-anchor="middle" class="sub">Contributor origins</text>
<g>{''.join(shapes)}</g>{''.join(legend)}
<text x="870" y="{footer_y}" text-anchor="end" class="sub">Total: {total} contributor{'s' if total != 1 else ''}{unknown_label}</text>'''
    return shell("EyeTracking contributor origins", "A world map listing each contributor country, count, and intensity color.", body, 900, map_height)

def main():
    repo=github(f'/repos/{OWNER}/{REPO}'); stars=github(f'/repos/{OWNER}/{REPO}/stargazers?per_page=100','application/vnd.github.star+json')
    contributors=github(f'/repos/{OWNER}/{REPO}/contributors?per_page=100'); countries=get(MAP_DATA); locations=json.loads(Path('contributors-locations.json').read_text(encoding='utf-8'))
    Path('assets').mkdir(exist_ok=True); Path('assets/star-history.svg').write_text(star_history(repo,stars),encoding='utf-8'); Path('assets/contributor-map.svg').write_text(contributor_map(contributors,locations,countries),encoding='utf-8'); Path('assets/contributors.svg').write_text(contributor_gallery(contributors),encoding='utf-8')
    print('Generated star history and contributor map')

if __name__=='__main__': main()
