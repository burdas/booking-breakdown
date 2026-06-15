'use strict';

const SETTINGS_KEYS = ['showTotal', 'showPerPerson', 'showPerNight', 'showPerNightPerPerson'];

async function loadSettings(keys) {
  try {
    const result = await browser.storage.local.get(keys);
    keys.forEach((key) => {
      const checkbox = document.getElementById(key);
      if (checkbox) checkbox.checked = result[key] !== false;
    });
  } catch (e) {
    console.error('[BookingBreakdown] Failed to load settings:', e.message);
  }
}

function bindToggle(key) {
  const checkbox = document.getElementById(key);
  if (!checkbox) return;

  checkbox.addEventListener('change', async (e) => {
    try {
      await browser.storage.local.set({ [key]: e.target.checked });
    } catch (e) {
      console.error('[BookingBreakdown] Failed to save setting:', e.message);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadSettings(SETTINGS_KEYS);
  SETTINGS_KEYS.forEach(bindToggle);
});
