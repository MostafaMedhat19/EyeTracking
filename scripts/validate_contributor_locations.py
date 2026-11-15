#!/usr/bin/env python3
"""Validate opt-in contributor country overrides before map generation."""
import json
import re
from pathlib import Path

VALID_CODES = frozenset("""
AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ
CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR
GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO
JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR
MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO
RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV
TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW
""".split())

def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"Duplicate contributor entry: {key}")
        result[key] = value
    return result

def main():
    path = Path("contributors-locations.json")
    try:
        data = json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=unique_object)
    except (json.JSONDecodeError, ValueError) as error:
        raise SystemExit(f"Invalid contributor location JSON: {error}") from error
    if not isinstance(data, dict):
        raise SystemExit("Contributor locations must be a JSON object.")
    errors = []
    for login, code in data.items():
        if not isinstance(login, str) or not re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?", login):
            errors.append(f"Invalid GitHub login: {login!r}")
        if not isinstance(code, str) or code != code.upper() or code not in VALID_CODES:
            errors.append(f"Invalid ISO 3166-1 alpha-2 country code for {login!r}: {code!r}")
    if errors:
        raise SystemExit("\n".join(errors))
    print(f"Validated {len(data)} contributor country override(s).")

if __name__ == "__main__":
    main()
