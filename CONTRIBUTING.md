# Contributing to Google Forms Auto-Filler

Thank you for your interest in contributing to Google Forms Auto-Filler! This document provides guidelines for contributing to this project.

---

## Code of Conduct

Please maintain a welcoming, respectful, and collaborative environment when communicating in issues, discussions, and pull requests.

---

## How to Contribute

### Reporting Bugs
- Check the [Issues](../../issues) tab first to see if the issue has already been reported.
- If not, open a new issue using the **Bug Report** template.
- Please include your Google Forms structure (number of pages, question types) and browser console logs.

### Requesting Features
- Open a new issue using the **Feature Request** template.
- Describe the use case, desired behavior, and sample form structure if applicable.

### Submitting Pull Requests
1. Fork the repository.
2. Create a new topic branch:
   ```bash
   git checkout -b feature/my-new-feature
   ```
3. Make your changes in `form-filler-extension/`.
4. Verify JavaScript syntax:
   ```bash
   node -c form-filler-extension/background.js
   node -c form-filler-extension/popup.js
   node -c form-filler-extension/content.js
   ```
5. Test the extension live on Google Forms with both single-page and multi-page forms.
6. Commit your changes with clear, descriptive commit messages.
7. Push to your branch and submit a Pull Request to `main`.

---

## Architectural Principles

- **Zero External Dependencies**: The extension relies solely on native browser APIs (`chrome.storage.local`, `chrome.runtime`, `DOM MutationObserver`, standard Web APIs). Do not add third-party libraries or network tracking scripts.
- **Privacy First**: The extension operates 100% locally on `docs.google.com/forms/*`. It never sends telemetry, analytics, or user responses to external servers.
- **Resilience**: Google Forms dynamically updates its DOM and class names. Prefer semantic attributes (`role`, `aria-label`, `aria-checked`, `aria-valuenow`, tag names) over ephemeral obfuscated class names.
- **Unstoppable Execution**: Errors, delays, or network lag during form transitions must be gracefully retried through the self-healing watchdog loop rather than aborting.
