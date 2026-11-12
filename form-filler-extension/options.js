// Options page script for FormPilot
// Handles Gemini API key and model configuration with zero credential logging.

document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('apiKeyInput');
  const modelInput = document.getElementById('modelInput');
  const toggleKeyVisibilityBtn = document.getElementById('toggleKeyVisibility');
  const saveBtn = document.getElementById('saveBtn');
  const testKeyBtn = document.getElementById('testKeyBtn');
  const statusBanner = document.getElementById('statusBanner');

  // Load existing credentials
  try {
    const data = await chrome.storage.local.get(['apiKey', 'modelName']);
    if (data.apiKey) {
      apiKeyInput.value = data.apiKey;
    }
    if (data.modelName) {
      modelInput.value = data.modelName;
    } else {
      modelInput.value = 'gemini-2.5-flash';
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

  // Save Settings
  saveBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    const model = modelInput.value.trim() || 'gemini-2.5-flash';

    saveBtn.disabled = true;
    try {
      await chrome.storage.local.set({
        apiKey: key,
        modelName: model
      });
      showStatus('✓ Settings saved successfully.', 'success');
    } catch (err) {
      showStatus('Failed to save settings: ' + err.message, 'error');
    } finally {
      saveBtn.disabled = false;
    }
  });

  // Test Key Connection
  testKeyBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    const model = modelInput.value.trim() || 'gemini-2.5-flash';

    if (!key) {
      showStatus('Please enter an API key before testing.', 'error');
      apiKeyInput.focus();
      return;
    }

    testKeyBtn.disabled = true;
    saveBtn.disabled = true;
    showStatus('Testing connection to Gemini API...', 'info');

    try {
      // Also save the key and model if they haven't been saved yet
      await chrome.storage.local.set({
        apiKey: key,
        modelName: model
      });

      const response = await chrome.runtime.sendMessage({
        action: 'TEST_KEY',
        apiKey: key,
        modelName: model
      });

      if (response && response.success) {
        showStatus(`✓ Success! Connected to Gemini model "${model}". Key is valid and working.`, 'success');
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
