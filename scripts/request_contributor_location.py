#!/usr/bin/env python3
"""Ask an unresolved first-time contributor once for an optional country code."""
import json
import os
import urllib.request
from pathlib import Path

from generate_project_insights import MAP_DATA, country_lookup, get, resolve_country

MARKER = "<!-- eye-voice-contributor-country-request -->"

def api(path, method="GET", payload=None):
    token = os.environ["GITHUB_TOKEN"]
    request = urllib.request.Request(
        f"https://api.github.com{path}",
        data=json.dumps(payload).encode() if payload is not None else None,
        method=method,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "EyeTracking-contributor-location-prompt",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        return json.load(response) if response.length != 0 else None

def paged(path):
    page = 1
    while True:
        separator = "&" if "?" in path else "?"
        batch = api(f"{path}{separator}per_page=100&page={page}")
        yield from batch
        if len(batch) < 100:
            return
        page += 1

def main():
    event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text(encoding="utf-8"))
    pull = event["pull_request"]
    author = pull["user"]["login"]
    number = pull["number"]
    repository = event["repository"]["full_name"]
    if pull["user"].get("type") == "Bot":
        return

    overrides = json.loads(Path("contributors-locations.json").read_text(encoding="utf-8"))
    if overrides.get(author):
        return
    profile = api(f"/users/{author}")
    lookup = country_lookup(get(MAP_DATA))
    if resolve_country(profile.get("location"), lookup):
        return

    previous = any(
        item["number"] != number and item["user"]["login"].casefold() == author.casefold()
        for item in paged(f"/repos/{repository}/pulls?state=all")
    )
    if previous:
        return
    comments = list(paged(f"/repos/{repository}/issues/{number}/comments"))
    if any(MARKER in (comment.get("body") or "") for comment in comments):
        return

    body = f"""{MARKER}
Thanks for your first contribution to Eye Voice! 🌍

Your public GitHub profile does not provide a country that the contributor map can resolve. If you would like your country highlighted, optionally add your two-letter ISO country code to `contributors-locations.json` in this PR, for example:

```json
"{author}": "IN"
```

Country disclosure is optional. Leaving it blank will not block review or merging; the map will count the contribution as `unknown`.
"""
    api(f"/repos/{repository}/issues/{number}/comments", "POST", {"body": body})
    print(f"Posted the one-time optional country prompt for {author}.")

if __name__ == "__main__":
    main()
