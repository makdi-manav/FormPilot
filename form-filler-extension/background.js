// Background service worker for FormPilot (Universal AI Testing Engine)
// Supports any AI model: Google Gemini, OpenAI (ChatGPT), Anthropic Claude,
// OpenRouter, Groq, and Custom OpenAI-compatible endpoints (DeepSeek, Local Ollama, etc.).

const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad',
  'Jaipur', 'Lucknow', 'Chandigarh', 'Surat', 'Indore', 'Bhopal', 'Patna', 'Kochi',
  'Visakhapatnam', 'Coimbatore', 'Nagpur', 'Vadodara', 'Bhubaneswar', 'Dehradun', 'Mysore',
  'Guwahati', 'Ranchi', 'Varanasi', 'Thiruvananthapuram', 'Mangalore', 'Amritsar', 'Nashik', 'Jodhpur'
];

const OCCUPATIONS = [
  'Software Engineer', 'College Student', 'Graphic Designer', 'Data Analyst',
  'Chartered Accountant', 'School Teacher', 'Civil Engineer', 'Digital Marketer',
  'Doctor / General Physician', 'Small Business Owner', 'Research Scholar',
  'Operations Supervisor', 'Architect', 'Bank Branch Officer', 'Freelance Content Creator',
  'College Lecturer', 'Retail Store Manager', 'Mechanical Engineer', 'Pharmacist', 'Homemaker'
];

const EDUCATION_LEVELS = [
  'Higher Secondary / High School', 'Bachelor of Technology (B.Tech)', 'Bachelor of Commerce (B.Com)',
  'Bachelor of Science (B.Sc)', 'Bachelor of Arts (B.A)', 'Master of Business Administration (MBA)',
  'Master of Science (M.Sc)', 'Diploma in Engineering', 'Ph.D. Candidate / Scholar'
];

const INCOME_BANDS = [
  'Under ₹3 LPA', '₹3–6 LPA', '₹6–12 LPA', '₹12–25 LPA', '₹25+ LPA'
];

const TECH_COMFORTS = ['low', 'medium', 'high'];

// WRITING STYLES: 35% terse, 30% casual, 25% average, 10% detailed
function pickWritingStyle() {
  const r = Math.random();
  if (r < 0.35) {
    return {
      name: 'terse',
      instruction: 'Style TERSE: write 3 to 8 words only. Extremely direct and concise. No filler or fluff.'
    };
  } else if (r < 0.65) {
    return {
      name: 'casual',
      instruction: 'Style CASUAL: mostly lowercase, conversational phrasing, informal everyday language, maybe 1 minor typo or short abbreviation (e.g. tbh, kinda, pretty, etc).'
    };
  } else if (r < 0.90) {
    return {
      name: 'average',
      instruction: 'Style AVERAGE: one plain, neutral sentence. Balanced, normal everyday response.'
    };
  } else {
    return {
      name: 'detailed',
      instruction: 'Style DETAILED: 2 to 3 sentences with a specific, concrete observation or real-world comparison.'
    };
  }
}

// Active respondent profiles and memories cached per submission index
let currentSubmissionIndex = -1;
let currentRespondentProfile = null;
let currentRespondentMemories = []; // Stores section summaries for the current respondent
let runSeenTextAnswers = new Set(); // Stores text answers seen in this batch run to avoid duplicates

function getRespondentProfile(submissionIndex, personaHint) {
  if (currentSubmissionIndex === submissionIndex && currentRespondentProfile) {
    return currentRespondentProfile;
  }

  currentSubmissionIndex = submissionIndex;
  currentRespondentMemories = []; // Fresh memory for new respondent

  const genderRoll = Math.random();
  const gender = genderRoll < 0.48 ? 'Female' : (genderRoll < 0.96 ? 'Male' : 'Non-binary');
  const age = Math.floor(Math.random() * (60 - 18 + 1)) + 18;
  const city = INDIAN_CITIES[Math.floor(Math.random() * INDIAN_CITIES.length)];
  const occupation = OCCUPATIONS[Math.floor(Math.random() * OCCUPATIONS.length)];
  const education = EDUCATION_LEVELS[Math.floor(Math.random() * EDUCATION_LEVELS.length)];
  const income = INCOME_BANDS[Math.floor(Math.random() * INCOME_BANDS.length)];
  const techComfort = TECH_COMFORTS[Math.floor(Math.random() * TECH_COMFORTS.length)];
  const style = pickWritingStyle();

  let summary = `Age: ${age}, Gender: ${gender}, City: ${city}, Occupation: ${occupation}, Education: ${education}, Income: ${income}, Tech Comfort: ${techComfort}. Writing style: ${style.name.toUpperCase()} (${style.instruction})`;
  if (personaHint && personaHint.trim()) {
    summary += `. Additional persona guidance: ${personaHint.trim()}`;
  }

  currentRespondentProfile = {
    age, gender, city, occupation, education, income, techComfort,
    style,
    summary
  };

  return currentRespondentProfile;
}

