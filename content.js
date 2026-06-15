(() => {
  'use strict';

  const MS_PER_DAY = 86_400_000;

  const PRICE_SELECTORS =
    '[data-testid="price-and-discounted-price"], .prco-valign-middle-helper';

  const TAX_KEYWORDS = ['impuestos', 'cargos', 'taxes', 'charges'];

  const BREAKDOWN_LABELS = {
    total:          '💰 Total:',
    perPerson:      '👥 Por persona:',
    perNight:       '🌙 Por noche:',
    perNightPerson: '✨ Por noche/persona:',
  };

  const DEFAULT_SETTINGS = {
    showTotal:           true,
    showPerPerson:       true,
    showPerNight:        true,
    showPerNightPerPerson: true,
  };

  const state = {
    settings: { ...DEFAULT_SETTINGS },
    observer: null,
  };

  function startObserver() {
    if (!state.observer) return;
    state.observer.observe(document.body, { childList: true, subtree: true });
  }

  function stopObserver() {
    if (state.observer) state.observer.disconnect();
  }

  function normalizeNumberString(raw) {
    if (raw.includes('.') && raw.includes(',')) {
      const dotIdx   = raw.indexOf('.');
      const commaIdx = raw.indexOf(',');
      return dotIdx < commaIdx
        ? raw.replace(/\./g, '').replace(',', '.')   // European: 1.234,56
        : raw.replace(/,/g, '');                     // US: 1,234.56
    }

    if (raw.includes(',')) {
      const parts = raw.split(',');
      return (parts.length === 2 && parts[1].length === 2)
        ? raw.replace(',', '.')   // decimal comma: 1234,56
        : raw.replace(/,/g, ''); // thousands separator: 1,234,567
    }

    if (raw.includes('.')) {
      const parts = raw.split('.');
      if (parts.length > 2 || parts[parts.length - 1].length !== 2) {
        return raw.replace(/\./g, ''); // thousands separator: 1.234.567
      }
    }

    return raw;
  }

  function parsePriceFromElement(priceElement) {
    const text  = priceElement.textContent.trim();
    const match = text.match(/[\d.,]+/);
    if (!match) return NaN;
    return parseFloat(normalizeNumberString(match[0]));
  }

  function extractCurrencyInfo(priceElement) {
    const text   = priceElement.textContent.trim();
    const match  = text.match(/([^\d\s,.-]+)/);
    const symbol = match ? match[1] : '€';
    return { symbol, isPrefix: match ? text.startsWith(symbol) : false };
  }

  function formatPrice(value, currencyInfo) {
    const formatted = value.toFixed(2);
    return currencyInfo.isPrefix
      ? `${currencyInfo.symbol}${formatted}`
      : `${formatted} ${currencyInfo.symbol}`;
  }

  function parseStayInfoFromDom() {
    let nights = null;
    let totalPeople = null;
    const bodyText = document.body?.textContent || '';

    const nightMatch = bodyText.match(/(\d+)\s*(noches?|noche|night|nights)/i);
    if (nightMatch) nights = parseInt(nightMatch[1], 10);

    const adultsMatch = bodyText.match(/(\d+)\s*(adultos?|adulto|adult|adults)/i);
    const childrenMatch = bodyText.match(/(\d+)\s*(niños?|niño|child|children)/i);

    if (adultsMatch || childrenMatch) {
      const adults = adultsMatch ? parseInt(adultsMatch[1], 10) : 0;
      const children = childrenMatch ? parseInt(childrenMatch[1], 10) : 0;
      totalPeople = adults + children;
    } else {
      const guestsMatch = bodyText.match(/(\d+)\s*(huéspedes?|huésped|guests?|guest|personas?|persona)/i);
      if (guestsMatch) totalPeople = parseInt(guestsMatch[1], 10);
    }

    return { nights, totalPeople };
  }

  function parseStayInfo() {
    try {
      const params   = new URLSearchParams(window.location.search);
      const checkin  = params.get('checkin');
      const checkout = params.get('checkout');

      const parseGroupParam = (param, fallback) =>
        (params.get(param) || fallback)
          .split(',')
          .reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);

      const adults   = parseGroupParam('group_adults',   '0');
      const children = parseGroupParam('group_children', '0');

      let nights = 0;
      if (checkin && checkout) {
        const diff = new Date(checkout).getTime() - new Date(checkin).getTime();
        if (diff > 0) nights = Math.round(diff / MS_PER_DAY);
      }

      const fromUrl = {
        nights:      Math.max(nights, 0),
        totalPeople: Math.max(adults + children, 0),
      };

      if (fromUrl.nights > 0 && fromUrl.totalPeople > 0) return fromUrl;

      const domInfo = parseStayInfoFromDom();

      return {
        nights:      fromUrl.nights || domInfo.nights,
        totalPeople: fromUrl.totalPeople || domInfo.totalPeople,
      };
    } catch {
      try {
        return parseStayInfoFromDom();
      } catch {
        return null;
      }
    }
  }

  function findInsertionAnchor(priceElement) {
    const metadata = priceElement.closest('[data-testid="price-metadata"]');
    if (metadata) return metadata;

    let current = priceElement;
    for (let i = 0; i < 5; i++) {
      if (!current.parentElement) break;
      current = current.parentElement;
      const hasTaxInfo =
        current.querySelector('[data-testid="taxes-and-charges"]') ||
        TAX_KEYWORDS.some(kw => current.textContent.includes(kw));
      if (hasTaxInfo) return current;
    }
    return priceElement;
  }

  function buildRow(labelText, valueText, isMarquee = false) {
    const row = document.createElement('div');
    row.className = 'pbe-row';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'pbe-label' + (isMarquee ? ' pbe-marquee' : '');

    const textSpan = document.createElement('span');
    textSpan.className   = 'pbe-text';
    textSpan.textContent = labelText;
    labelSpan.appendChild(textSpan);

    const strong = document.createElement('strong');
    strong.textContent = valueText;

    row.appendChild(labelSpan);
    row.appendChild(strong);
    return row;
  }

  function buildBreakdownContainer(totalPrice, nights, totalPeople, currencyInfo, viewClass) {
    const { settings } = state;
    const fmt = (val) => formatPrice(val, currencyInfo);

    const fragment = document.createDocumentFragment();

    if (settings.showTotal)
      fragment.appendChild(buildRow(BREAKDOWN_LABELS.total, fmt(totalPrice)));
    if (settings.showPerPerson)
      fragment.appendChild(buildRow(BREAKDOWN_LABELS.perPerson, fmt(totalPrice / totalPeople)));
    if (settings.showPerNight)
      fragment.appendChild(buildRow(BREAKDOWN_LABELS.perNight, fmt(totalPrice / nights)));
    if (settings.showPerNightPerPerson)
      fragment.appendChild(buildRow(BREAKDOWN_LABELS.perNightPerson, fmt(totalPrice / nights / totalPeople), true));

    if (fragment.childElementCount === 0) return null;

    const container = document.createElement('div');
    container.className        = `price-breakdown-extension ${viewClass}`;
    container.dataset.totalPrice = String(totalPrice);
    container.appendChild(fragment);
    return container;
  }

  function isDetailPage() {
    const { pathname } = window.location;
    return pathname.includes('/hotel/') || pathname.includes('hotel.html');
  }

  function injectBreakdown(priceElement, stayInfo) {
    const totalPrice = parsePriceFromElement(priceElement);
    if (isNaN(totalPrice) || totalPrice <= 0) return;

    const anchor    = findInsertionAnchor(priceElement);
    const nextEl    = anchor.nextElementSibling;
    const hasWidget = nextEl && nextEl.classList.contains('price-breakdown-extension');

    if (hasWidget && parseFloat(nextEl.dataset.totalPrice) === totalPrice) return;
    if (hasWidget) nextEl.remove();

    const viewClass    = isDetailPage() ? 'pbe-detailed' : 'pbe-compact';
    const currencyInfo = extractCurrencyInfo(priceElement);
    const container    = buildBreakdownContainer(
      totalPrice, stayInfo.nights, stayInfo.totalPeople, currencyInfo, viewClass
    );

    if (container) anchor.insertAdjacentElement('afterend', container);
  }

  function injectAllBreakdowns() {
    try {
      const stayInfo      = parseStayInfo();
      if (!stayInfo || !stayInfo.nights || !stayInfo.totalPeople) return;
      const priceElements = document.querySelectorAll(PRICE_SELECTORS);
      priceElements.forEach(el => injectBreakdown(el, stayInfo));
    } catch (err) {
      console.error('[BookingBreakdown]', err);
    }
  }

  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  browser.storage.local.get(Object.keys(DEFAULT_SETTINGS))
    .then((result) => {
      Object.keys(DEFAULT_SETTINGS).forEach((key) => {
        if (result[key] !== undefined) state.settings[key] = result[key];
      });
    })
    .catch(() => {})
    .finally(() => injectAllBreakdowns());

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;

    let changed = false;
    for (const key in changes) {
      if (key in state.settings) {
        state.settings[key] = changes[key].newValue;
        changed = true;
      }
    }

    if (!changed) return;

    stopObserver();
    document.querySelectorAll('.price-breakdown-extension').forEach(el => el.remove());
    injectAllBreakdowns();
    startObserver();
  });

  const debouncedInject = debounce(() => {
    stopObserver();
    injectAllBreakdowns();
    startObserver();
  }, 150);

  state.observer = new MutationObserver((mutations) => {
    if (mutations.some(m => m.addedNodes.length > 0)) {
      debouncedInject();
    }
  });

  startObserver();
})();
