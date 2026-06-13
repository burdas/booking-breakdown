document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const SETTINGS_KEYS = ['showTotal', 'showPerPerson', 'showPerNight', 'showPerNightPerPerson'];

  // Load saved settings; default to true if key is absent
  chrome.storage.local.get(SETTINGS_KEYS, (result) => {
    if (chrome.runtime.lastError) {
      console.error('[BookingBreakdown] Failed to load settings:', chrome.runtime.lastError.message);
      return;
    }
    SETTINGS_KEYS.forEach((key) => {
      const checkbox = document.getElementById(key);
      if (checkbox) checkbox.checked = result[key] !== false;
    });
  });

  // Persist each toggle and report errors via lastError
  SETTINGS_KEYS.forEach((key) => {
    const checkbox = document.getElementById(key);
    if (!checkbox) return;

    checkbox.addEventListener('change', (e) => {
      chrome.storage.local.set({ [key]: e.target.checked }, () => {
        if (chrome.runtime.lastError) {
          console.error('[BookingBreakdown] Failed to save setting:', chrome.runtime.lastError.message);
        }
      });
    });
  });
});
