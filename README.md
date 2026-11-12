<div align="center">

# 📋 FormPilot: Google Forms Auto-Filler & AI Testing Engine

**A high-performance Chrome Extension (Manifest V3) to automate filling and submitting Google Forms with Gemini Multimodal Vision AI, realistic respondent personas with varied writing styles, or custom fixed rules across 1 to 50+ pages.**

[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-blue?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Gemini Vision AI](https://img.shields.io/badge/Gemini%20API-Multimodal%20Vision-8E24AA?logo=google&logoColor=white)](https://aistudio.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Multi-Page Supported](https://img.shields.io/badge/Multi--Page-1%20to%2050%2B%20Pages-success)](#multi-page-form-navigation)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0%20(Pure%20Vanilla%20JS)-brightgreen)](#security--privacy)
[![Privacy First](https://img.shields.io/badge/Privacy-100%25%20Client--Side-purple)](#security--privacy)

[Key Features](#key-features) • [Gemini Vision AI Mode](#-gemini-vision-ai-mode) • [Installation](#installation) • [How to Use & Test](#-how-to-use--test) • [Fixed Answers & Bulk Rules](#fixed-answers--bulk-rules) • [Architecture](#architecture--technical-deep-dive) • [Troubleshooting](#troubleshooting)

</div>

---

## 🌟 Overview

Testing complex Google Forms—especially academic research surveys, product evaluations, and multi-page questionnaires spanning 40+ sections—is tedious when done manually.

**FormPilot** is built specifically for form creators, researchers, QA engineers, and developers who need to stress-test their forms across dozens of pages and generate realistic survey responses with a single click.

Choose between two powerful execution modes:
1. **🤖 Gemini Vision AI Mode**: Inspects product images and diagrams on the form, passes them to Google Gemini as multimodal Base64 inputs, and answers with visually grounded, human-like responses across 4 varied writing styles.
2. **🎲 Random Dummy Mode**: Operates 100% locally with high-variety Indian personas, addresses, ratings, and contextual sentences with zero API calls.

---

## ✨ Key Features

- **👁️ Multimodal Vision Support**:
  - Automatically identifies stimulus images (product designs, diagrams, and question-embedded photos) on each section.
  - Converts images into base64 payloads and sends them to Gemini alongside question text so the AI answers what it actually sees (colors, shapes, materials, textures, patterns).
  - Makes one targeted Gemini call per section/stimulus to maintain clean visual context.
- **🎛️ Dynamic Model Selector & Temperature Slider**:
  - Automatically fetches live available models from Google AI Studio (`GET /models`), keeping models that support `generateContent` and ranking newest Pro and Flash models at the top.
  - Interactive **Temperature Slider** (0.7 to 1.2, default 1.0) with real-time value display.
  - Graceful model fallback with warning banner if a saved model disappears from Google's catalog.
- **🎭 4 Diverse Writing Styles & Anti-Duplicate Engine**:
  - Synthesizes realistic Indian demographics (age, city, occupation, education, income, tech comfort).
  - Assigns respondents to distinct writing styles:
    - **Terse** (~35%): 3–8 words only, direct, concise.
    - **Casual** (~30%): lowercase, conversational, informal phrasing, minor typos.
    - **Average** (~25%): one plain, everyday sentence.
    - **Detailed** (~10%): 2–3 sentences with concrete observations.
  - Skips optional questions about 20% of the time to match real participant behavior.
  - **Cross-Section Memory**: Remembers earlier answers within the same submission to maintain taste and opinion consistency across sections.
  - **Run-Wide Deduplication**: Detects identical open-ended answers across respondents and prompts Gemini for a unique rewrite.
- **🚀 1 to 50+ Multi-Page Navigation**:
  - Navigates through multi-section forms by advancing through **"Next"** buttons, validating required questions on each page, and submitting on the final page.
- **📊 Full Checkbox & Multiple-Choice Grid Support**:
  - Detects and answers every single row in matrix questions (including Semantic Differential grids, 1–5 scales, and multi-row rating tables) without leaving rows empty.
- **🎯 Fixed Answers Override**:
  - Map specific question keywords to exact answers (e.g., `resident` $\to$ `Yes`, `rating` $\to$ `5`). Fixed answers **always strictly override** AI and random answers.
- **🔄 Batch Submissions with Auto-Loop**:
  - Specify how many responses to submit (e.g. 10 responses). The extension automatically submits, waits a rate-limit safe delay (default 4s for AI), re-navigates to a fresh form, and begins the next response.
- **🛡️ Unstoppable Self-Healing Watchdog**:
  - A 2-second background watchdog actively monitors form progress. If network lag or Google Forms validation pauses the page, it self-heals missing fields and continues automatically.

---

## 🤖 Gemini Vision AI Mode

### 1. Obtain a Free Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account.
3. Click **"Create API key"** and copy the generated key.

> [!NOTE]
> **Free Tier Privacy Disclosure**: Under Google AI Studio's free tier, prompts and responses may be processed and reviewed by human reviewers to train and improve Google products. **Never submit real, confidential, proprietary, or personally identifiable data (PII).**

> [!WARNING]
> **Ethical & Authorized Testing Only**: Use FormPilot and AI mode **ONLY on your own forms** or forms where you have explicit authorization to conduct testing. Never use automated tools to spam or submit unauthorized responses.

### 2. Configure Settings in Extension
1. Click the **FormPilot** extension icon in your Chrome toolbar.
2. Click the **⚙️ Settings** button at the top of the popup (or right-click the extension icon and select **Options**).
3. Paste your Gemini API key.
4. Select your desired model from the dropdown or click **"🔄 Refresh Models"** to sync latest models directly from Google.
5. Set your desired **Temperature** (default: `1.0`).
6. Click **"Test Key"** to verify that your key is valid and connected.
7. Click **"Save Settings"**.

---

## 🏗️ Architecture & Workflow

```mermaid
flowchart TD
    A[Start Button in Popup] --> B[Store State in chrome.storage.local]
    B --> C[Send START to content.js]
    C --> D{Is Confirmation Page?}
    D -- Yes --> E[Auto-Navigate to Fresh Form]
    D -- No --> F[Get Visible Questions & Images on Active Page]
    F --> G{Is AI Mode Active?}
    G -- Yes --> H[Fetch Images & Encode Base64 in background.js]
    H --> I[Send Multimodal inline_data + Questions to Gemini API]
    G -- No --> J[Generate Local Realistic Dummy Data]
    I --> K[Apply Fixed Answer Overrides & Validate Options]
    J --> K
    K --> L[Pre-Flight Row Verification: Ensure Every Grid Row Checked]
    L --> M{Navigation Button?}
    M -- "Next" Button --> N[Click Next & Await Page Transition]
    N --> F
    M -- "Submit" Button --> O[Click Submit on Final Page]
    O --> P[Confirmation Page Reached]
    P --> Q{done < total ?}
    Q -- Yes --> R[Wait Configured Delay e.g. 4s for AI]
    R --> E
    Q -- No --> S[Set Finished & Stop]
```

---

## 📦 Installation

This extension is loaded as an unpacked developer extension in Google Chrome, Brave, Microsoft Edge, or any Chromium-based browser:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/makdi-manav/FormPilot.git
   cd FormPilot
   ```

2. **Open Extensions in Chrome**:
   Navigate to:
   ```text
   chrome://extensions
   ```

3. **Enable Developer Mode**:
   Toggle the **Developer mode** switch in the top-right corner.

4. **Load Unpacked**:
   - Click the **Load unpacked** button in the top-left toolbar.
   - Select the `form-filler-extension` folder inside this repository:
     ```text
     /path/to/FormPilot/form-filler-extension
     ```

5. *(When updating code)* Click the **reload (↻)** icon on the FormPilot card in `chrome://extensions`.

---

## 🧪 How to Use & Test

### Phase 1: Test with 2 Responses First (Visual Verification)
Before starting a large batch, run a 2-response test to verify that the model sees the images and changes writing styles:

1. Open your target Google Form:
   ```text
   https://docs.google.com/forms/d/e/.../viewform
   ```
2. Open Chrome DevTools Console: Press <kbd>F12</kbd> (or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>I</kbd>) and click **Console**.
3. Open the **FormPilot** popup:
   - Toggle **"Use AI answers (Gemini)"** to **ON**.
   - *(Optional)* Add a **Persona hint** (e.g. *"college students in Pune"*).
   - Set **"How many responses"** to `2`.
   - Set **Delay** to `4` seconds (helps avoid API rate limits).
4. Click **▶ Start Filling**.
5. Observe the live execution:
   - FormPilot extracts section images, passes them to Gemini as Base64 inline data, populates all fields according to visual traits, and clicks **Next**.
   - Check the DevTools console: observe the respondent style (*terse*, *casual*, *average*, or *detailed*) and notice how the answers directly describe the image on screen.
   - Once the final page is submitted, it waits 4s, refreshes to a fresh form, and submits Response 2 with a completely different respondent profile and writing style.
   - Popup displays `Finished (2 / 2)`.

### Phase 2: Batch Submit 10 Responses
Once the 2-response test passes:
1. Open the popup.
2. Set **"How many responses"** to `10`.
3. Click **▶ Start Filling**.
4. FormPilot will handle all 10 submissions autonomously. If Gemini returns an HTTP 429 rate limit, FormPilot pauses for 20 seconds and retries up to 3 times automatically.

---

## 📋 Supported Question Types

| Question Type | Selector / Detection | AI Vision Mode Behavior | Fallback / Random Mode |
| :--- | :--- | :--- | :--- |
| **Short Answer** | `input[type="text"]`, `email`, `tel`, `number` | Natural short text grounded in visual details & writing style | Indian persona generator (Name, City, etc.) |
| **Paragraph** | `textarea` | Cohesive opinion / feedback matching persona & observed visual traits | Contextual dummy feedback sentences |
| **Multiple Choice** | `div[role="radio"]` | Matches option verbatim from Gemini | Random standard option |
| **Checkboxes** | `div[role="checkbox"]` | Checks multiple options returned in AI array | Random 1–3 checkboxes |
| **Dropdown** | `div[role="listbox"]`, native `<select>` | Matches option text case-insensitively | Random valid option |
| **Linear Scale** | `role="radiogroup"` (1–5 or 1–10) | Matches numeric score from Gemini | Random rating |
| **Multiple-Choice Grid** | Table rows with `role="radio"` | Solves each row as individual sub-question based on visual stimulus | Random option in every row |
| **Checkbox Grid** | Table rows with `role="checkbox"` | Solves each row with checkbox selections based on visual stimulus | Random checkbox in every row |
| **Date & Time** | `input[type="date"]`, `time`, split text fields | Valid ISO date and HH:MM time strings | Random valid date (1980–2025) and time |
| **File Upload** | `input[type="file"]`, upload cards | **Skipped & logged** (browser sandbox security) | **Skipped & logged** |

---

## 🎯 Fixed Answers & Bulk Rules

Fixed answers allow you to pin specific responses regardless of whether AI Mode or Random Mode is active.

### Example Rules
```text
resident -> Yes
age -> 24
department -> Research and Development
overall satisfaction -> Very Satisfied
```

### Methods to Configure:
1. **Popup Table**: Add and edit keyword $\to$ answer rows directly in the popup.
2. **📋 Bulk Edit**: Paste dozens of rules at once in `keyword : answer` format.
3. **🔍 Scan Page**: Automatically extracts question titles from the active tab and populates them into the table.

---

## 🛠️ Project Structure

```text
FormPilot/
├── .github/
│   ├── workflows/
│   │   └── ci.yml               # GitHub Actions CI for manifest & syntax validation
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md        # Standardized bug reporting template
│       └── feature_request.md   # Standardized feature request template
├── form-filler-extension/       # Chrome Extension Root (Load this folder in Chrome)
│   ├── icons/
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   ├── background.js            # Multimodal vision processor, Gemini API, rate-limiting & styles
│   ├── content.js               # Stimulus image extractor, form filler, DOM observer & navigation
│   ├── manifest.json            # Manifest V3 specification, permissions & options page
│   ├── options.html             # Credentials settings, dynamic model dropdown & temp slider
│   ├── options.css              # Options page styling
│   ├── options.js               # Dynamic model fetching, testing, and secure local storage
│   ├── popup.css                # Modern popup stylesheet
│   ├── popup.html               # Popup UI markup (AI toggle, persona hint, bulk editor)
│   ├── popup.js                 # Popup state management, warning alerts and message dispatcher
│   └── README.md                # Extension-specific quick reference & guide
├── .gitignore                   # Comprehensive gitignore (.env, *.key, OS files)
├── CONTRIBUTING.md              # Guidelines for open-source contributors
├── LICENSE                      # MIT Open Source License
└── README.md                    # Main repository documentation
```

---

## ❓ Troubleshooting

### 1. "Couldn't load image for section X"
- **Cause**: An image in that section failed to load or exceeded 4 MB.
- **Fix**: FormPilot gracefully falls back to answering from question titles and descriptions without halting.

### 2. HTTP 429 Rate Limit Encountered
- **Cause**: Google Generative AI free-tier rate limits reached (15 RPM on free tier).
- **Fix**: The extension automatically pauses for 20 seconds and retries up to 3 times. For large batches, increase the submission delay in the popup to `5`–`8` seconds.

### 3. "Could not establish connection. Receiving end does not exist"
- **Cause**: The extension was updated or reloaded in `chrome://extensions` while the Google Form tab was still open on an older injection.
- **Fix**: Refresh the Google Form tab (<kbd>Ctrl</kbd>+<kbd>R</kbd> or <kbd>F5</kbd>) and click **Start**.

### 4. File upload questions are skipped
- **Notice**: Chromium security policies prevent browser extensions from programmatically uploading arbitrary local files to native OS file picker dialogs. File upload questions are intentionally skipped and logged.

---

## 🛡️ Security & Privacy

- **No Remote Code Execution**: All extension code is packaged locally (Manifest V3).
- **Strict Host Permissions**: Host permissions are limited strictly to `https://docs.google.com/*`, `https://generativelanguage.googleapis.com/*`, `https://*.googleusercontent.com/*`, and `https://*.googleapis.com/*`.
- **Zero Third-Party Telemetry**: No analytics, tracking pixels, or external dependencies.
- **Local Key Storage**: API keys are saved exclusively in your browser's encrypted `chrome.storage.local` and never transmitted anywhere except Google's official Gemini endpoint.

---

## 📄 License

This project is open-source software licensed under the [MIT License](LICENSE).  
Copyright © 2026 makdi-manav.
