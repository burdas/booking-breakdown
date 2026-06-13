(() => {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────
  let userSettings = {
    showTotal: true,
    showPerPerson: true,
    showPerNight: true,
    showPerNightPerPerson: true
  };

  let observer = null;

  // ── Observer helpers ───────────────────────────────────────────────────────
  function startObserver() {
    if (!observer) return;
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function stopObserver() {
    if (observer) observer.disconnect();
  }

  // ── Initialisation ─────────────────────────────────────────────────────────
  chrome.storage.local.get(Object.keys(userSettings), (result) => {
    if (chrome.runtime.lastError) {
      tryInject(); // proceed with defaults on error
      return;
    }
    Object.keys(userSettings).forEach(key => {
      if (result[key] !== undefined) userSettings[key] = result[key];
    });
    tryInject();
  });

  // Re-inject whenever the user changes settings in the popup
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    let changed = false;
    for (const key in changes) {
      if (key in userSettings) {
        userSettings[key] = changes[key].newValue;
        changed = true;
      }
    }
    if (changed) {
      stopObserver();
      document.querySelectorAll('.price-breakdown-extension').forEach(el => el.remove());
      tryInject();
      startObserver();
    }
  });

  // ── Utilities ─────────────────────────────────────────────────────────────
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  function getTotalPrice(priceElement) {
    const text = priceElement.textContent.trim();
    const match = text.match(/[\d.,]+/);
    if (!match) return NaN;
    let numStr = match[0];

    if (numStr.includes('.') && numStr.includes(',')) {
      const dotIdx = numStr.indexOf('.');
      const commaIdx = numStr.indexOf(',');
      numStr = dotIdx < commaIdx
        ? numStr.replace(/\./g, '').replace(',', '.')
        : numStr.replace(/,/g, '');
    } else if (numStr.includes(',')) {
      const parts = numStr.split(',');
      numStr = (parts.length === 2 && parts[1].length === 2)
        ? numStr.replace(',', '.')
        : numStr.replace(/,/g, '');
    } else if (numStr.includes('.')) {
      const parts = numStr.split('.');
      if (parts.length > 2 || parts[parts.length - 1].length !== 2) {
        numStr = numStr.replace(/\./g, '');
      }
    }
    return parseFloat(numStr);
  }

  function getCurrencyInfo(priceElement) {
    const text = priceElement.textContent.trim();
    const match = text.match(/([^\d\s,.-]+)/);
    const symbol = match ? match[1] : '€';
    const isPrefix = match ? text.startsWith(symbol) : false;
    return { symbol, isPrefix };
  }

  function formatPrice(val, currencyInfo) {
    const formatted = val.toFixed(2);
    return currencyInfo.isPrefix
      ? `${currencyInfo.symbol}${formatted}`
      : `${formatted} ${currencyInfo.symbol}`;
  }

  function getNightsAndPeople() {
    try {
      const params = new URLSearchParams(window.location.search);
      const checkin = params.get('checkin');
      const checkout = params.get('checkout');
      const adultsParam = params.get('group_adults') || '1';
      const childrenParam = params.get('group_children') || '0';

      const adults = adultsParam.split(',')
        .reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);
      const children = childrenParam.split(',')
        .reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);

      let nights = 1;
      if (checkin && checkout) {
        const diff = new Date(checkout).getTime() - new Date(checkin).getTime();
        if (diff > 0) nights = Math.round(diff / 86_400_000);
      }

      return {
        nights: Math.max(nights, 1),
        totalPeople: Math.max(adults + children, 1)
      };
    } catch {
      return { nights: 1, totalPeople: 1 };
    }
  }

  function getPriceContainer(priceElement) {
    const metadata = priceElement.closest('[data-testid="price-metadata"]');
    if (metadata) return metadata;

    let current = priceElement;
    for (let i = 0; i < 5; i++) {
      if (!current.parentElement) break;
      current = current.parentElement;
      if (
        current.querySelector('[data-testid="taxes-and-charges"]') ||
        current.textContent.includes('impuestos') ||
        current.textContent.includes('cargos') ||
        current.textContent.includes('taxes') ||
        current.textContent.includes('charges')
      ) return current;
    }
    return priceElement;
  }

  // ── Secure DOM builder (replaces innerHTML) ────────────────────────────────
  function buildRow(labelText, valueText, isMarquee = false) {
    const row = document.createElement('div');
    row.className = 'pbe-row';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'pbe-label' + (isMarquee ? ' pbe-marquee' : '');

    const textSpan = document.createElement('span');
    textSpan.className = 'pbe-text';
    textSpan.textContent = labelText; // textContent — never eval'd

    labelSpan.appendChild(textSpan);

    const strong = document.createElement('strong');
    strong.textContent = valueText; // textContent — never eval'd

    row.appendChild(labelSpan);
    row.appendChild(strong);
    return row;
  }

  // ── Main injection logic ───────────────────────────────────────────────────
  function tryInject() {
    try {
      const { nights, totalPeople } = getNightsAndPeople();

      const priceElements = document.querySelectorAll(
        '[data-testid="price-and-discounted-price"], .prco-valign-middle-helper'
      );

      const isDetailPage =
        window.location.pathname.includes('/hotel/') ||
        window.location.pathname.includes('hotel.html');
      const viewClass = isDetailPage ? 'pbe-detailed' : 'pbe-compact';

      priceElements.forEach(priceElement => {
        const totalPrice = getTotalPrice(priceElement);
        if (isNaN(totalPrice) || totalPrice <= 0) return;

        const insertionTarget = getPriceContainer(priceElement);
        const next = insertionTarget.nextElementSibling;
        const hasBreakdown = next && next.classList.contains('price-breakdown-extension');

        // Skip if already rendered with the same price
        if (hasBreakdown && parseFloat(next.dataset.totalPrice) === totalPrice) return;
        if (hasBreakdown) next.remove();

        const currencyInfo = getCurrencyInfo(priceElement);
        const perPerson = totalPrice / totalPeople;
        const perNight = totalPrice / nights;
        const perNightPerPerson = perNight / totalPeople;

        const container = document.createElement('div');
        container.className = `price-breakdown-extension ${viewClass}`;
        container.dataset.totalPrice = String(totalPrice);

        const fragment = document.createDocumentFragment();
        if (userSettings.showTotal)
          fragment.appendChild(buildRow('💰 Total:', formatPrice(totalPrice, currencyInfo)));
        if (userSettings.showPerPerson)
          fragment.appendChild(buildRow('👥 Por persona:', formatPrice(perPerson, currencyInfo)));
        if (userSettings.showPerNight)
          fragment.appendChild(buildRow('🌙 Por noche:', formatPrice(perNight, currencyInfo)));
        if (userSettings.showPerNightPerPerson)
          fragment.appendChild(buildRow('✨ Por noche/persona:', formatPrice(perNightPerPerson, currencyInfo), true));

        if (fragment.childElementCount === 0) return;
        container.appendChild(fragment);
        insertionTarget.insertAdjacentElement('afterend', container);
      });
    } catch (err) {
      console.error('[BookingBreakdown]', err);
    }
  }

  // ── MutationObserver (debounced, only on real DOM additions) ───────────────
  const debouncedInject = debounce(() => {
    stopObserver();
    tryInject();
    startObserver();
  }, 150);

  observer = new MutationObserver(mutations => {
    if (mutations.some(m => m.addedNodes.length > 0)) {
      debouncedInject();
    }
  });

  startObserver();
})();
