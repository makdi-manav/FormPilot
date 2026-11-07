// Background service worker for Google Forms Auto-Filler
// Handles initialization and keeps state synchronized.

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(['total', 'delay', 'fixedAnswers', 'running', 'done']);
  const defaults = {};

  if (existing.total === undefined) defaults.total = 10;
  if (existing.delay === undefined) defaults.delay = 2;
  if (!existing.fixedAnswers || !Array.isArray(existing.fixedAnswers) || existing.fixedAnswers.length === 0) {
    defaults.fixedAnswers = [{ keyword: 'resident', answer: 'Yes' }];
  }
  if (existing.running === undefined) defaults.running = false;
  if (existing.done === undefined) defaults.done = 0;
  defaults.statusMessage = 'Ready';

  if (Object.keys(defaults).length > 0) {
    await chrome.storage.local.set(defaults);
  }
  console.log('[FormFiller Service Worker] Initialized with default settings.');
});
