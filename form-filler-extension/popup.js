// Popup Script - FormPilot (Google Forms Auto-Filler)
// Supports multi-page forms, random demographic dummy data, and Gemini AI answering mode.

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const totalInput = document.getElementById('totalInput');
  const delayInput = document.getElementById('delayInput');
  const fixedAnswersList = document.getElementById('fixedAnswersList');
  const addRuleBtn = document.getElementById('addRuleBtn');
  const toggleBulkBtn = document.getElementById('toggleBulkBtn');
  const bulkContainer = document.getElementById('bulkContainer');
  const bulkTextarea = document.getElementById('bulkTextarea');
  const saveBulkBtn = document.getElementById('saveBulkBtn');
  const cancelBulkBtn = document.getElementById('cancelBulkBtn');
  const scanQuestionsBtn = document.getElementById('scanQuestionsBtn');
  const randomFallbackCheckbox = document.getElementById('randomFallbackCheckbox');

  // AI Mode Elements
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const errorBanner = document.getElementById('errorBanner');
  const useAiToggle = document.getElementById('useAiToggle');
  const aiDetails = document.getElementById('aiDetails');
  const personaHintInput = document.getElementById('personaHintInput');
  const apiKeyWarning = document.getElementById('apiKeyWarning');
  const missingKeySettingsLink = document.getElementById('missingKeySettingsLink');

  // Action & Status Elements
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const statusDot = document.getElementById('statusDot');
  const statusLabel = document.getElementById('statusLabel');
  const statusText = document.getElementById('statusText');
  const pageStatusText = document.getElementById('pageStatusText');
  const progressBar = document.getElementById('progressBar');
  const tabNotice = document.getElementById('tabNotice');

  let currentFixedAnswers = [];

  // Open Settings Page
  if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  if (missingKeySettingsLink) {
    missingKeySettingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  }

  // Check active tab
  async function getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
  }

  const activeTab = await getActiveTab();
  const isGoogleFormsPage = activeTab && activeTab.url && activeTab.url.includes('docs.google.com/forms');

  if (!isGoogleFormsPage) {
    tabNotice.textContent = '⚠️ Active tab is not a Google Form. Switch to a Google Form tab.';
    tabNotice.classList.add('warning');
  } else {
    tabNotice.textContent = '✓ Ready on Google Forms tab.';
    tabNotice.classList.remove('warning');
  }

  // Safely send message to content script with auto-injection fallback
  async function safeSendMessage(tabId, message) {
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (err) {
      // Content script may have been detached due to extension reload
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        });
        await new Promise(r => setTimeout(r, 300));
        return await chrome.tabs.sendMessage(tabId, message);
      } catch (e) {
        // Tab closed or not accessible
        return null;
      }
    }
  }

  // Load saved state from chrome.storage.local
  async function loadState() {
    const data = await chrome.storage.local.get([
      'total',
      'delay',
      'fixedAnswers',
      'running',
      'done',
      'statusMessage',
      'currentPageStatus',
      'useRandomFallback',
      'useAiAnswers',
      'personaHint',
      'apiKey'
    ]);

    totalInput.value = data.total !== undefined ? data.total : 10;
    delayInput.value = data.delay !== undefined ? data.delay : 2;
    randomFallbackCheckbox.checked = data.useRandomFallback !== false;

    // AI Settings
    const isAi = Boolean(data.useAiAnswers);
    useAiToggle.checked = isAi;
    aiDetails.style.display = isAi ? 'block' : 'none';
    personaHintInput.value = data.personaHint || '';

    if (isAi && (!data.apiKey || !data.apiKey.trim())) {
      apiKeyWarning.style.display = 'block';
    } else {
      apiKeyWarning.style.display = 'none';
    }

    if (Array.isArray(data.fixedAnswers) && data.fixedAnswers.length > 0) {
      currentFixedAnswers = data.fixedAnswers;
    } else {
      currentFixedAnswers = [{ keyword: 'resident', answer: 'Yes' }];
      await chrome.storage.local.set({ fixedAnswers: currentFixedAnswers });
    }

    renderFixedAnswers();
    updateUI(data);
  }

  // AI Toggle Change
  useAiToggle.addEventListener('change', async (e) => {
    const isAi = e.target.checked;
    aiDetails.style.display = isAi ? 'block' : 'none';
    await chrome.storage.local.set({ useAiAnswers: isAi });

    const data = await chrome.storage.local.get(['apiKey', 'delay']);
    if (isAi && (!data.apiKey || !data.apiKey.trim())) {
      apiKeyWarning.style.display = 'block';
    } else {
      apiKeyWarning.style.display = 'none';
    }

    // Default to 4s delay in AI mode to comfortably stay within API rate limits
    if (isAi && (parseFloat(delayInput.value) <= 2 || data.delay <= 2)) {
      delayInput.value = 4;
      await chrome.storage.local.set({ delay: 4 });
    }
  });

  // Persona Hint Input
  personaHintInput.addEventListener('input', async (e) => {
    await chrome.storage.local.set({ personaHint: e.target.value.trim() });
  });

  // Render Fixed Answer Rows
  function renderFixedAnswers() {
    fixedAnswersList.innerHTML = '';
    if (currentFixedAnswers.length === 0) {
      fixedAnswersList.innerHTML = '<div class="empty-fixed-msg">No fixed answers configured.</div>';
      return;
    }

    currentFixedAnswers.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'fixed-row';
      row.dataset.index = index;

      row.innerHTML = `
        <input type="text" class="input-keyword" placeholder="Keyword (e.g. resident)" value="${escapeHtml(item.keyword || '')}">
        <span class="arrow">&rarr;</span>
        <input type="text" class="input-answer" placeholder="Answer (e.g. Yes)" value="${escapeHtml(item.answer || '')}">
        <button type="button" class="btn-delete-row" title="Delete row">&times;</button>
      `;

      // Keyword input change
      const kwInput = row.querySelector('.input-keyword');
      kwInput.addEventListener('input', (e) => {
        currentFixedAnswers[index].keyword = e.target.value.trim();
        saveFixedAnswers();
      });

      // Answer input change
      const ansInput = row.querySelector('.input-answer');
      ansInput.addEventListener('input', (e) => {
        currentFixedAnswers[index].answer = e.target.value;
        saveFixedAnswers();
      });

      // Delete row button
      const delBtn = row.querySelector('.btn-delete-row');
      delBtn.addEventListener('click', () => {
        currentFixedAnswers.splice(index, 1);
        renderFixedAnswers();
        saveFixedAnswers();
      });

      fixedAnswersList.appendChild(row);
    });
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  async function saveFixedAnswers() {
    await chrome.storage.local.set({ fixedAnswers: currentFixedAnswers });
  }

  // Update UI Elements based on state
  function updateUI(state) {
    const isRunning = Boolean(state.running);
    const total = Number(state.total) || 10;
    const done = Number(state.done) || 0;

    startBtn.disabled = isRunning;
    stopBtn.disabled = !isRunning;
    totalInput.disabled = isRunning;
    delayInput.disabled = isRunning;
    addRuleBtn.disabled = isRunning;
    toggleBulkBtn.disabled = isRunning;
    scanQuestionsBtn.disabled = isRunning;
    randomFallbackCheckbox.disabled = isRunning;
    useAiToggle.disabled = isRunning;
    personaHintInput.disabled = isRunning;

    const rowInputs = fixedAnswersList.querySelectorAll('input, button');
    rowInputs.forEach(el => el.disabled = isRunning);

    const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
    progressBar.style.width = `${percent}%`;

    // Check for error messages in status
    const statusMsg = state.statusMessage || '';
    const isError = /error|invalid api key|rate limit|429/i.test(statusMsg);

    if (isError && !isRunning) {
      errorBanner.textContent = statusMsg;
      errorBanner.style.display = 'block';
    } else {
      errorBanner.style.display = 'none';
    }

    statusDot.className = 'status-indicator';
    if (isRunning) {
      statusDot.classList.add('running');
      statusLabel.textContent = state.useAiAnswers ? 'Status: Running (AI Mode)' : 'Status: Running (Random Mode)';
      statusText.textContent = `Submitted ${done} / ${total}`;
      if (state.currentPageStatus) {
        pageStatusText.textContent = state.currentPageStatus;
      }
    } else if (done >= total && total > 0 && done > 0) {
      statusDot.classList.add('finished');
      statusLabel.textContent = 'Status: Finished';
      statusText.textContent = state.statusMessage || `Finished (${done} / ${total})`;
      pageStatusText.textContent = 'All multi-page submissions completed.';
    } else if (statusMsg && statusMsg.toLowerCase().includes('stopped')) {
      statusDot.classList.add('stopped');
      statusLabel.textContent = 'Status: Stopped';
      statusText.textContent = statusMsg;
      pageStatusText.textContent = state.currentPageStatus || 'Stopped by user.';
    } else {
      statusLabel.textContent = 'Status: Idle';
      statusText.textContent = statusMsg || 'Ready to start';
      pageStatusText.textContent = 'Supports multi-page forms (1 to 50+ pages)';
    }
  }

  // Add rule button
  addRuleBtn.addEventListener('click', () => {
    currentFixedAnswers.push({ keyword: '', answer: '' });
    renderFixedAnswers();
    saveFixedAnswers();
    const inputs = fixedAnswersList.querySelectorAll('.input-keyword');
    if (inputs.length > 0) {
      inputs[inputs.length - 1].focus();
    }
  });

  // Bulk Edit Toggle
  toggleBulkBtn.addEventListener('click', () => {
    if (bulkContainer.style.display === 'none') {
      bulkTextarea.value = currentFixedAnswers
        .map(r => `${r.keyword || ''} : ${r.answer || ''}`)
        .join('\n');
      bulkContainer.style.display = 'block';
      bulkTextarea.focus();
    } else {
      bulkContainer.style.display = 'none';
    }
  });

  // Save Bulk Rules
  saveBulkBtn.addEventListener('click', () => {
    const lines = bulkTextarea.value.split('\n');
    const newRules = [];
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      let sepIndex = line.indexOf(':');
      if (sepIndex === -1) sepIndex = line.indexOf('=');
      if (sepIndex === -1 && line.includes('->')) sepIndex = line.indexOf('->');

      if (sepIndex !== -1) {
        const kw = line.substring(0, sepIndex).trim();
        const sepLen = line.substr(sepIndex, 2) === '->' ? 2 : 1;
        const ans = line.substring(sepIndex + sepLen).trim();
        if (kw) {
          newRules.push({ keyword: kw, answer: ans });
        }
      } else {
        newRules.push({ keyword: line, answer: '' });
      }
    }

    if (newRules.length > 0) {
      currentFixedAnswers = newRules;
    }
    renderFixedAnswers();
    saveFixedAnswers();
    bulkContainer.style.display = 'none';
  });

  cancelBulkBtn.addEventListener('click', () => {
    bulkContainer.style.display = 'none';
  });

  // Scan Questions from Current Form Page
  scanQuestionsBtn.addEventListener('click', async () => {
    const tab = await getActiveTab();
    if (!tab || !tab.url || !tab.url.includes('docs.google.com/forms')) {
      tabNotice.textContent = '⚠️ Cannot scan questions: Switch to a Google Form tab first.';
      tabNotice.classList.add('warning');
      return;
    }

    scanQuestionsBtn.disabled = true;
    scanQuestionsBtn.textContent = 'Scanning...';

    try {
      const response = await safeSendMessage(tab.id, { action: 'SCAN_QUESTIONS' });
      if (response && Array.isArray(response.titles) && response.titles.length > 0) {
        const existingKws = new Set(currentFixedAnswers.map(r => r.keyword.toLowerCase()));
        let addedCount = 0;

        for (const title of response.titles) {
          const cleanTitle = title.trim();
          if (cleanTitle && !existingKws.has(cleanTitle.toLowerCase())) {
            currentFixedAnswers.push({ keyword: cleanTitle, answer: '' });
            existingKws.add(cleanTitle.toLowerCase());
            addedCount++;
          }
        }

        renderFixedAnswers();
        saveFixedAnswers();
        tabNotice.textContent = `✓ Scanned ${response.titles.length} questions (${addedCount} new added).`;
        tabNotice.classList.remove('warning');
      } else {
        tabNotice.textContent = '⚠️ No visible question titles found on this page.';
        tabNotice.classList.add('warning');
      }
    } catch (err) {
      tabNotice.textContent = '⚠️ Could not read page questions. Refresh the form tab and retry.';
      tabNotice.classList.add('warning');
    } finally {
      scanQuestionsBtn.disabled = false;
      scanQuestionsBtn.textContent = '🔍 Scan Page';
    }
  });

  // Checkbox fallback toggle
  randomFallbackCheckbox.addEventListener('change', async (e) => {
    await chrome.storage.local.set({ useRandomFallback: e.target.checked });
  });

  // Total input change
  totalInput.addEventListener('change', async (e) => {
    const val = Math.max(1, parseInt(e.target.value, 10) || 10);
    totalInput.value = val;
    await chrome.storage.local.set({ total: val });
  });

  // Delay input change
  delayInput.addEventListener('change', async (e) => {
    const val = Math.max(0, parseFloat(e.target.value) || 2);
    delayInput.value = val;
    await chrome.storage.local.set({ delay: val });
  });

  // Start Button Click Handler
  startBtn.addEventListener('click', async () => {
    const tab = await getActiveTab();
    if (!tab || !tab.url || !tab.url.includes('docs.google.com/forms')) {
      tabNotice.textContent = '⚠️ Please open or switch to a Google Form tab first!';
      tabNotice.classList.add('warning');
      return;
    }

    const isAi = useAiToggle.checked;
    if (isAi) {
      const data = await chrome.storage.local.get(['apiKey']);
      if (!data.apiKey || !data.apiKey.trim()) {
        errorBanner.innerHTML = '⚠️ Gemini API key is missing. Please <a href="#" id="errLink" style="color: #c62828; font-weight: bold; text-decoration: underline;">Open Settings</a> and enter your API key to use AI mode.';
        errorBanner.style.display = 'block';
        document.getElementById('errLink')?.addEventListener('click', (ev) => {
          ev.preventDefault();
          chrome.runtime.openOptionsPage();
        });
        return;
      }
    }

    errorBanner.style.display = 'none';

    const total = Math.max(1, parseInt(totalInput.value, 10) || 10);
    const delay = Math.max(0, parseFloat(delayInput.value) || (isAi ? 4 : 2));
    const useRandomFallback = randomFallbackCheckbox.checked;
    const personaHint = personaHintInput.value.trim();

    const newState = {
      running: true,
      total: total,
      done: 0,
      delay: delay,
      fixedAnswers: currentFixedAnswers,
      useRandomFallback: useRandomFallback,
      useAiAnswers: isAi,
      personaHint: personaHint,
      statusMessage: `Starting (0 / ${total})...`,
      currentPageStatus: isAi ? 'Initializing AI model and reading form...' : 'Starting multi-page form...'
    };

    await chrome.storage.local.set(newState);
    updateUI(newState);

    // Safely send message with auto-injection
    await safeSendMessage(tab.id, { action: 'START' });
  });

  // Stop Button Click Handler
  stopBtn.addEventListener('click', async () => {
    const current = await chrome.storage.local.get(['done', 'total']);
    const done = current.done || 0;
    const total = current.total || 10;

    const stopState = {
      running: false,
      statusMessage: `Stopped (${done} / ${total})`,
      currentPageStatus: 'Stopped by user.'
    };

    await chrome.storage.local.set(stopState);
    updateUI(stopState);

    const tab = await getActiveTab();
    if (tab && tab.id) {
      await safeSendMessage(tab.id, { action: 'STOP' });
    }
  });

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      chrome.storage.local.get([
        'total',
        'delay',
        'running',
        'done',
        'statusMessage',
        'currentPageStatus',
        'useRandomFallback',
        'useAiAnswers',
        'personaHint',
        'apiKey'
      ], (data) => {
        updateUI(data);
      });
    }
  });

  // Initial load
  await loadState();
});
