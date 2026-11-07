# Google Forms Auto-Filler (Chrome Extension Manifest V3)

A powerful, lightweight Chrome Extension (Manifest V3) to automate filling and submitting your own Google Forms for testing, including **multi-page forms (1 to 50+ pages)**, multiple choice grids, and custom fixed answer mappings.

---

## What's New in this Update

- **43+ Multi-Page Form Automation**: Automatically navigates through multi-section Google Forms by clicking **"Next"**, validating required questions on each page, and continuing until the final **"Submit"** button is reached.
- **Support for Both Random & Non-Random (Specific) Answers**:
  - **Non-random / Specific Answers**: Define exact answers per question using the **Fixed Answers Editor** or the new **📋 Bulk Edit** tool.
  - **🔍 Scan Page Questions**: Scan all question titles from the active form directly into your rules list with one click.
  - **Strict Mode Toggle**: Turn off random fallback to only fill questions that have configured rules.
  - **Multiple Choice & Checkbox Grids**: Automatically fills every row in matrix/grid questions.
- **Massive Random Data Variety**: If using random dummy data, questions receive varied sentences, diverse demographics, realistic ratings, and distinct option choices.

---

## Installation via Chrome Extensions

1. Open Google Chrome and navigate to:
   ```text
   chrome://extensions
   ```
2. Enable **Developer mode** using the toggle in the top-right corner.
3. Click the **Load unpacked** button in the top-left toolbar.
4. Select the folder:
   ```text
   /path/to/FormPilot/form-filler-extension
   ```
5. *(If updating after code changes)* Click the **reload (↻)** icon on the extension card in `chrome://extensions`.

---

## How It Handles 43-Page Multi-Page Forms

In Google Forms, multi-page questionnaires are divided into sections. Pages 1 through 42 contain a **"Next"** button, and only the final page (Page 43) contains the **"Submit"** button.

1. **Section Isolation**: Only visible questions on the active page are processed; hidden questions from upcoming sections are ignored until their page opens.
2. **Automated "Next" Progression**:
   - The script fills all questions on Page 1.
   - Detects and clicks **"Next"**.
   - If required fields were missed, it catches the validation alert, fills them, and clicks **"Next"** again.
   - Waits for the DOM to transition to Page 2.
   - Repeats automatically through Page 43.
3. **Final Submission**:
   - On the final page, it finds and clicks **"Submit"**.
   - On the confirmation page (`/formResponse`), it increments your submission count, waits your configured delay, clicks **"Submit another response"**, and repeats if more responses were requested.

---

## Setting Up Non-Random (Specific) Answers for 43 Pages

If your form has specific required answers rather than random dummy data, you have three quick ways to set them:

### Method 1: Use 📋 Bulk Edit (Recommended for 43 Pages)
1. Click the **Forms Auto-Filler** icon in your toolbar.
2. Click the **📋 Bulk Edit** button.
3. Paste all your question keywords and answers in one go (one rule per line):
   ```text
   resident : Yes
   department : Quality Assurance
   gender : Female
   overall rating : 5
   satisfaction : Highly Satisfied
   comments : Everything tested and validated successfully.
   ```
4. Click **Apply Bulk Rules**. All rules are saved immediately!

### Method 2: Use 🔍 Scan Page
1. Open your Google Form in the active Chrome tab.
2. Click the extension popup and click **🔍 Scan Page**.
3. The extension reads all visible question titles on that page and creates rule rows for them so you only need to type your desired answers.

### Method 3: Random Fallback Toggle
- At the bottom of the rules section, check or uncheck:
  `Use realistic random data if no fixed answer matches`
  - **Checked (Default)**: Questions matching your keywords get your exact answers; any other questions receive realistic random data.
  - **Unchecked (Strict)**: Only questions matching your rules are filled; unmapped questions are left untouched.

---

## Step-by-Step Walkthrough: Running a Multi-Page Test

1. **Open your multi-page form**:
   ```text
   https://docs.google.com/forms/d/e/.../viewform
   ```
2. **Open the Chrome DevTools Console**: Press <kbd>F12</kbd> (or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>I</kbd>) and select **Console**.
3. **Configure the Popup**:
   - Set **"How many responses"** to `1` (or `2` to test the loop).
   - Enter your fixed answers or keep random fallback enabled.
   - Click **▶ Start Filling**.
4. **Watch the Live Logs**:
   In DevTools Console, you will see it process each page step-by-step:
   ```text
   [FormFiller] --- Processing Page 1 ---
   [FormFiller] Page 1: Found 4 visible questions.
   [FormFiller] Question: "Full Name" | Type: Short answer | Value: "Aarav Sharma"
   [FormFiller] Page 1 complete. Advancing to next page...
   [FormFiller] --- Processing Page 2 ---
   ...
   [FormFiller] --- Processing Page 43 ---
   [FormFiller] Found Submit button on page 43. Submitting final form response...
   [FormFiller] Form submitted successfully!
   ```
5. Click **⏹ Stop** at any time to pause or halt immediately.

---

## Supported Question Types

- **Short Answer**: Text, Email, Number, Phone, URL.
- **Paragraph**: Multi-line `textarea`.
- **Multiple Choice**: Standard radio groups (`div[role="radio"]`).
- **Checkboxes**: Multi-select options (`div[role="checkbox"]`). Supports comma-separated answers for fixed rules (e.g., `Option A, Option B`).
- **Dropdown**: Google Forms listboxes (`div[role="listbox"]`) & native `<select>`.
- **Linear Scale**: Numbered scales (1–5 or 1–10).
- **Multiple Choice Grid**: Automatically selects an option in *every single row* of the grid table.
- **Checkbox Grid**: Selects checkboxes across grid rows.
- **Date & Time**: Native HTML5 inputs as well as Google Forms split Day/Month/Year and Hour/Minute text inputs.
- **File Upload**: Safely skipped and logged (cannot be automated without native OS file dialog access).
