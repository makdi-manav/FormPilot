// Background service worker for FormPilot (Google Forms Auto-Filler)
// Handles Gemini API calls, rate limiting (HTTP 429), persona generation, and key testing.

const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad',
  'Jaipur', 'Lucknow', 'Chandigarh', 'Surat', 'Indore', 'Bhopal', 'Patna', 'Kochi',
  'Visakhapatnam', 'Coimbatore', 'Nagpur', 'Vadodara', 'Bhubaneswar', 'Dehradun', 'Mysore',
  'Guwahati', 'Ranchi', 'Varanasi', 'Thiruvananthapuram', 'Mangalore', 'Amritsar'
];

const OCCUPATIONS = [
  'Software Engineer', 'College Student', 'Graphic Designer', 'Data Analyst',
  'Accountant', 'High School Teacher', 'Civil Engineer', 'Marketing Specialist',
  'Doctor / Medical Resident', 'Business Consultant', 'Research Scholar',
  'Operations Manager', 'Architect', 'Bank Officer', 'Freelance Writer', 'College Professor'
];

const EDUCATION_LEVELS = [
  'Bachelor of Technology / Engineering', 'Bachelor of Commerce',
  'Master of Science', 'Master of Business Administration (MBA)',
  'Bachelor of Arts', 'Master of Arts', 'Bachelor of Science', 'Ph.D. Scholar'
];

// Active persona cache to keep persona consistent across multi-page sections of the same response
let currentCachedPersona = null;
let currentCachedSubmissionIndex = -1;

function generatePersona(personaHint) {
  const gender = Math.random() < 0.48 ? 'Female' : (Math.random() < 0.95 ? 'Male' : 'Non-binary');
  const age = Math.floor(Math.random() * (60 - 18 + 1)) + 18;
  const city = INDIAN_CITIES[Math.floor(Math.random() * INDIAN_CITIES.length)];
  const occupation = OCCUPATIONS[Math.floor(Math.random() * OCCUPATIONS.length)];
  const education = EDUCATION_LEVELS[Math.floor(Math.random() * EDUCATION_LEVELS.length)];

  let desc = `Age ${age}, Gender: ${gender}, City: ${city}, Occupation: ${occupation}, Education: ${education}`;
  if (personaHint && personaHint.trim()) {
    desc += `. Additional background context: ${personaHint.trim()}`;
  }
  return desc;
}

function getPersonaForSubmission(submissionIndex, personaHint) {
  if (currentCachedSubmissionIndex === submissionIndex && currentCachedPersona) {
    return currentCachedPersona;
  }
  currentCachedSubmissionIndex = submissionIndex;
  currentCachedPersona = generatePersona(personaHint);
  return currentCachedPersona;
}

// Low-level Gemini API fetcher with 429 exponential backoff / wait 20s
async function askGemini(apiKey, modelName, promptText) {
  const model = modelName || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: promptText
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 1.0,
      responseMimeType: 'application/json'
    }
  };

  const maxRetries = 3;
  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt++;
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify(payload)
      });
    } catch (networkErr) {
      throw new Error(`Network error connecting to Gemini API: ${networkErr.message}. Check your internet connection.`);
    }

    // Rate Limit Handling (HTTP 429)
    if (response.status === 429) {
      if (attempt <= maxRetries) {
        console.warn(`[FormPilot Service Worker] Rate limit hit (HTTP 429). Waiting 20s before retry ${attempt}/${maxRetries}...`);
        await chrome.storage.local.set({
          statusMessage: `Rate limit (429). Retrying in 20s (${attempt}/${maxRetries})...`
        });
        await new Promise(r => setTimeout(r, 20000));
        continue;
      } else {
        throw new Error('Gemini API rate limit exceeded (HTTP 429) after 3 retries. Please wait a moment or increase submission delay.');
      }
    }

    // Authentication Errors (HTTP 401, 403)
    if (response.status === 401 || response.status === 403) {
      throw new Error('Invalid API key');
    }

    if (!response.ok) {
      let errText = '';
      try {
        const errJson = await response.json();
        errText = errJson.error ? errJson.error.message : JSON.stringify(errJson);
      } catch (_) {
        errText = await response.text();
      }
      throw new Error(`Gemini API Error (HTTP ${response.status}): ${errText}`);
    }

    const data = await response.json();
    return data;
  }
}

