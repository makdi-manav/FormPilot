# FormPilot: Google Forms Auto-Filler (Chrome Extension Manifest V3)

A high-performance Chrome Extension (Manifest V3) that automates filling and submitting Google Forms for testing. Supports **Random Dummy Data**, **Fixed Answer Rules**, and **Gemini AI Answering Mode** with automatic persona generation across **1 to 50+ multi-page forms**.

---

## 🌟 What's New in v1.1.0: Gemini AI Answering Mode

- **🤖 Google Gemini AI Answering**:
  - Automatically reads Google Form questions and prompts the Gemini API (`gemini-2.5-flash` or custom model) to answer questions realistically.
  - Sends all questions of a page in a single unified API request to minimize latency and conserve rate limits.
  - Generates realistic, coherent respondent personas (age 18–60, Indian city, occupation, gender, education) cached consistently across multi-page sections.
  - Validates all AI answers against available form options; falls back safely to random answers if an AI option is unrecognized.
  - **Fixed answer rules always override AI answers**.
- **⚙️ Dedicated Options / Settings Page**:
  - Securely stores your Gemini API key and model selection in `chrome.storage.local`.
  - Built-in "Test key" button to verify your API credentials before starting.
  - Password-masked input; keys are never logged, displayed, or committed.
- **🎭 Customizable Persona Hints**:
  - Add optional persona guidance directly in the popup (e.g. *"college students in Pune"*, *"software engineers aged 25-35"*, *"ev vehicle owners"*).
- **⏱️ Rate Limit Protection**:
  - Automatic 4-second delay between submissions when AI mode is active.
  - Exponential backoff with 20-second pause and up to 3 automatic retries if an HTTP 429 rate limit is encountered.

---

## 🔑 Getting Started with Gemini AI Mode

### 1. Get a Free Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account.
3. Click **"Create API key"** and copy your key.

> [!NOTE]
> **Free Tier Privacy Disclosure**: Under Google AI Studio's free tier, prompts and responses may be processed and reviewed by human reviewers to train and improve Google products. **Never submit real, confidential, proprietary, or personally identifiable data (PII).**

> [!WARNING]
> **Ethical & Authorized Testing Only**: Use FormPilot and AI mode **ONLY on your own forms** or forms where you have explicit permission to conduct testing. Never use automated tools to spam or submit unauthorized responses.

### 2. Configure Your Key in Settings
1. Click the **FormPilot** extension icon in your Chrome toolbar.
2. Click the **⚙️ Settings** button at the top of the popup (or right-click the extension icon and select **Options**).
3. Paste your Gemini API key into the **Gemini API Key** field.
4. Leave the model name as `gemini-2.5-flash` (or specify another model such as `gemini-1.5-flash`).
5. Click **"Test Key"** to verify that your key is active and working.
6. Click **"Save Settings"**.

---

## 📦 Installation via Chrome Extensions

1. Open Google Chrome and navigate to:
   ```text
   chrome://extensions
   ```
2. Toggle **Developer mode** on in the top-right corner.
3. Click **Load unpacked** in the top-left toolbar.
4. Select the folder:
   ```text
   /path/to/FormPilot/form-filler-extension
   ```
5. *(If updating after code edits)* Click the **reload (↻)** icon on the extension card in `chrome://extensions`.

---

## 🚀 How to Run: Step-by-Step Testing Walkthrough

### Phase 1: Test with 2 Responses First
Before running large batches, verify that the form structure, AI answers, and transitions work cleanly:

1. Open your target Google Form:
   ```text
   https://docs.google.com/forms/d/e/.../viewform
   ```
2. Open Chrome DevTools Console: Press <kbd>F12</kbd> (or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>I</kbd>) and click the **Console** tab.
3. Open the FormPilot extension popup:
   - Toggle **"Use AI answers (Gemini)"** to **ON**.
   - *(Optional)* Enter a **Persona hint** (e.g. *"college students in Pune"*).
   - Set **"How many responses"** to `2`.
   - Ensure **Delay** is set to `4` seconds (default for AI mode).
4. Click **▶ Start Filling**.
5. Observe the console logs:
   - You will see `[FormPilot] Generating AI answers for Page 1 via Gemini...`
   - FormPilot populates each field, clicks **Next**, progresses through all pages, and clicks **Submit**.
   - On the confirmation page, it waits 4 seconds and automatically loads a fresh form for Response 2.
   - When finished, the popup displays `Finished (2 / 2)`.

### Phase 2: Batch Submit 10 Responses
Once the 2-response run succeeds:
1. Re-open the extension popup.
2. Set **"How many responses"** to `10`.
3. Click **▶ Start Filling**.
4. The extension will automatically generate 10 unique personas, submit all 10 responses, and pause gracefully if rate limits are hit.

---

## 📋 Supported Question Types in AI Mode

| Question Type | Detection Strategy | AI Mode Handling | Fallback Behavior |
| :--- | :--- | :--- | :--- |
| **Multiple Choice** | `div[role="radio"]` | Matches one option verbatim from Gemini response | Picks random standard option |
| **Checkboxes** | `div[role="checkbox"]` | Checks all options returned in the AI array | Checks 1–3 random options |
| **Dropdown** | `div[role="listbox"]`, `<select>` | Matches option text case-insensitively | Selects random valid option |
| **Linear Scale** | `role="radiogroup"` (1–5 / 1–10) | Matches numeric score from Gemini | Selects middle or random rating |
| **Multiple Choice Grid** | Matrix rows with radios | Generates individual row answer for each sub-question | Selects random option per row |
| **Checkbox Grid** | Matrix rows with checkboxes | Generates row-specific checkbox selection | Selects random checkbox per row |
| **Short Answer** | `input[type="text"]`, etc. | Natural short answer generated by Gemini | Indian persona generator |
| **Paragraph** | `textarea` | Cohesive opinion / feedback matching persona | Synthetic feedback sentence |
| **Date** | `input[type="date"]`, split inputs | Valid ISO date string formatted for form | Valid random date (1980–2025) |
| **Time** | `input[type="time"]`, split inputs | Valid HH:MM time string | Valid random time |

### ⚠️ Question Types AI Mode Cannot Handle
- **File Upload (`input[type="file"]`)**:
  - Browser extensions cannot interact with native operating system file picker dialogs without user interaction due to Chromium security sandboxing.
  - File upload questions are safely **skipped and logged in the console**.

---

## 🛑 Fixed Answers vs. AI Mode

You can combine Fixed Answers with AI Mode! **Fixed Answers ALWAYS take precedence over AI answers.**

For example:
- If your form requires all respondents to answer **"Yes"** to *"Are you a resident of India?"*, add the fixed rule:
  ```text
  resident -> Yes
  ```
- Gemini might generate varied opinions for open-ended questions, but any question containing `resident` will strictly be answered with `Yes`.

---

## 🛡️ Security & Privacy Architecture

- **No Remote Code Execution**: All extension code is packaged locally (Manifest V3).
- **Strict Host Permissions**: Host permissions are limited solely to `https://docs.google.com/forms/*` and `https://generativelanguage.googleapis.com/*`.
- **Zero Third-Party Telemetry**: No analytics, tracking pixels, or external dependencies.
- **Local Key Storage**: API keys are saved exclusively in your browser's encrypted `chrome.storage.local` and never transmitted anywhere except Google's official Gemini endpoint.
