# Dry-run validation matrix

Validated on 15 November 2026. These are deterministic policy simulations; no test pull request was merged.

| Scenario | Representative change or state | Expected dry-run result | Automated result |
| --- | --- | --- | --- |
| A — Documentation | Small `README.md` correction | Eligible after required checks | Pass: eligible |
| B — CSS | Small allowlisted layout adjustment with browser regressions passing | Eligible after required checks | Pass: eligible |
| C — JavaScript | Small deterministic change limited to `js/suggestions.js` | Eligible after required checks | Pass: eligible |
| D — Sensitive JavaScript | Gaze, calibration, camera, dwell, or speech module | Human review | Pass: held |
| E — Automation/dependency | Workflow or lockfile change | Human review | Pass: held |
| F — Check/SHA failure | Missing, failed, cancelled, or stale required check | Blocked | Pass: blocked |
| G — Review conversation | At least one unresolved thread or incomplete pagination | Blocked | Pass: blocked |

Fork association, fallback PR discovery, ambiguous commit association, pagination, API errors, and source-repository mismatches are also covered by fail-closed policy tests.

Mocked tests do not prove real webcam, gaze, speech, or assistive performance. Relevant changes still require representative browser and real-device review.
