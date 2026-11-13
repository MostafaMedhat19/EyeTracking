# Contributing to Eye Voice

Thank you for helping make assistive communication more accessible. Contributions of code, accessibility testing, documentation, translations, design feedback, and lived-experience feedback are welcome.

## Before you start

1. Read the [Code of Conduct](CODE_OF_CONDUCT.md).
2. Search existing issues before opening a new one.
3. For a substantial feature or architectural change, open a discussion issue before implementation.
4. Look for issues labelled `good first issue` or `help wanted` if you are new to the project.

## Development setup

Eye Voice has no build step. It is a static HTML/CSS/JavaScript application.

```bash
git clone https://github.com/MostafaMedhat19/EyeTracking.git
cd EyeTracking
python -m http.server 4173
```

Open `http://localhost:4173` in Chrome or Edge and grant camera access.

## Contribution workflow

1. Fork the repository.
2. Create a focused branch: `git checkout -b feature/short-description`.
3. Make one logical change at a time.
4. Test with keyboard input and, when relevant, webcam gaze control.
5. Run the syntax and local-reference checks used by GitHub Actions.
6. Commit with a clear message.
7. Push your branch and open a pull request using the template.

## Accessibility checklist

- All interactions must remain keyboard accessible.
- New controls need meaningful accessible names.
- Status changes should be announced through appropriate live regions.
- Do not rely on color alone to communicate state.
- Respect `prefers-reduced-motion`.
- Maintain large targets and readable contrast.
- Test without enabling the optional Gemini integration.

## Pull request expectations

- Explain the user problem and the proposed solution.
- Keep framework dependencies out unless discussed and approved first.
- Add or update documentation for visible behavior changes.
- Include screenshots or a short recording for UI changes.
- Never commit API keys, camera recordings, personal medical information, or user transcripts.

## Decision making and attribution

The project follows the process described in [GOVERNANCE.md](GOVERNANCE.md). Mostafa Medhat is the founder and lead maintainer. Contributors retain copyright in their contributions while licensing them to the project under the repository's MIT License.
