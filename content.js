console.log('Booking Price Breakdown: Extensión cargada correctamente.');

let userSettings = {
  showTotal: true,
  showPerPerson: true,
  showPerNight: true,
  showPerNightPerPerson: true
};

// Carga inicial de preferencias
chrome.storage.local.get(Object.keys(userSettings), (result) => {
  Object.keys(userSettings).forEach(key => {
    if (result[key] !== undefined) {
      userSettings[key] = result[key];
    }
  });
  tryInject();
});

// Escuchar cambios en la configuración y actualizar inmediatamente
chrome.storage.onChanged.addListener((changes) => {
  let changed = false;
  for (let key in changes) {
    if (userSettings[key] !== undefined) {
      userSettings[key] = changes[key].newValue;
      changed = true;
    }
  }
  if (changed) {
    document.querySelectorAll('.price-breakdown-extension').forEach(el => el.remove());
    tryInject();
  }
});

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function getTotalPrice(priceElement) {
  let text = priceElement.textContent.trim();
  const match = text.match(/[\d.,]+/);
  if (!match) return NaN;
  let numStr = match[0];
  
  if (numStr.includes('.') && numStr.includes(',')) {
    const dotIdx = numStr.indexOf('.');
    const commaIdx = numStr.indexOf(',');
    if (dotIdx < commaIdx) {
      numStr = numStr.replace(/\./g, '').replace(',', '.');
    } else {
      numStr = numStr.replace(/,/g, '');
    }
  } else if (numStr.includes(',')) {
    const parts = numStr.split(',');
    const lastPart = parts[parts.length - 1];
    if (parts.length === 2 && lastPart.length === 2) {
      numStr = numStr.replace(',', '.');
    } else {
      numStr = numStr.replace(/,/g, '');
    }
  } else if (numStr.includes('.')) {
    const parts = numStr.split('.');
    const lastPart = parts[parts.length - 1];
    if (parts.length > 2 || lastPart.length !== 2) {
      numStr = numStr.replace(/\./g, '');
    }
  }
  return parseFloat(numStr);
}

function getCurrencyInfo(priceElement) {
  const text = priceElement.textContent.trim();
  const currencyMatch = text.match(/([^\d\s,.-]+)/);
  let symbol = '€';
  let isPrefix = false;
  
  if (currencyMatch) {
    symbol = currencyMatch[1];
    if (text.startsWith(symbol)) {
      isPrefix = true;
    }
  }
  return { symbol, isPrefix };
}

function formatPrice(val, currencyInfo) {
  const formattedVal = val.toFixed(2);
  return currencyInfo.isPrefix 
    ? `${currencyInfo.symbol}${formattedVal}`
    : `${formattedVal} ${currencyInfo.symbol}`;
}

function getNightsAndPeople() {
  const params = new URLSearchParams(window.location.search);

  const checkin = params.get('checkin');
  const checkout = params.get('checkout');
  const adultsParam = params.get('group_adults') || '1';
  const childrenParam = params.get('group_children') || '0';

  const adults = adultsParam.split(',').reduce((sum, val) => sum + parseInt(val || '0', 10), 0);
  const children = childrenParam.split(',').reduce((sum, val) => sum + parseInt(val || '0', 10), 0);

  let nights = 1;
  if (checkin && checkout) {
    const d1 = new Date(checkin);
    const d2 = new Date(checkout);
    nights = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
  }

  const totalPeople = adults + children;

  return { nights, totalPeople };
}

function tryInject() {
  try {
    const { nights, totalPeople } = getNightsAndPeople();
    if (nights <= 0 || totalPeople <= 0) return;

    const priceElements = document.querySelectorAll(
      '[data-testid="price-and-discounted-price"], .prco-valign-middle-helper, [data-testid="price-and-discounted-price"] span'
    );

    const isDetailPage = window.location.pathname.includes('/hotel/') || window.location.pathname.includes('hotel.html');
    const viewClass = isDetailPage ? 'pbe-detailed' : 'pbe-compact';

    priceElements.forEach(priceElement => {
      if (priceElement.querySelector('[data-testid="price-and-discounted-price"]')) {
        return;
      }

      const totalPrice = getTotalPrice(priceElement);
      if (isNaN(totalPrice) || totalPrice <= 0) return;

      const existing = priceElement.nextElementSibling;
      const hasBreakdown = existing && existing.classList.contains('price-breakdown-extension');

      if (hasBreakdown && parseFloat(existing.dataset.totalPrice) === totalPrice) {
        return;
      }

      if (hasBreakdown) {
        existing.remove();
      }

      const currencyInfo = getCurrencyInfo(priceElement);

      const perPerson = totalPrice / totalPeople;
      const perNight = totalPrice / nights;
      const perNightPerPerson = perNight / totalPeople;

      const container = document.createElement('div');
      container.className = `price-breakdown-extension ${viewClass}`;
      container.dataset.totalPrice = totalPrice;

      let htmlContent = '';
      
      if (userSettings.showTotal) {
        htmlContent += `<div class="pbe-row"><span class="pbe-label"><span class="pbe-text">💰 Total:</span></span><strong>${formatPrice(totalPrice, currencyInfo)}</strong></div>`;
      }
      if (userSettings.showPerPerson) {
        htmlContent += `<div class="pbe-row"><span class="pbe-label"><span class="pbe-text">👥 Por persona:</span></span><strong>${formatPrice(perPerson, currencyInfo)}</strong></div>`;
      }
      if (userSettings.showPerNight) {
        htmlContent += `<div class="pbe-row"><span class="pbe-label"><span class="pbe-text">🌙 Por noche:</span></span><strong>${formatPrice(perNight, currencyInfo)}</strong></div>`;
      }
      if (userSettings.showPerNightPerPerson) {
        htmlContent += `<div class="pbe-row"><span class="pbe-label pbe-marquee"><span class="pbe-text">✨ Por noche/persona:</span></span><strong>${formatPrice(perNightPerPerson, currencyInfo)}</strong></div>`;
      }

      // Si no hay nada seleccionado, no insertamos el contenedor
      if (htmlContent === '') return;

      container.innerHTML = htmlContent;
      priceElement.insertAdjacentElement('afterend', container);
    });
  } catch (error) {
    console.error('Error al inyectar desglose de precios:', error);
  }
}

// Observador con debounce de 150ms para evitar sobrecarga del DOM
const debouncedInject = debounce(tryInject, 150);
const observer = new MutationObserver(() => {
  debouncedInject();
});

observer.observe(document.body, { childList: true, subtree: true });

