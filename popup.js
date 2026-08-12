'use strict';

const SETTINGS_KEYS = ['showTotal', 'showPerPerson', 'showPerNight', 'showPerNightPerPerson'];
const DEFAULT_ROW_ORDER = ['showTotal', 'showPerPerson', 'showPerNight', 'showPerNightPerPerson'];

function getOptionItem(key) {
  return document.querySelector(`.option-item[data-key="${key}"]`);
}

function applyRowOrder(order) {
  const list = document.getElementById('optionList');
  const items = order
    .map(getOptionItem)
    .filter(Boolean);
  DEFAULT_ROW_ORDER.forEach((key) => {
    const el = getOptionItem(key);
    if (el && !items.includes(el)) items.push(el);
  });
  items.forEach(el => list.appendChild(el));
}

function serializeRowOrder() {
  return [...document.querySelectorAll('#optionList .option-item')]
    .map(el => el.dataset.key)
    .filter(key => DEFAULT_ROW_ORDER.includes(key));
}

async function saveRowOrder() {
  try {
    await browser.storage.local.set({ rowOrder: serializeRowOrder() });
  } catch (e) {
    console.error('[BookingBreakdown] Failed to save row order:', e.message);
  }
}

function bindRowOrder() {
  const list = document.getElementById('optionList');
  if (!list) return;

  const WATCHDOG_MS = 1500;
  let dragging = null;
  let watchdog = null;

  const findHoverTarget = (x, y) => {
    for (const el of document.elementsFromPoint(x, y)) {
      const item = el.closest('.option-item');
      if (item && item !== dragging) return item;
    }
    return null;
  };

  const clearWatchdog = () => {
    if (watchdog) {
      clearTimeout(watchdog);
      watchdog = null;
    }
  };

  const armWatchdog = () => {
    clearWatchdog();
    watchdog = setTimeout(() => {
      if (dragging) endDrag();
    }, WATCHDOG_MS);
  };

  const onPointerMove = (e) => {
    if (!dragging) return;
    const target = findHoverTarget(e.clientX, e.clientY);
    if (target) {
      const rect = target.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      list.insertBefore(dragging, before ? target : target.nextSibling);
    }
    armWatchdog();
  };

  const endDrag = () => {
    if (!dragging) return;
    clearWatchdog();
    window.removeEventListener('pointermove', onPointerMove);
    document.body.style.userSelect = '';
    dragging.classList.remove('dragging');
    dragging = null;
    saveRowOrder();
  };

  const onPointerDown = (e) => {
    const handle = e.target.closest('.drag-handle');
    if (!handle) return;
    e.preventDefault();
    const item = handle.closest('.option-item');
    if (!item) return;
    dragging = item;
    item.classList.add('dragging');
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onPointerMove);
    armWatchdog();
  };

  list.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  window.addEventListener('mouseup', endDrag);
  window.addEventListener('blur', endDrag);
}

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
  const result = await browser.storage.local
    .get(['rowOrder'])
    .catch(() => ({ rowOrder: null }));
  applyRowOrder(Array.isArray(result.rowOrder) ? result.rowOrder : DEFAULT_ROW_ORDER);
  loadSettings(SETTINGS_KEYS);
  SETTINGS_KEYS.forEach(bindToggle);
  bindRowOrder();
  bindLanguageSelect();
});
