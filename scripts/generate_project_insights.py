#!/usr/bin/env python3
"""Generate a self-contained GitHub-compatible SVG with repository insights."""

from __future__ import annotations

import json
import os
import subprocess
import urllib.request
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path


OWNER = "MostafaMedhat19"
REPO = "EyeTracking"
OUTPUT = Path("assets/project-insights.svg")
WEEKS = 12


def api(path: str):
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "EyeTracking-insights-generator",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(f"https://api.github.com{path}", headers=headers)
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def git_commit_dates(since: datetime) -> list[datetime]:
    result = subprocess.run(
        ["git", "log", f"--since={since.isoformat()}", "--format=%cI"],
        check=True,
        capture_output=True,
        text=True,
    )
    return [datetime.fromisoformat(value) for value in result.stdout.splitlines() if value]


def collect():
    now = datetime.now(timezone.utc)
    start = (now - timedelta(weeks=WEEKS)).replace(hour=0, minute=0, second=0, microsecond=0)
    repository = api(f"/repos/{OWNER}/{REPO}")
    contributors = api(f"/repos/{OWNER}/{REPO}/contributors?per_page=100&anon=1")
    releases = api(f"/repos/{OWNER}/{REPO}/releases?per_page=100")

    try:
        commits = api(
            f"/repos/{OWNER}/{REPO}/commits?since={start.isoformat().replace('+00:00', 'Z')}&per_page=100"
        )
        dates = [datetime.fromisoformat(item["commit"]["author"]["date"].replace("Z", "+00:00")) for item in commits]
    except Exception:
        dates = git_commit_dates(start)

    weekly = Counter()
    for date in dates:
        index = max(0, min(WEEKS - 1, int((date - start).days // 7)))
        weekly[index] += 1

    return {
        "stars": repository["stargazers_count"],
        "forks": repository["forks_count"],
        "issues": repository["open_issues_count"],
        "contributors": len(contributors),
        "releases": len(releases),
        "latest": releases[0]["tag_name"] if releases else "—",
        "weekly": [weekly[index] for index in range(WEEKS)],
        "labels": [(start + timedelta(weeks=index)).strftime("%d %b") for index in range(WEEKS)],
        "updated": now.strftime("%d %b %Y"),
    }


def render(data):
    width, height = 900, 360
    chart_left, chart_top, chart_width, chart_height = 54, 190, 792, 105
    values = data["weekly"]
    maximum = max(max(values), 1)
    step = chart_width / (WEEKS - 1)
    points = []
    for index, value in enumerate(values):
        x = chart_left + index * step
        y = chart_top + chart_height - (value / maximum) * chart_height
        points.append((x, y))
    line = " ".join(f"{x:.1f},{y:.1f}" for x, y in points)
    area = f"{chart_left},{chart_top + chart_height} {line} {chart_left + chart_width},{chart_top + chart_height}"

    cards = [
        ("STARS", data["stars"]),
        ("FORKS", data["forks"]),
        ("OPEN ISSUES", data["issues"]),
        ("CONTRIBUTORS", data["contributors"]),
        ("RELEASES", data["releases"]),
        ("LATEST", data["latest"]),
    ]
    card_markup = []
    card_width = 128
    for index, (label, value) in enumerate(cards):
        x = 54 + index * 132
        card_markup.append(
            f'<g transform="translate({x},76)"><rect width="{card_width}" height="72" rx="14" fill="#111827" stroke="#263957"/>'
            f'<text x="14" y="24" class="label">{label}</text><text x="14" y="53" class="value">{value}</text></g>'
        )

    dots = "".join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="#22D3EE" stroke="#07111F" stroke-width="2"/>' for x, y in points)
    labels = "".join(
        f'<text x="{points[index][0]:.1f}" y="321" text-anchor="middle" class="axis">{label}</text>'
        for index, label in enumerate(data["labels"])
        if index % 2 == 0 or index == WEEKS - 1
    )

    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="900" height="360" viewBox="0 0 900 360" role="img" aria-labelledby="title desc">
  <title id="title">EyeTracking project analytics</title>
  <desc id="desc">Repository totals and commits over the last twelve weeks.</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#07111F"/><stop offset="1" stop-color="#0B1220"/></linearGradient>
    <linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#2563EB" stop-opacity=".55"/><stop offset="1" stop-color="#22D3EE" stop-opacity=".04"/></linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <style>
      text {{ font-family: Inter, Segoe UI, Arial, sans-serif; fill: #F8FAFC }}
      .heading {{ font-size: 22px; font-weight: 700 }} .sub {{ font-size: 12px; fill: #8FA7C5 }}
      .label {{ font-size: 10px; font-weight: 700; letter-spacing: 1.1px; fill: #7DD3FC }}
      .value {{ font-size: 22px; font-weight: 800 }} .axis {{ font-size: 9px; fill: #7890AE }}
    </style>
  </defs>
  <rect x="1" y="1" width="898" height="358" rx="22" fill="url(#bg)" stroke="#263957" stroke-width="2"/>
  <circle cx="855" cy="44" r="46" fill="#0032F1" opacity=".14"/><circle cx="818" cy="18" r="28" fill="#22D3EE" opacity=".08"/>
  <text x="54" y="39" class="heading">PROJECT GROWTH</text>
  <text x="54" y="58" class="sub">Live repository snapshot · updated {data['updated']}</text>
  {''.join(card_markup)}
  <text x="54" y="177" class="label">COMMITS · LAST 12 WEEKS</text>
  <line x1="54" y1="295" x2="846" y2="295" stroke="#263957"/>
  <line x1="54" y1="242" x2="846" y2="242" stroke="#17263C"/>
  <polygon points="{area}" fill="url(#area)"/>
  <polyline points="{line}" fill="none" stroke="#22D3EE" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>
  {dots}{labels}
  <text x="846" y="342" text-anchor="end" class="sub">github.com/{OWNER}/{REPO}</text>
</svg>'''


if __name__ == "__main__":
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(render(collect()), encoding="utf-8")
    print(f"Generated {OUTPUT}")
