# FormPilot: Universal AI Google Forms Auto-Filler (v1.3.0)

A high-performance Chrome Extension (Manifest V3) that automates filling and submitting Google Forms for testing. Supports **Random Dummy Data**, **Fixed Answer Rules**, and **Universal AI Vision Answering** with any AI provider and model: **Google Gemini**, **OpenAI (ChatGPT)**, **Anthropic Claude**, **OpenRouter**, **Groq**, or **Custom OpenAI-Compatible / Local Ollama**.

---

## 🌟 What's New in v1.3.0: Universal AI Provider Support

- **🌐 Use ANY AI Model with Your API Key**:
  - **Google Gemini**: `gemini-3.8-flash` (latest recommended), `gemini-2.0-flash`, `gemini-1.5-flash`.
  - **OpenAI**: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `o1`, `o3-mini`.
  - **Anthropic Claude**: `claude-3-5-sonnet-20241022`, `claude-3-5-haiku-20241022`, `claude-3-opus`.
  - **OpenRouter**: Access 200+ models (Claude, Llama 3, DeepSeek, Qwen, Mistral) with a single OpenRouter key.
  - **Groq**: Ultra-fast vision and inference (`llama-3.2-11b-vision-preview`, `llama-3.2-90b-vision-preview`).
  - **Custom / Local**: DeepSeek (`https://api.deepseek.com/v1`), Ollama (`http://localhost:11434/v1`), vLLM, Together AI, LM Studio.
- **👁️ Multimodal Vision Across All Providers**:
  - Automatically extracts section stimulus images, encodes them as Base64, and passes them in the native vision schema of your chosen provider.
- **🎛️ Dynamic Model Selector & Temperature Slider**:
  - Pulls live models from your provider or allows entering any exact model identifier.
  - Interactive temperature slider (0.0 to 1.5, default 1.0).
- **🎭 Realistic Respondent Personas & 4 Diverse Writing Styles**:
  - Terse (~35%), Casual (~30%), Average (~25%), Detailed (~10%).
  - Humanized ~20% skipping of optional questions.
  - Cross-section taste consistency and anti-duplicate answer rewriting.

---

## 🔑 How to Configure Any AI Provider

1. Click the **FormPilot** extension icon in your Chrome toolbar and click **⚙️ Settings** (or right-click $\to$ **Options**).
2. Choose your **AI Service Provider**:
   - **Google Gemini**: Get a key at [Google AI Studio](https://aistudio.google.com/app/apikey).
   - **OpenAI**: Get a key at [OpenAI Platform](https://platform.openai.com/api-keys).
   - **Anthropic Claude**: Get a key at [Anthropic Console](https://console.anthropic.com/settings/keys).
   - **OpenRouter**: Get a key at [OpenRouter](https://openrouter.ai/keys).
   - **Groq**: Get a key at [Groq Console](https://console.groq.com/keys).
   - **Custom / Ollama**: Enter your Base URL (e.g. `http://localhost:11434/v1` or `https://api.deepseek.com/v1`) and your key (or `none`).
3. Select a recommended vision model or type your exact model name into the custom model input.
4. Click **"⚡ Test Connection"** to verify that your key and model are active and working.
5. Click **"💾 Save Settings"**.

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

1. Open your target Google Form tab and refresh the page (<kbd>Ctrl</kbd>+<kbd>R</kbd> or <kbd>F5</kbd>).
2. Open DevTools Console: Press <kbd>F12</kbd> (or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>I</kbd>) and click **Console**.
3. Open FormPilot popup:
   - Toggle **"Use AI answers"** **ON**.
   - Notice the badge shows your active provider (e.g. `OPENAI`, `GEMINI`, `ANTHROPIC`, `GROQ`).
   - *(Optional)* Add a Persona hint (e.g. `college students in Pune`).
   - Set **"How many responses"** to `2`.
   - Ensure **Delay** is `4` seconds.
4. Click **▶ Start Filling**.
5. Observe that FormPilot communicates with your chosen provider, inspects the images on screen, populates all fields, and advances through the form!

---

## 🛡️ Security & Privacy Architecture

- **100% Client-Side**: All API keys are saved exclusively in your browser's private encrypted `chrome.storage.local`.
- **Zero Third-Party Telemetry**: No tracking pixels, analytics, or external proxies. Requests travel directly from your browser to your chosen AI provider.
