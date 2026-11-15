# Pull request review guide

Thank you for contributing to Eye Voice. The project is an assistive communication prototype, so predictable and accessible behavior matters.

## Before requesting review

- Keep the change focused and complete the pull request template.
- Run the repository's GitHub Actions checks.
- Test keyboard-only navigation in Chrome or Edge.
- For UI changes, provide before/after screenshots and check focus visibility, text scaling, and reduced motion.
- For changes affecting gaze controls, test webcam calibration and selection behavior when possible.
- Do not include API keys, recordings, medical information, or private transcripts.

## Automated checks

- **Quality checks** validate JavaScript syntax and local HTML references.
- **PR readiness** checks the pull request description and provides a size summary.
- Passing checks **does not mean a change is approved** or that accessibility was fully tested.

## Maintainer decisions

- **Ready:** checks pass, behavior is verified, and the change is focused. Merge after review.
- **Needs work:** request specific changes, then re-review.
- **Out of scope:** explain briefly and close the pull request.

Maintainers may ask for extra testing for accessibility, camera, or privacy-sensitive changes. Do not merge a failing PR without understanding the failure.
