# Safe auto-merge policy

Eye Voice uses a conservative, file-aware policy to reduce routine review work without treating automated tests as proof that a change is safe.

## Current status

The system is in **dry-run mode**. It classifies pull requests and reports whether a PR would be eligible, but it has no permission or code path to merge anything. Enabling live merging requires a separately reviewed maintainer change to the trusted default-branch workflow and repository settings.

## Low-risk candidates

A PR can become a low-risk candidate only when every changed file belongs to exactly one strict category and stays within its size limit:

- Documentation: `README.md`, `ROADMAP.md`, or Markdown under `docs/`.
- CSS: `css/style.css` or `css/accessibility.css`, with browser accessibility and screenshot regression tests passing.
- JavaScript: only `js/suggestions.js`, with deterministic unit and browser checks passing.

The classifier also rejects deletions, renames, unavailable/binary diffs, mixed categories, oversized changes, external CSS imports, hidden focus/accessibility styles, network or DOM APIs in allowlisted JavaScript, and executable HTML in documentation.

Passing classification does not authorize a merge. Immediately before any future merge, the trusted decision workflow must re-fetch and verify the exact head SHA, changed files and patches, required workflow results, draft/open state, mergeability, and unresolved review conversations.

## Always requires human review

- Gaze tracking, calibration, dwell selection, blinking/scanning, webcam, speech, privacy, Gemini/API handling, or application orchestration.
- HTML structure, authentication, permissions, dependencies, test infrastructure, build/deployment configuration, GitHub Actions, CODEOWNERS, security policy, governance, and this auto-merge policy.
- Large, mixed, binary, ambiguous, insufficiently tested, failing, or missing-check changes.

For gaze, calibration, webcam, speech, or accessibility behavior, reviewers should test with relevant browsers, keyboard-only navigation, reduced motion, and representative real devices. Mocked tests do **not** validate real webcam accuracy or suitability for every user.

## Run checks locally

```bash
npm ci
npx playwright install chromium
npm test
```

Update screenshot baselines only after intentionally reviewing both desktop and mobile output:

```bash
npm run test:browser -- --update-snapshots
```

## Workflow separation

- `Quality checks` runs untrusted PR code with read-only repository access.
- `PR readiness` classifies the PR with read-only access and writes only an Actions summary.
- `Safe auto-merge decision` runs after `PR readiness`, checks out policy from `main`, re-fetches GitHub state, and produces a dry-run decision. It never trusts contributor labels, descriptions, workflow edits, or artifacts as authorization.
- No `pull_request_target` workflow is used.

## Disable or troubleshoot

To disable decisions immediately, disable the **Safe auto-merge decision** workflow in GitHub Actions. `Quality checks` and `PR readiness` can continue protecting PRs.

When a PR is held, inspect the workflow summary. Common causes include a protected path, mixed categories, size limits, forbidden diff patterns, a changed head SHA, failed/missing workflows, merge conflicts, draft status, or unresolved review threads.

## Recover from an incorrect merge

1. Disable the decision workflow before accepting more PRs.
2. Revert the squash commit through a new pull request; do not force-push `main`.
3. Run all checks and perform relevant real-device/accessibility verification.
4. Identify the policy gap, add a regression fixture, and keep dry-run mode enabled until the fix is reviewed.

Branch protection remains the final authority. The automation must never bypass required checks, required reviews, or protected-branch rules.
