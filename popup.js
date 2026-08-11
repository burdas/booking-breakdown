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

function renderTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = I18n.t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', I18n.t(el.dataset.i18nAria));
  });
  document.documentElement.lang = I18n.current;
}

function bindLanguageSelect() {
  const select = document.getElementById('languageSelect');
  if (!select) return;

  browser.storage.local.get({ language: 'auto' })
    .then((result) => {
      select.value = result.language === 'es' || result.language === 'en' ? result.language : 'auto';
    })
    .catch(() => {
      select.value = 'auto';
    });

  select.addEventListener('change', async () => {
    try {
      await browser.storage.local.set({ language: select.value });
    } catch (e) {
      console.error('[BookingBreakdown] Failed to save language:', e.message);
    }
    await I18n.resolveLanguage();
    renderTranslations();
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await I18n.resolveLanguage();
  renderTranslations();
  loadSettings(SETTINGS_KEYS);
  SETTINGS_KEYS.forEach(bindToggle);
  bindLanguageSelect();
});
