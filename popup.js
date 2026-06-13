'use strict';

const SETTINGS_KEYS = ['showTotal', 'showPerPerson', 'showPerNight', 'showPerNightPerPerson'];

function loadSettings(keys) {
  chrome.storage.local.get(keys, (result) => {
    if (chrome.runtime.lastError) {
      console.error('[BookingBreakdown] Failed to load settings:', chrome.runtime.lastError.message);
      return;
    }
    keys.forEach((key) => {
      const checkbox = document.getElementById(key);
      if (checkbox) checkbox.checked = result[key] !== false;
    });
  });
}

function bindToggle(key) {
  const checkbox = document.getElementById(key);
  if (!checkbox) return;

  checkbox.addEventListener('change', (e) => {
    chrome.storage.local.set({ [key]: e.target.checked }, () => {
      if (chrome.runtime.lastError) {
        console.error('[BookingBreakdown] Failed to save setting:', chrome.runtime.lastError.message);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadSettings(SETTINGS_KEYS);
  SETTINGS_KEYS.forEach(bindToggle);
});
