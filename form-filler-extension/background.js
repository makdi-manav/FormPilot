// Background service worker for FormPilot (Google Forms Auto-Filler)
// Handles Gemini API calls, vision multimodal processing, rate limiting (HTTP 429),
// dynamic model listing, respondent personas, writing styles, and duplicate deduplication.

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
let currentRespondentMemories = []; // Array of strings: "[Section S01]: shape: Organic (2), decoration: Floral"
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

// Fetch dynamic models list from Gemini API
async function fetchGeminiModels(apiKey) {
  let allModels = [];
  let pageToken = '';

  do {
    let url = 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=100';
    if (pageToken) {
      url += `&pageToken=${encodeURIComponent(pageToken)}`;
    }

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'x-goog-api-key': apiKey
      }
    });

    if (res.status === 401 || res.status === 403) {
      throw new Error('Invalid API key');
    }
    if (!res.ok) {
      throw new Error(`Failed to fetch models list (HTTP ${res.status})`);
    }

    const data = await res.json();
    if (data.models && Array.isArray(data.models)) {
      allModels.push(...data.models);
    }
    pageToken = data.nextPageToken || '';
  } while (pageToken);

  // Keep only models that support generateContent
  const valid = allModels.filter(m =>
    Array.isArray(m.supportedGenerationMethods) &&
    m.supportedGenerationMethods.includes('generateContent')
  );

  // Strip 'models/' prefix
  const formatted = valid.map(m => {
    const id = m.name.replace(/^models\//, '');
    return {
      id: id,
      displayName: m.displayName || id,
      description: m.description || ''
    };
  });

  // Sort so newest "pro" and "flash" models are at the top
  formatted.sort((a, b) => {
    function score(m) {
      let s = 0;
      const id = m.id.toLowerCase();
      if (id.includes('2.5')) s += 1000;
      else if (id.includes('2.0')) s += 800;
      else if (id.includes('1.5')) s += 600;
      else if (id.includes('1.0')) s += 400;

      if (id.includes('flash')) s += 120;
      if (id.includes('pro')) s += 110;
      if (id.includes('preview') || id.includes('exp')) s -= 25;
      return s;
    }
    return score(b) - score(a);
  });

  return formatted;
}

// Fetch image from URL and convert to Base64 (max ~4MB)
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

// Low-level Gemini API generateContent call with multimodal parts & 429 retry
async function askGemini(apiKey, modelName, partsArray, temperature = 1.0) {
  const model = modelName || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: partsArray
      }
    ],
    generationConfig: {
      temperature: Math.max(0.7, Math.min(1.2, Number(temperature) || 1.0)),
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
    'modelName', 'useAiAnswers', 'personaHint', 'temperature'
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
  if (existing.temperature === undefined) defaults.temperature = 1.0;
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
  // 1. Fetch Models Action
  if (request.action === 'FETCH_MODELS') {
    (async () => {
      try {
        const state = await chrome.storage.local.get(['apiKey']);
        const apiKey = (request.apiKey || state.apiKey || '').trim();
        if (!apiKey) {
          sendResponse({ success: false, error: 'API key is required. Please enter an API key.' });
          return;
        }
        const models = await fetchGeminiModels(apiKey);
        sendResponse({ success: true, models: models });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  // 2. Test API Key Connectivity
  if (request.action === 'TEST_KEY') {
    (async () => {
      try {
        const parts = [{ text: 'Respond with JSON: {"status": "ok"}' }];
        const data = await askGemini(request.apiKey, request.modelName, parts, 1.0);
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
    return true;
  }

  // 3. Generate Multimodal AI Answers for a Section Stimulus
  if (request.action === 'GET_AI_ANSWERS') {
    (async () => {
      try {
        const state = await chrome.storage.local.get(['apiKey', 'modelName', 'temperature']);
        const apiKey = state.apiKey ? state.apiKey.trim() : '';
        const modelName = state.modelName ? state.modelName.trim() : 'gemini-2.5-flash';
        const temperature = state.temperature !== undefined ? parseFloat(state.temperature) : 1.0;

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

        console.log(`[FormPilot Service Worker] Processing Section "${sectionTitle}" for Response #${submissionIndex + 1}. Style: ${profile.style.name}. Images found: ${candidateImages.length}`);

        // Fetch candidate images in parallel
        const imageParts = [];
        let failedImageCount = 0;

        for (const imgItem of candidateImages) {
          const imgData = await fetchImageAsBase64(imgItem.url);
          if (imgData) {
            imageParts.push({
              inline_data: {
                mime_type: imgData.mimeType,
                data: imgData.base64Data
              }
            });
          } else {
            failedImageCount++;
          }
        }

        if (candidateImages.length > 0 && imageParts.length === 0) {
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
3. Do NOT use marketing or corporate words like "sleek", "innovative", "cutting-edge", "seamless", "elevate", "state-of-the-art".
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

        // Construct parts array: image parts placed BEFORE the text part
        const partsArray = [...imageParts, { text: promptText }];

        const data = await askGemini(apiKey, modelName, partsArray, temperature);
        const rawText = extractCandidateText(data);
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
            const rewriteParts = [...imageParts, { text: rewritePrompt }];
            const rewriteData = await askGemini(apiKey, modelName, rewriteParts, temperature);
            const rewriteParsed = parseJsonSafely(extractCandidateText(rewriteData));
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