function extractCandidateText(apiResponse) {
  if (!apiResponse || !apiResponse.candidates || !apiResponse.candidates.length) {
    return '';
  }
  const candidate = apiResponse.candidates[0];
  if (!candidate.content || !candidate.content.parts || !candidate.content.parts.length) {
    return '';
  }
  return candidate.content.parts[0].text || '';
}

function parseJsonSafely(rawText) {
  if (!rawText || typeof rawText !== 'string') return {};
  let cleaned = rawText.trim();
  // Strip markdown code fences if model wrapped response in ```json ... ```
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn('[FormPilot Service Worker] Failed to parse Gemini JSON output:', err);
    return {};
  }
}

// Extension Initialization
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get([
    'total', 'delay', 'fixedAnswers', 'running', 'done',
    'modelName', 'useAiAnswers', 'personaHint'
  ]);
  const defaults = {};

  if (existing.total === undefined) defaults.total = 10;
  if (existing.delay === undefined) defaults.delay = 2;
  if (!existing.fixedAnswers || !Array.isArray(existing.fixedAnswers) || existing.fixedAnswers.length === 0) {
    defaults.fixedAnswers = [{ keyword: 'resident', answer: 'Yes' }];
  }
  if (existing.running === undefined) defaults.running = false;
  if (existing.done === undefined) defaults.done = 0;
  if (existing.modelName === undefined) defaults.modelName = 'gemini-2.5-flash';
  if (existing.useAiAnswers === undefined) defaults.useAiAnswers = false;
  if (existing.personaHint === undefined) defaults.personaHint = '';
  defaults.statusMessage = 'Ready';

  if (Object.keys(defaults).length > 0) {
    await chrome.storage.local.set(defaults);
  }
  console.log('[FormPilot Service Worker] Initialized with default settings.');
});

// Runtime Message Listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Test API Key connectivity from Options Page
  if (request.action === 'TEST_KEY') {
    (async () => {
      try {
        const testPrompt = 'Respond with JSON: {"status": "ok"}';
        const data = await askGemini(request.apiKey, request.modelName, testPrompt);
        const text = extractCandidateText(data);
        const parsed = parseJsonSafely(text);
        if (parsed && (parsed.status === 'ok' || Object.keys(parsed).length > 0)) {
          sendResponse({ success: true, model: request.modelName || 'gemini-2.5-flash' });
        } else {
          sendResponse({ success: true, model: request.modelName || 'gemini-2.5-flash' });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep message channel open for async response
  }

  // Generate Answers for Form Page via Gemini
  if (request.action === 'GET_AI_ANSWERS') {
    (async () => {
      try {
        const state = await chrome.storage.local.get(['apiKey', 'modelName']);
        const apiKey = state.apiKey ? state.apiKey.trim() : '';
        const modelName = state.modelName ? state.modelName.trim() : 'gemini-2.5-flash';

        if (!apiKey) {
          sendResponse({
            success: false,
            error: 'MISSING_API_KEY',
            message: 'Gemini API key is not configured. Please open settings to configure your API key.'
          });
          return;
        }

        const submissionIndex = request.submissionIndex || 0;
        const personaHint = request.personaHint || '';
        const persona = getPersonaForSubmission(submissionIndex, personaHint);

        console.log(`[FormPilot Service Worker] Requesting Gemini answers for Response #${submissionIndex + 1}. Persona: ${persona}`);

        const prompt = `You are filling out a survey as a realistic respondent: an adult (18+) resident of India.
Persona for this response: ${persona}.
Answer every question realistically and consistently with the persona.
For choice questions return exactly one of the given options (verbatim).
For checkboxes return an array of options.
For text return a short natural answer.
Respond with ONLY a JSON object mapping question id to answer. No markdown, no explanations.

Questions:
${JSON.stringify(request.questions, null, 2)}`;

        const data = await askGemini(apiKey, modelName, prompt);
        const rawText = extractCandidateText(data);
        const answers = parseJsonSafely(rawText);

        sendResponse({
          success: true,
          answers: answers,
          persona: persona
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
    return true; // Keep message channel open for async response
  }
});
