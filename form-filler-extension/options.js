// Options page script for FormPilot
// Supports Universal AI Providers: Google Gemini, OpenAI, Anthropic Claude, OpenRouter, Groq, and Custom OpenAI-compatible endpoints.

const PROVIDER_PRESETS = {
  gemini: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    keyPlaceholder: 'AIzaSy...',
    keyLinkText: 'Google AI Studio',
    keyLinkUrl: 'https://aistudio.google.com/app/apikey',
    defaultModel: 'gemini-3.8-flash',
    models: [
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Latest, Recommended)' },
      { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite (Fast & Lightweight)' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' }
    ]
  },
  openai: {
    name: 'OpenAI (ChatGPT)',
    baseUrl: 'https://api.openai.com/v1',
    keyPlaceholder: 'sk-proj-...',
    keyLinkText: 'OpenAI API Keys',
    keyLinkUrl: 'https://platform.openai.com/api-keys',
    defaultModel: 'gpt-4o-mini',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast & Cost-Efficient Vision)' },
      { id: 'gpt-4o', name: 'GPT-4o (Flagship Omni Vision)' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo with Vision' },
      { id: 'o1', name: 'o1 (Reasoning)' },
      { id: 'o3-mini', name: 'o3-mini' }
    ]
  },
  anthropic: {
    name: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    keyPlaceholder: 'sk-ant-...',
    keyLinkText: 'Anthropic Console',
    keyLinkUrl: 'https://console.anthropic.com/settings/keys',
    defaultModel: 'claude-3-5-sonnet-20241022',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (State-of-the-Art Vision)' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast & Lightweight)' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' }
    ]
  },
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyPlaceholder: 'sk-or-v1-...',
    keyLinkText: 'OpenRouter Keys',
    keyLinkUrl: 'https://openrouter.ai/keys',
    defaultModel: 'google/gemini-2.0-flash',
    models: [
      { id: 'google/gemini-2.0-flash', name: 'Google Gemini 2.0 Flash' },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Anthropic Claude 3.5 Sonnet' },
      { id: 'openai/gpt-4o', name: 'OpenAI GPT-4o' },
      { id: 'openai/gpt-4o-mini', name: 'OpenAI GPT-4o Mini' },
      { id: 'meta-llama/llama-3.2-11b-vision-instruct', name: 'Llama 3.2 11B Vision' },
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat (V3)' }
    ]
  },
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    keyPlaceholder: 'gsk_...',
    keyLinkText: 'Groq Console',
    keyLinkUrl: 'https://console.groq.com/keys',
    defaultModel: 'llama-3.2-11b-vision-preview',
    models: [
      { id: 'llama-3.2-11b-vision-preview', name: 'Llama 3.2 11B Vision (Ultra-Fast)' },
      { id: 'llama-3.2-90b-vision-preview', name: 'Llama 3.2 90B Vision' },
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' }
    ]
  },
  custom: {
    name: 'Custom / OpenAI-Compatible',
    baseUrl: 'https://api.deepseek.com/v1',
    keyPlaceholder: 'Enter custom API key / token (or none for Ollama)',
    keyLinkText: 'Custom Endpoint Documentation',
    keyLinkUrl: 'https://platform.openai.com/docs/api-reference',
    defaultModel: 'deepseek-chat',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat' },
      { id: 'llama3.2-vision', name: 'Llama 3.2 Vision (Ollama / Local)' },
      { id: 'llava', name: 'LLaVA (Local Vision)' }
    ]
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  const providerSelect = document.getElementById('providerSelect');
  const baseUrlGroup = document.getElementById('baseUrlGroup');
  const baseUrlInput = document.getElementById('baseUrlInput');
  const apiKeyLabel = document.getElementById('apiKeyLabel');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const apiKeyHelpText = document.getElementById('apiKeyHelpText');
  const apiKeyLink = document.getElementById('apiKeyLink');
  const toggleKeyVisibilityBtn = document.getElementById('toggleKeyVisibility');
  const modelSelect = document.getElementById('modelSelect');
  const customModelInput = document.getElementById('customModelInput');
  const refreshModelsBtn = document.getElementById('refreshModelsBtn');
  const modelWarningBanner = document.getElementById('modelWarningBanner');
  const temperatureInput = document.getElementById('temperatureInput');
  const temperatureValue = document.getElementById('temperatureValue');
  const saveBtn = document.getElementById('saveBtn');
  const testKeyBtn = document.getElementById('testKeyBtn');
  const statusBanner = document.getElementById('statusBanner');

  let currentSavedState = {
    aiProvider: 'gemini',
    apiKey: '',
    baseUrl: 'https://generativelanguage.googleapis.com',
    modelName: 'gemini-3.8-flash',
    temperature: 1.0
  };

  // Temperature slider listener
  if (temperatureInput && temperatureValue) {
    temperatureInput.addEventListener('input', () => {
      temperatureValue.textContent = parseFloat(temperatureInput.value).toFixed(2).replace(/\.00$/, '.0');
    });
  }

  // Update UI fields when provider changes
  function onProviderChanged(newProvider, preserveCustomModel = false) {
    const preset = PROVIDER_PRESETS[newProvider] || PROVIDER_PRESETS.gemini;

    // Show/hide base URL field
    if (newProvider === 'custom') {
      baseUrlGroup.style.display = 'block';
    } else {
      baseUrlGroup.style.display = 'none';
    }
    baseUrlInput.value = preset.baseUrl;

    // Update API Key labels & link
    apiKeyLabel.innerHTML = `${preset.name} API Key <span class="required">*</span>`;
    apiKeyInput.placeholder = preset.keyPlaceholder;
    apiKeyLink.href = preset.keyLinkUrl;
    apiKeyLink.textContent = preset.keyLinkText;

    // Populate model dropdown with presets
    modelSelect.innerHTML = '';
    for (const m of preset.models) {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.name} (${m.id})`;
      modelSelect.appendChild(opt);
    }

    if (!preserveCustomModel || !customModelInput.value.trim()) {
      customModelInput.value = preset.defaultModel;
      modelSelect.value = preset.defaultModel;
    } else {
      const target = customModelInput.value.trim();
      const match = Array.from(modelSelect.options).find(o => o.value === target);
      if (match) {
        modelSelect.value = target;
      }
    }
  }

  // When model dropdown is changed, update custom model text input
  modelSelect.addEventListener('change', () => {
    customModelInput.value = modelSelect.value;
    modelWarningBanner.style.display = 'none';
  });

  // When user types in custom model input, try matching dropdown
  customModelInput.addEventListener('input', () => {
    const val = customModelInput.value.trim();
    const match = Array.from(modelSelect.options).find(o => o.value === val);
    if (match) {
      modelSelect.value = val;
    }
  });

  // Switch Provider Event
  providerSelect.addEventListener('change', () => {
    onProviderChanged(providerSelect.value);
  });

  // Refresh Models List
  async function refreshModelsList(isUserAction = false) {
    const provider = providerSelect.value;
    const key = apiKeyInput.value.trim();
    const baseUrl = baseUrlInput.value.trim();

    if (!key && provider !== 'custom') {
      if (isUserAction) {
        showStatus('Please enter an API key first before refreshing models.', 'error');
        apiKeyInput.focus();
      }
      return;
    }

    refreshModelsBtn.disabled = true;
    const origHtml = refreshModelsBtn.innerHTML;
    refreshModelsBtn.innerHTML = '<span>⏳ Loading...</span>';

    try {
      const currentTarget = customModelInput.value.trim() || modelSelect.value;
      const response = await chrome.runtime.sendMessage({
        action: 'FETCH_MODELS',
        provider: provider,
        apiKey: key,
        baseUrl: baseUrl
      });

      if (response && response.success && Array.isArray(response.models) && response.models.length > 0) {
        modelSelect.innerHTML = '';
        let matched = false;

        for (const m of response.models) {
          const opt = document.createElement('option');
          opt.value = m.id;
          opt.textContent = `${m.displayName || m.id} (${m.id})`;
          if (m.id === currentTarget) {
            opt.selected = true;
            matched = true;
          }
          modelSelect.appendChild(opt);
        }

        if (!matched && response.models.length > 0) {
          const fallbackModel = response.models[0].id;
          customModelInput.value = fallbackModel;
          modelSelect.value = fallbackModel;
          modelWarningBanner.textContent = `⚠️ Model "${currentTarget}" was not in the provider catalog. Defaulting to "${fallbackModel}".`;
          modelWarningBanner.style.display = 'block';
        } else {
          modelWarningBanner.style.display = 'none';
        }

        if (isUserAction) {
          showStatus(`✓ Successfully fetched ${response.models.length} models for ${provider.toUpperCase()}.`, 'success');
        }
      } else {
        const errMsg = response && response.error ? response.error : 'Could not retrieve models list.';
        if (isUserAction) {
          showStatus(`Notice: ${errMsg} (You can still type any model name manually).`, 'info');
        }
      }
    } catch (err) {
      if (isUserAction) {
        showStatus(`Notice: ${err.message}`, 'info');
      }
    } finally {
      refreshModelsBtn.disabled = false;
      refreshModelsBtn.innerHTML = origHtml;
    }
  }

  refreshModelsBtn.addEventListener('click', async () => {
    await refreshModelsList(true);
  });

  // Load Saved Settings from chrome.storage.local
  try {
    const data = await chrome.storage.local.get([
      'aiProvider', 'apiKey', 'baseUrl', 'modelName', 'temperature'
    ]);

    const activeProvider = data.aiProvider || 'gemini';
    providerSelect.value = activeProvider;

    const preset = PROVIDER_PRESETS[activeProvider] || PROVIDER_PRESETS.gemini;
    onProviderChanged(activeProvider, true);

    if (data.apiKey) {
      apiKeyInput.value = data.apiKey;
    }

    if (data.baseUrl) {
      baseUrlInput.value = data.baseUrl;
    } else {
      baseUrlInput.value = preset.baseUrl;
    }

    if (data.modelName) {
      customModelInput.value = data.modelName;
      const match = Array.from(modelSelect.options).find(o => o.value === data.modelName);
      if (match) {
        modelSelect.value = data.modelName;
      }
    }

    if (data.temperature !== undefined) {
      const tempNum = parseFloat(data.temperature);
      temperatureInput.value = tempNum;
      temperatureValue.textContent = tempNum.toFixed(2).replace(/\.00$/, '.0');
    }

    currentSavedState = {
      aiProvider: activeProvider,
      apiKey: data.apiKey || '',
      baseUrl: baseUrlInput.value,
      modelName: customModelInput.value || preset.defaultModel,
      temperature: parseFloat(temperatureInput.value) || 1.0
    };
  } catch (err) {
    showStatus('Error loading saved configuration.', 'error');
  }

  // Toggle API key visibility (Show / Hide)
  toggleKeyVisibilityBtn.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      toggleKeyVisibilityBtn.textContent = '🔒';
      toggleKeyVisibilityBtn.title = 'Hide API key';
    } else {
      apiKeyInput.type = 'password';
      toggleKeyVisibilityBtn.textContent = '👁️';
      toggleKeyVisibilityBtn.title = 'Show API key';
    }
  });

  // Save Settings
  saveBtn.addEventListener('click', async () => {
    const provider = providerSelect.value;
    const key = apiKeyInput.value.trim();
    const model = customModelInput.value.trim() || modelSelect.value || PROVIDER_PRESETS[provider]?.defaultModel || 'gemini-3.8-flash';
    const baseUrl = baseUrlInput.value.trim() || PROVIDER_PRESETS[provider]?.baseUrl;
    const temp = parseFloat(temperatureInput.value) || 1.0;

    saveBtn.disabled = true;
    try {
      await chrome.storage.local.set({
        aiProvider: provider,
        apiKey: key,
        baseUrl: baseUrl,
        modelName: model,
        temperature: temp
      });
      showStatus(`✓ Settings saved for ${PROVIDER_PRESETS[provider]?.name || provider}.`, 'success');
    } catch (err) {
      showStatus('Failed to save settings: ' + err.message, 'error');
    } finally {
      saveBtn.disabled = false;
    }
  });

  // Test Key Connection
  testKeyBtn.addEventListener('click', async () => {
    const provider = providerSelect.value;
    const key = apiKeyInput.value.trim();
    const model = customModelInput.value.trim() || modelSelect.value || PROVIDER_PRESETS[provider]?.defaultModel || 'gemini-3.8-flash';
    const baseUrl = baseUrlInput.value.trim() || PROVIDER_PRESETS[provider]?.baseUrl;
    const temp = parseFloat(temperatureInput.value) || 1.0;

    if (!key && provider !== 'custom') {
      showStatus('Please enter an API key before testing.', 'error');
      apiKeyInput.focus();
      return;
    }

    testKeyBtn.disabled = true;
    saveBtn.disabled = true;
    showStatus(`Testing connection to ${PROVIDER_PRESETS[provider]?.name || provider} (${model})...`, 'info');

    try {
      await chrome.storage.local.set({
        aiProvider: provider,
        apiKey: key,
        baseUrl: baseUrl,
        modelName: model,
        temperature: temp
      });

      const response = await chrome.runtime.sendMessage({
        action: 'TEST_KEY',
        provider: provider,
        apiKey: key,
        modelName: model,
        baseUrl: baseUrl
      });

      if (response && response.success) {
        showStatus(`✓ Connected to ${PROVIDER_PRESETS[provider]?.name || provider} model "${model}" successfully!`, 'success');
      } else {
        const errorMsg = response && response.error ? response.error : 'Connection failed. Please verify credentials.';
        showStatus(`✗ Connection failed: ${errorMsg}`, 'error');
      }
    } catch (err) {
      showStatus(`✗ Test failed: ${err.message}`, 'error');
    } finally {
      testKeyBtn.disabled = false;
      saveBtn.disabled = false;
    }
  });

  function showStatus(message, type) {
    statusBanner.textContent = message;
    statusBanner.className = `status-banner ${type}`;
    statusBanner.style.display = 'block';
  }
});