// Image Fetcher & Base64 Converter
async function fetchImageAsBase64(url) {
  if (!url || typeof url !== 'string') return null;

  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) {
      console.warn(`[FormPilot Vision] Failed to fetch image ${url}: HTTP ${res.status}`);
      return null;
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const mimeType = contentType.split(';')[0].trim();
    const arrayBuffer = await res.arrayBuffer();

    if (arrayBuffer.byteLength > 4.5 * 1024 * 1024) {
      console.warn(`[FormPilot Vision] Image exceeds 4MB (${arrayBuffer.byteLength} bytes). Skipping.`);
      return null;
    }

    let binary = '';
    const bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
    }
    const base64Data = btoa(binary);

    return {
      mimeType: mimeType || 'image/jpeg',
      base64Data: base64Data
    };
  } catch (err) {
    console.warn(`[FormPilot Vision] Error downloading image ${url}:`, err);
    return null;
  }
}

// Fetch dynamic model list based on provider
async function fetchProviderModels(provider, apiKey, baseUrl) {
  // 1. Google Gemini Models
  if (provider === 'gemini') {
    let allModels = [];
    let pageToken = '';

    do {
      let url = 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=100';
      if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;

      const res = await fetch(url, {
        method: 'GET',
        headers: { 'x-goog-api-key': apiKey }
      });

      if (res.status === 401 || res.status === 403) throw new Error('Invalid Gemini API key');
      if (!res.ok) throw new Error(`Gemini models fetch failed (HTTP ${res.status})`);

      const data = await res.json();
      if (data.models && Array.isArray(data.models)) {
        allModels.push(...data.models);
      }
      pageToken = data.nextPageToken || '';
    } while (pageToken);

    const valid = allModels.filter(m =>
      Array.isArray(m.supportedGenerationMethods) &&
      m.supportedGenerationMethods.includes('generateContent')
    );

    const formatted = valid.map(m => {
      const id = m.name.replace(/^models\//, '');
      return { id: id, displayName: m.displayName || id };
    });

    formatted.sort((a, b) => {
      function score(m) {
        let s = 0;
        const id = m.id.toLowerCase();
        if (id.includes('3.8')) s += 1400;
        else if (id.includes('3.5')) s += 1200;
        else if (id.includes('2.0')) s += 1000;
        else if (id.includes('1.5')) s += 800;
        else if (id.includes('2.5')) s += 100; // Deprecated/gated by Google for new users
        if (id.includes('flash')) s += 120;
        if (id.includes('pro')) s += 110;
        return s;
      }
      return score(b) - score(a);
    });

    return formatted;
  }

  // 2. Anthropic Claude (Preset list - Anthropic has no public GET /models endpoint)
  if (provider === 'anthropic') {
    return [
      { id: 'claude-3-5-sonnet-20241022', displayName: 'Claude 3.5 Sonnet (Latest)' },
      { id: 'claude-3-5-haiku-20241022', displayName: 'Claude 3.5 Haiku' },
      { id: 'claude-3-opus-20240229', displayName: 'Claude 3 Opus' }
    ];
  }

  // 3. OpenAI, OpenRouter, Groq, or Custom OpenAI-Compatible
  let endpoint = '';
  if (provider === 'openai') {
    endpoint = 'https://api.openai.com/v1/models';
  } else if (provider === 'openrouter') {
    endpoint = 'https://openrouter.ai/api/v1/models';
  } else if (provider === 'groq') {
    endpoint = 'https://api.groq.com/openai/v1/models';
  } else {
    const root = (baseUrl || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
    endpoint = `${root}/models`;
  }

  const headers = {};
  if (apiKey && apiKey !== 'none') {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const res = await fetch(endpoint, { method: 'GET', headers });
  if (res.status === 401 || res.status === 403) throw new Error(`Invalid API key for ${provider}`);
  if (!res.ok) throw new Error(`Failed to fetch models from ${endpoint} (HTTP ${res.status})`);

  const data = await res.json();
  const rawList = data.data || data.models || (Array.isArray(data) ? data : []);
  if (!Array.isArray(rawList)) return [];

  const formatted = rawList.map(m => {
    const id = m.id || m.name || String(m);
    return { id: id, displayName: m.name || id };
  });

  return formatted;
}

// Universal AI Caller (Gemini, OpenAI, Anthropic, OpenRouter, Groq, Custom)
async function askUniversalAi({ provider = 'gemini', apiKey, modelName, baseUrl, imageParts = [], promptText, temperature = 1.0, isTest = false }) {
  const temp = Math.max(0.0, Math.min(1.5, Number(temperature) || 1.0));
  const maxRetries = 3;
  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt++;
    let response;

    try {
      // --- A. GOOGLE GEMINI ---
      if (provider === 'gemini') {
        const model = modelName || 'gemini-3.8-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

        const parts = [
          ...imageParts.map(img => ({
            inline_data: {
              mime_type: img.mimeType,
              data: img.base64Data
            }
          })),
          { text: promptText }
        ];

        const payload = {
          contents: [{ role: 'user', parts: parts }],
          generationConfig: {
            temperature: temp,
            responseMimeType: 'application/json'
          }
        };

        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify(payload)
        });
      }
      // --- B. ANTHROPIC CLAUDE ---
      else if (provider === 'anthropic') {
        const url = 'https://api.anthropic.com/v1/messages';
        const model = modelName || 'claude-3-5-sonnet-20241022';

        const content = [
          ...imageParts.map(img => ({
            type: 'image',
            source: {
              type: 'base64',
              media_type: img.mimeType,
              data: img.base64Data
            }
          })),
          { type: 'text', text: promptText }
        ];

        const payload = {
          model: model,
          max_tokens: 3000,
          temperature: Math.min(1.0, temp),
          messages: [{ role: 'user', content: content }]
        };

        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify(payload)
        });
      }
      // --- C. OPENAI, OPENROUTER, GROQ, OR CUSTOM OPENAI-COMPATIBLE ---
      else {
        let endpoint = '';
        if (provider === 'openai') {
          endpoint = 'https://api.openai.com/v1/chat/completions';
        } else if (provider === 'openrouter') {
          endpoint = 'https://openrouter.ai/api/v1/chat/completions';
        } else if (provider === 'groq') {
          endpoint = 'https://api.groq.com/openai/v1/chat/completions';
        } else {
          const root = (baseUrl || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
          endpoint = root.endsWith('/chat/completions') ? root : `${root}/chat/completions`;
        }

        const model = modelName || (provider === 'openai' ? 'gpt-4o-mini' : 'deepseek-chat');

        const content = [
          ...imageParts.map(img => ({
            type: 'image_url',
            image_url: { url: `data:${img.mimeType};base64,${img.base64Data}` }
          })),
          { type: 'text', text: promptText }
        ];

        const payload = {
          model: model,
          messages: [{ role: 'user', content: content }],
          temperature: temp
        };

        // Enable json_object response format for supported providers
        if (provider === 'openai' || provider === 'openrouter' || provider === 'groq') {
          payload.response_format = { type: 'json_object' };
        }

        const headers = { 'Content-Type': 'application/json' };
        if (apiKey && apiKey !== 'none') {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
        if (provider === 'openrouter') {
          headers['HTTP-Referer'] = 'https://github.com/makdi-manav/FormPilot';
          headers['X-Title'] = 'FormPilot';
        }

        response = await fetch(endpoint, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
        });
      }
    } catch (networkErr) {
      throw new Error(`Network error connecting to ${provider.toUpperCase()}: ${networkErr.message}. Check your internet connection or endpoint URL.`);
    }

    // Rate Limit Handling (HTTP 429)
    if (response.status === 429) {
      let errDetail = '';
      try {
        const errJson = await response.json();
        errDetail = errJson.error ? (errJson.error.message || JSON.stringify(errJson.error)) : '';
      } catch (_) {}

      if (isTest) {
        throw new Error(`Rate limit / Quota exceeded (HTTP 429) on ${provider.toUpperCase()}.${errDetail ? ' Details: ' + errDetail : ' Your free-tier quota is exhausted or rate limit hit. Try another model (e.g. gemini-2.0-flash) or switch provider.'}`);
      }

      if (attempt <= maxRetries) {
        console.warn(`[FormPilot Service Worker] Rate limit hit (HTTP 429) on ${provider}. Waiting 20s before retry ${attempt}/${maxRetries}...`);
        await chrome.storage.local.set({
          statusMessage: `Rate limit (429) on ${provider}. Retrying in 20s (${attempt}/${maxRetries})...`
        });
        await new Promise(r => setTimeout(r, 20000));
        continue;
      } else {
        throw new Error(`API rate limit exceeded (HTTP 429) on ${provider} after 3 retries.${errDetail ? ' Details: ' + errDetail : ''} Please wait a moment or increase submission delay.`);
      }
    }

    // Authentication Errors (HTTP 401, 403)
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Invalid API key or unauthorized access for ${provider}. Please verify your key in Settings.`);
    }

    if (!response.ok) {
      let errText = '';
      try {
        const errJson = await response.json();
        errText = errJson.error ? (errJson.error.message || JSON.stringify(errJson.error)) : JSON.stringify(errJson);
      } catch (_) {
        errText = await response.text();
      }
      throw new Error(`${provider.toUpperCase()} API Error (HTTP ${response.status}): ${errText}`);
    }

    const data = await response.json();

    // Extract text output based on provider
    if (provider === 'gemini') {
      if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) return '';
      return data.candidates[0].content.parts[0].text;
    } else if (provider === 'anthropic') {
      if (!data.content || !data.content[0]?.text) return '';
      return data.content[0].text;
    } else {
      // OpenAI / OpenRouter / Groq / Custom
      if (!data.choices || !data.choices[0]?.message?.content) return '';
      return data.choices[0].message.content;
    }
  }
}

function parseJsonSafely(rawText) {
  if (!rawText || typeof rawText !== 'string') return {};
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // Attempt relaxed regex parsing if wrapped in extra dialogue
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (_) {}
    }
    console.warn('[FormPilot Service Worker] Failed to parse AI JSON output:', err);
    return {};
  }
}

// Extension Initialization
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get([
    'total', 'delay', 'fixedAnswers', 'running', 'done',
    'aiProvider', 'modelName', 'baseUrl', 'useAiAnswers', 'personaHint', 'temperature'
  ]);
  const defaults = {};

  if (existing.total === undefined) defaults.total = 10;
  if (existing.delay === undefined) defaults.delay = 2;
  if (!existing.fixedAnswers || !Array.isArray(existing.fixedAnswers) || existing.fixedAnswers.length === 0) {
    defaults.fixedAnswers = [{ keyword: 'resident', answer: 'Yes' }];
  }
  if (existing.running === undefined) defaults.running = false;
  if (existing.done === undefined) defaults.done = 0;
  if (existing.aiProvider === undefined) defaults.aiProvider = 'gemini';
  if (existing.modelName === undefined) defaults.modelName = 'gemini-3.8-flash';
  if (existing.baseUrl === undefined) defaults.baseUrl = 'https://generativelanguage.googleapis.com';
  if (existing.temperature === undefined) defaults.temperature = 1.0;
  if (existing.useAiAnswers === undefined) defaults.useAiAnswers = false;
  if (existing.personaHint === undefined) defaults.personaHint = '';
  defaults.statusMessage = 'Ready';

  if (Object.keys(defaults).length > 0) {
    await chrome.storage.local.set(defaults);
  }
  console.log('[FormPilot Service Worker] Initialized with universal AI settings.');
});

// Runtime Message Listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 1. Fetch Dynamic Models
  if (request.action === 'FETCH_MODELS') {
    (async () => {
      try {
        const state = await chrome.storage.local.get(['aiProvider', 'apiKey', 'baseUrl']);
        const provider = request.provider || state.aiProvider || 'gemini';
        const apiKey = (request.apiKey || state.apiKey || '').trim();
        const baseUrl = (request.baseUrl || state.baseUrl || '').trim();

        const models = await fetchProviderModels(provider, apiKey, baseUrl);
        sendResponse({ success: true, models: models });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  // 2. Test Connection & Key
  if (request.action === 'TEST_KEY') {
    (async () => {
      try {
        const provider = request.provider || 'gemini';
        const apiKey = (request.apiKey || '').trim();
        const modelName = request.modelName || 'gemini-3.8-flash';
        const baseUrl = request.baseUrl || '';

        const textOutput = await askUniversalAi({
          provider,
          apiKey,
          modelName,
          baseUrl,
          imageParts: [],
          promptText: 'Respond with ONLY a JSON object: {"status": "ok"}',
          temperature: 0.7,
          isTest: true
        });

        const parsed = parseJsonSafely(textOutput);
        if (parsed && (parsed.status === 'ok' || Object.keys(parsed).length > 0)) {
          sendResponse({ success: true, model: modelName, provider });
        } else {
          sendResponse({ success: true, model: modelName, provider });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  // 3. Generate Multimodal AI Answers for a Section Stimulus
  if (request.action === 'GET_AI_ANSWERS') {
    (async () => {
      try {
        const state = await chrome.storage.local.get(['aiProvider', 'apiKey', 'modelName', 'baseUrl', 'temperature']);
        const provider = state.aiProvider || 'gemini';
        const apiKey = state.apiKey ? state.apiKey.trim() : '';
        const modelName = state.modelName ? state.modelName.trim() : 'gemini-3.8-flash';
        const baseUrl = state.baseUrl || '';
        const temperature = state.temperature !== undefined ? parseFloat(state.temperature) : 1.0;

        if (!apiKey && provider !== 'custom') {
          sendResponse({
            success: false,
            error: 'MISSING_API_KEY',
            message: `API key for ${provider.toUpperCase()} is not configured. Please open settings to configure your key.`
          });
          return;
        }

        const submissionIndex = request.submissionIndex || 0;
        const personaHint = request.personaHint || '';
        const stimulus = request.stimulus || {};
        const sectionTitle = stimulus.sectionTitle || 'Current Section';
        const sectionDescription = stimulus.sectionDescription || '';
        const candidateImages = Array.isArray(stimulus.images) ? stimulus.images : [];
        const questions = Array.isArray(stimulus.questions) ? stimulus.questions : [];

        // Clear seen answers when starting a brand new run at submission 0
        if (submissionIndex === 0 && currentSubmissionIndex !== 0) {
          runSeenTextAnswers.clear();
        }

        const profile = getRespondentProfile(submissionIndex, personaHint);

        console.log(`[FormPilot Service Worker] Processing Section "${sectionTitle}" [Provider: ${provider.toUpperCase()}, Model: ${modelName}] for Response #${submissionIndex + 1}. Style: ${profile.style.name}. Images: ${candidateImages.length}`);

        // Fetch candidate images in parallel
        const validImages = [];
        let failedImageCount = 0;

        for (const imgItem of candidateImages) {
          const imgData = await fetchImageAsBase64(imgItem.url);
          if (imgData) {
            validImages.push(imgData);
          } else {
            failedImageCount++;
          }
        }

        if (candidateImages.length > 0 && validImages.length === 0) {
          const warnMsg = `Couldn't load image for section ${sectionTitle}`;
          console.warn(`[FormPilot Service Worker] ${warnMsg}`);
          await chrome.storage.local.set({ lastWarning: warnMsg });
        } else if (failedImageCount > 0) {
          await chrome.storage.local.set({ lastWarning: `Couldn't load ${failedImageCount} image(s) for section ${sectionTitle}` });
        }

        // Build prompt text
        const promptText = `You are answering questions on a survey as a realistic human respondent.
RESPONDENT PROFILE:
${profile.summary}

SURVEY SECTION:
Title: ${sectionTitle}
${sectionDescription ? `Description: ${sectionDescription}` : ''}

${currentRespondentMemories.length > 0 ? `PREVIOUS ANSWERS BY THIS RESPONDENT IN EARLIER SECTIONS (keep tastes consistent):\n${currentRespondentMemories.slice(-6).join('\n')}\n` : ''}
INSTRUCTIONS:
1. Look carefully at any attached image(s) and mention specific things you actually see (shape, colour, material, text, size, price tag, setting, people).
2. Respond strictly as this person would, in their assigned writing style: ${profile.style.name.toUpperCase()} (${profile.style.instruction}).
3. Do NOT use marketing or corporate buzzwords like "sleek", "innovative", "cutting-edge", "seamless", "elevate", "state-of-the-art".
4. Do NOT start answers the same way. Opinions can be mixed, indifferent, or critical—not always enthusiastic or positive.
5. If a question asks for up to three words, give 1-3 words or phrases, not a complete sentence. Keep each answer within the length asked for.
6. For choice questions return exactly one of the given options (verbatim).
7. For checkboxes return an array of options.
8. For required questions (required: true), always answer.
9. For optional questions (required: false), skip answering about 20% of the time (return an empty string "") to simulate realistic respondent behavior.
10. Respond with ONLY a JSON object mapping question id to answer. No markdown code fences, no extra text.

REFERENCE EXAMPLES of answer styles for a different product (a desktop ceramic coffee mug):
- Example (style terse): "plain matte brown, handle is too thin"
- Example (style casual): "looks pretty heavy tbh, nice warm earthy color though"
- Example (style detailed): "The circular lip looks comfortable to drink from, but the raw unglazed bottom might scratch wooden desks without a coaster."
(Emulate the brevity and realism of these examples, never the mug content).

QUESTIONS TO ANSWER:
${JSON.stringify(questions, null, 2)}`;

        const rawText = await askUniversalAi({
          provider,
          apiKey,
          modelName,
          baseUrl,
          imageParts: validImages,
          promptText,
          temperature
        });

        let answers = parseJsonSafely(rawText);

        // Deduplication check: if an open-ended text answer was already used in this run, rewrite it once
        const textQuestions = questions.filter(q => q.type === 'text' || q.type === 'paragraph');
        let duplicateFound = null;

        for (const tq of textQuestions) {
          const val = answers[tq.id];
          if (val && typeof val === 'string' && val.trim().length > 5) {
            const normalized = val.trim().toLowerCase();
            if (runSeenTextAnswers.has(normalized)) {
              duplicateFound = { questionId: tq.id, questionTitle: tq.title, oldAnswer: val };
              break;
            }
          }
        }

        // Trigger single rewrite if duplicate detected
        if (duplicateFound) {
          console.log(`[FormPilot Service Worker] Duplicate answer detected for "${duplicateFound.questionTitle}": "${duplicateFound.oldAnswer}". Requesting rewrite...`);
          try {
            const rewritePrompt = `The previous answer "${duplicateFound.oldAnswer}" for question "${duplicateFound.questionTitle}" was already used by another respondent. Rewrite it differently adhering to the persona and ${profile.style.name} style. Respond with JSON: {"${duplicateFound.questionId}": "new rewritten answer"}`;
            const rewriteRaw = await askUniversalAi({
              provider,
              apiKey,
              modelName,
              baseUrl,
              imageParts: validImages,
              promptText: rewritePrompt,
              temperature
            });
            const rewriteParsed = parseJsonSafely(rewriteRaw);
            if (rewriteParsed && rewriteParsed[duplicateFound.questionId]) {
              answers[duplicateFound.questionId] = rewriteParsed[duplicateFound.questionId];
              console.log(`[FormPilot Service Worker] Rewritten to: "${answers[duplicateFound.questionId]}"`);
            }
          } catch (rwErr) {
            console.warn('[FormPilot Service Worker] Rewrite attempt failed, keeping original:', rwErr);
          }
        }

        // Record text answers into runSeenTextAnswers
        for (const tq of textQuestions) {
          const val = answers[tq.id];
          if (val && typeof val === 'string' && val.trim().length > 5) {
            runSeenTextAnswers.add(val.trim().toLowerCase());
          }
        }

        // Update respondent cross-section memory
        const memoryEntries = [];
        for (const q of questions.slice(0, 3)) {
          const a = answers[q.id];
          if (a !== undefined && a !== null && a !== '') {
            const aStr = Array.isArray(a) ? a.join(', ') : String(a);
            memoryEntries.push(`${q.title.substring(0, 30)}: ${aStr.substring(0, 40)}`);
          }
        }
        if (memoryEntries.length > 0) {
          currentRespondentMemories.push(`[${sectionTitle}]: ${memoryEntries.join('; ')}`);
        }

        sendResponse({
          success: true,
          answers: answers,
          sectionTitle: sectionTitle,
          provider: provider,
          model: modelName,
          personaSummary: profile.summary
        });
      } catch (err) {
        console.error('[FormPilot Service Worker] Error generating AI answers:', err);
        sendResponse({
          success: false,
          error: err.message,
          message: err.message
        });
      }
    })();
    return true;
  }
});
