// Options page script for FormPilot
// Handles Gemini API key, dynamic model discovery, temperature, and configuration with zero credential logging.

document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('apiKeyInput');
  const modelSelect = document.getElementById('modelSelect');
  const refreshModelsBtn = document.getElementById('refreshModelsBtn');
  const modelWarningBanner = document.getElementById('modelWarningBanner');
  const temperatureInput = document.getElementById('temperatureInput');
  const temperatureValue = document.getElementById('temperatureValue');
  const toggleKeyVisibilityBtn = document.getElementById('toggleKeyVisibility');
  const saveBtn = document.getElementById('saveBtn');
  const testKeyBtn = document.getElementById('testKeyBtn');
  const statusBanner = document.getElementById('statusBanner');

  let savedModelName = 'gemini-2.5-flash';

  // Temperature slider listener
  if (temperatureInput && temperatureValue) {
    temperatureInput.addEventListener('input', () => {
      temperatureValue.textContent = parseFloat(temperatureInput.value).toFixed(2).replace(/\.00$/, '.0');
    });
  }

  // Render model list into dropdown
  function populateModelDropdown(models, targetModel) {
    if (!models || !Array.isArray(models) || models.length === 0) return false;

    modelSelect.innerHTML = '';
    let found = false;

    for (const m of models) {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.displayName || m.id} (${m.id})`;
      if (m.id === targetModel) {
        opt.selected = true;
        found = true;
      }
      modelSelect.appendChild(opt);
    }

    if (!found && models.length > 0) {
      const fallbackModel = models[0].id;
      modelSelect.value = fallbackModel;
      modelWarningBanner.textContent = `⚠️ Saved model "${targetModel}" was not found in the list. Falling back to "${fallbackModel}".`;
      modelWarningBanner.style.display = 'block';
      return false;
    } else {
      modelWarningBanner.style.display = 'none';
      return true;
    }
  }

  // Fetch models from Gemini API via background service worker
  async function refreshModelsList(keyToUse, isUserAction = false) {
    let key = keyToUse || apiKeyInput.value.trim();
    if (!key) {
      const stored = await chrome.storage.local.get(['apiKey']);
      if (stored.apiKey) {
        key = stored.apiKey;
        apiKeyInput.value = key;
      }
    }

    if (!key) {
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
      const currentTarget = modelSelect.value || savedModelName;
      const response = await chrome.runtime.sendMessage({
        action: 'FETCH_MODELS',
        apiKey: key
      });

      if (response && response.success && Array.isArray(response.models) && response.models.length > 0) {
        await chrome.storage.local.set({ cachedModels: response.models });
        const isMatched = populateModelDropdown(response.models, currentTarget);
        if (isMatched) {
          savedModelName = modelSelect.value;
        } else {
          savedModelName = response.models[0].id;
          await chrome.storage.local.set({ modelName: savedModelName });
        }

        if (isUserAction) {
          showStatus(`✓ Successfully refreshed ${response.models.length} models from Gemini API.`, 'success');
        }
      } else {
        const errMsg = response && response.error ? response.error : 'Could not retrieve models list.';
        if (isUserAction) {
          showStatus(`Failed to refresh models: ${errMsg}`, 'error');
        }
      }
    } catch (err) {
      if (isUserAction) {
        showStatus(`Error fetching models: ${err.message}`, 'error');
      }
    } finally {
      refreshModelsBtn.disabled = false;
      refreshModelsBtn.innerHTML = origHtml;
    }
  }

  // Load existing credentials & preferences
  try {
    const data = await chrome.storage.local.get([
      'apiKey', 'modelName', 'temperature', 'cachedModels'
    ]);

    if (data.apiKey) {
      apiKeyInput.value = data.apiKey;
    }

    if (data.modelName) {
      savedModelName = data.modelName;
    }

    if (data.temperature !== undefined) {
      const tempNum = parseFloat(data.temperature);
      temperatureInput.value = tempNum;
      temperatureValue.textContent = tempNum.toFixed(2).replace(/\.00$/, '.0');
    }

    // Populate from cache if available, then refresh in background if key exists
    if (data.cachedModels && Array.isArray(data.cachedModels) && data.cachedModels.length > 0) {
      populateModelDropdown(data.cachedModels, savedModelName);
    } else {
      modelSelect.value = savedModelName;
    }

    if (data.apiKey) {
      refreshModelsList(data.apiKey, false);
    }
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

  // Manual Refresh Models Button
  refreshModelsBtn.addEventListener('click', async () => {
    await refreshModelsList(apiKeyInput.value.trim(), true);
  });

  // Save Settings
  saveBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    const model = modelSelect.value || 'gemini-2.5-flash';
    const temp = parseFloat(temperatureInput.value) || 1.0;

    saveBtn.disabled = true;
    try {
      await chrome.storage.local.set({
        apiKey: key,
        modelName: model,
        temperature: temp
      });
      savedModelName = model;
      showStatus('✓ Settings saved successfully.', 'success');

      // Refresh model list with new key if models are empty or key changed
      if (key) {
        refreshModelsList(key, false);
      }
    } catch (err) {
      showStatus('Failed to save settings: ' + err.message, 'error');
    } finally {
      saveBtn.disabled = false;
    }
  });

  // Test Key Connection
  testKeyBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    const model = modelSelect.value || 'gemini-2.5-flash';
    const temp = parseFloat(temperatureInput.value) || 1.0;

    if (!key) {
      showStatus('Please enter an API key before testing.', 'error');
      apiKeyInput.focus();
      return;
    }

    testKeyBtn.disabled = true;
    saveBtn.disabled = true;
    showStatus('Testing connection to Gemini API...', 'info');

    try {
      await chrome.storage.local.set({
        apiKey: key,
        modelName: model,
        temperature: temp
      });

      const response = await chrome.runtime.sendMessage({
        action: 'TEST_KEY',
        apiKey: key,
        modelName: model
      });

      if (response && response.success) {
        showStatus(`✓ Success! Connected to Gemini model "${model}". Key is valid and working.`, 'success');
        // Automatically refresh models list after valid key test
        refreshModelsList(key, false);
      } else {
        const errorMsg = response && response.error ? response.error : 'Connection failed. Please verify your API key.';
        showStatus(`✗ Error: ${errorMsg}`, 'error');
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
