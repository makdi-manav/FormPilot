# FormPilot: Google Forms Auto-Filler & AI Testing Engine (v1.2.0)

A high-performance Chrome Extension (Manifest V3) that automates filling and submitting Google Forms for testing. Supports **Random Dummy Data**, **Fixed Answer Rules**, and **Gemini AI Vision Answering Mode** with automatic multimodal stimulus analysis, persona generation, diverse writing styles, and dynamic model selection across **1 to 50+ multi-page forms**.

---

## 🌟 What's New in v1.2.0: Multimodal Vision, Model Selector & Humanized Styles

- **👁️ Multimodal Vision (Stimulus-Aware Answering)**:
  - FormPilot now inspects every section and extracts all visible stimulus images (product renderings, coaster designs, diagrams, and question-embedded photos).
  - Fetches images directly in the background worker, encodes them into high-fidelity `inline_data` Base64 payloads, and passes them to Gemini prior to question text.
  - Instructs the model to inspect actual physical attributes (shape, color, material, texture, pattern, setting, text).
  - Makes one targeted Gemini call per section/stimulus so each question group has its own visual context.
  - Graceful fallback: If an image cannot be downloaded, answers from text and surfaces a non-blocking warning: *"Couldn't load image for section X"*.
- **🎛️ Dynamic Model Selector & Temperature Slider (Options Page)**:
  - Replaces hardcoded text with a dynamic model dropdown and a **"🔄 Refresh Models"** button.
  - Calls Gemini's `GET /models` endpoint, filters models supporting `generateContent`, strips `models/` prefix, and ranks newest Pro and Flash models at the top.
  - Automatic fallback with alert if a previously chosen model becomes unavailable.
  - Added an interactive **Temperature Slider** (0.7 to 1.2, default 1.0) with live value indicator.
- **🎭 Realistic Respondent Personas & 4 Diverse Writing Styles**:
  - Synthesizes detailed demographic profiles per submission (age 18–60, gender, Indian city, occupation, education, income bracket, tech comfort).
  - Dynamically assigns 1 of 4 humanized writing styles per respondent:
    1. **Terse** (~35%): 3 to 8 words only, direct, concise, no filler.
    2. **Casual** (~30%): mostly lowercase, conversational tone, informal phrasing, natural minor typos/slang.
    3. **Average** (~25%): one plain, everyday sentence.
    4. **Detailed** (~10%): 2 to 3 sentences with concrete real-world details.
  - For optional questions (`required: false`), skips answering about 20% of the time to replicate real participant behavior.
  - **Cross-Section Taste Consistency**: Maintains respondent memory across sections so feedback on Coaster S01 and Coaster S02 feels consistent with that person's personality.
  - **Duplicate Detection & Auto-Rewrite**: Tracks open-ended text answers across the entire run. If Gemini repeats a phrase verbatim, FormPilot automatically requests a single distinct rewrite.
- **🎯 Fixed Answers Still Override Everything**:
  - Specific keyword rules (e.g. `resident -> Yes`) strictly take priority over any AI or random answer.

---

## 🔑 Getting Started with Gemini AI Mode

### 1. Get a Free Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account.
3. Click **"Create API key"** and copy your key.

> [!NOTE]
> **Free Tier Privacy Disclosure**: Under Google AI Studio's free tier, prompts and responses may be processed and reviewed by human reviewers to train and improve Google products. **Never submit real, confidential, proprietary, or personally identifiable data (PII).**

> [!WARNING]
> **Ethical & Authorized Testing Only**: Use FormPilot and AI mode **ONLY on your own forms** or forms where you have explicit authorization to conduct testing. Never use automated tools to spam or submit unauthorized responses.

### 2. Configure Settings in Extension
1. Click the **FormPilot** extension icon in your Chrome toolbar.
2. Click the **⚙️ Settings** button at the top of the popup (or right-click the extension icon and select **Options**).
3. Paste your Gemini API key.
4. Select your preferred model from the dropdown (e.g. `gemini-2.5-flash` or `gemini-2.5-pro`), or click **"🔄 Refresh Models"** to pull the latest models directly from Google.
5. Adjust the **Temperature** slider (default: `1.0`).
6. Click **"Test Key"** to verify connection, then click **"Save Settings"**.

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

## 🚀 How to Run & Verify Vision: Step-by-Step Testing Walkthrough

### Phase 1: Test with 2 Responses First & Verify Image Answers
Before running large batches, verify that vision and persona styles reflect the images on screen:

1. Open your target Google Form:
   ```text
   https://docs.google.com/forms/d/e/.../viewform
   ```
2. Open Chrome DevTools Console: Press <kbd>F12</kbd> (or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>I</kbd>) and click the **Console** tab.
3. Open the FormPilot popup:
   - Toggle **"Use AI answers (Gemini)"** to **ON**.
   - *(Optional)* Add a Persona hint (e.g. `college students in Pune`).
   - Set **"How many responses"** to `2`.
   - Ensure **Delay** is `4` seconds.
4. Click **▶ Start Filling**.
5. Observe the live execution:
   - FormPilot extracts the visible coaster image and passes it to Gemini.
   - Look at the console logs:
     ```text
     [FormPilot Service Worker] Processing Section "S01" for Response #1. Style: terse. Images found: 1
     [FormPilot] Received Gemini AI vision answers for Page 2 (S01): { ... }
     ```
   - Compare the selected options / written feedback with the image shown on screen (e.g., notice it recognizes whether the coaster is geometric or organic, honeycomb or solid, blue or brown).
   - Response 2 will automatically receive a completely different persona (e.g. Style: *casual* or *detailed*) and generate fresh, non-repetitive descriptions.

### Phase 2: Batch Submit 10 Responses
Once the 2-response run succeeds:
1. Re-open the extension popup.
2. Set **"How many responses"** to `10`.
3. Click **▶ Start Filling**.
4. FormPilot will handle all 10 submissions autonomously. If Gemini returns an HTTP 429 rate limit, FormPilot pauses for 20 seconds and retries up to 3 times automatically.

---

## 📋 Supported Question Types in AI Vision Mode

| Question Type | Detection Strategy | AI Vision Mode Handling | Fallback Behavior |
| :--- | :--- | :--- | :--- |
| **Multiple Choice** | `div[role="radio"]` | Matches option verbatim from Gemini response | Picks random standard option |
| **Checkboxes** | `div[role="checkbox"]` | Checks all options returned in the AI array | Checks 1–3 random options |
| **Dropdown** | `div[role="listbox"]`, `<select>` | Matches option text case-insensitively | Selects random valid option |
| **Linear Scale** | `role="radiogroup"` (1–5 / 1–10) | Matches numeric score from Gemini | Selects middle or random rating |
| **Multiple Choice Grid** | Matrix rows with radios | Generates individual row answer for each sub-question | Selects random option per row |
| **Checkbox Grid** | Matrix rows with checkboxes | Generates row-specific checkbox selection | Selects random checkbox per row |
| **Short Answer** | `input[type="text"]`, etc. | Natural short answer grounded in image details & persona style | Indian persona generator |
| **Paragraph** | `textarea` | Cohesive opinion / feedback matching persona & observed image traits | Synthetic feedback sentence |
| **Date** | `input[type="date"]`, split inputs | Valid ISO date string formatted for form | Valid random date (1980–2025) |
| **Time** | `input[type="time"]`, split inputs | Valid HH:MM time string | Valid random time |

### ⚠️ Question Types AI Mode Cannot Handle
- **File Upload (`input[type="file"]`)**:
  - Browser extensions cannot interact with native operating system file picker dialogs without user interaction due to Chromium security sandboxing.
  - File upload questions are safely **skipped and logged in the console**.

---

## 🛡️ Security & Privacy Architecture

- **No Remote Code Execution**: All extension code is packaged locally (Manifest V3).
- **Strict Host Permissions**: Host permissions are limited solely to `https://docs.google.com/*`, `https://generativelanguage.googleapis.com/*`, `https://*.googleusercontent.com/*`, and `https://*.googleapis.com/*`.
- **Zero Third-Party Telemetry**: No analytics, tracking pixels, or external dependencies.
- **Local Key Storage**: API keys are saved exclusively in your browser's encrypted `chrome.storage.local` and never transmitted anywhere except Google's official Gemini endpoint.
