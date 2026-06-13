console.log('Booking Price Breakdown: Extensión cargada correctamente.');

function getTotalPrice(priceElement) {
  // Limpia el texto: quita símbolos de moneda, espacios, etc.
  // Admite decimales con punto o coma
  const priceText = priceElement.textContent
    .replace(/[^\d,.]/g, '')
    .replace(',', '');

  return parseFloat(priceText);
}

function getNightsAndPeople() {
  const params = new URLSearchParams(window.location.search);

  const checkin = params.get('checkin');
  const checkout = params.get('checkout');
  const adultsParam = params.get('group_adults') || '1';
  const childrenParam = params.get('group_children') || '0';

  // Soporta múltiples habitaciones (p.ej. group_adults=2,2)
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

    // Encontrar todos los elementos de precio en la página (búsquedas o ficha de hotel)
    const priceElements = document.querySelectorAll(
      '[data-testid="price-and-discounted-price"], .prco-valign-middle-helper, [data-testid="price-and-discounted-price"] span'
    );

    priceElements.forEach(priceElement => {
      // Evitamos procesar elementos anidados que tengan el mismo texto
      if (priceElement.querySelector('[data-testid="price-and-discounted-price"]')) {
        return;
      }

      const totalPrice = getTotalPrice(priceElement);
      if (isNaN(totalPrice) || totalPrice <= 0) return;

      // Buscar si ya hemos inyectado el desglose justo después de este elemento
      const existing = priceElement.nextElementSibling;
      const hasBreakdown = existing && existing.classList.contains('price-breakdown-extension');

      // Si ya está inyectado y el precio no ha cambiado, no hacemos nada
      if (hasBreakdown && parseFloat(existing.dataset.totalPrice) === totalPrice) {
        return;
      }

      // Si el precio cambió, eliminamos el desglose anterior
      if (hasBreakdown) {
        existing.remove();
      }

      // Detecta la divisa del texto original del precio
      let currencySymbol = '€';
      const match = priceElement.textContent.match(/([^\d\s,.]+)/);
      if (match) {
        currencySymbol = match[1];
      }

      const perPerson = totalPrice / totalPeople;
      const perNight = totalPrice / nights;
      const perNightPerPerson = perNight / totalPeople;

      const container = document.createElement('div');
      container.className = 'price-breakdown-extension';
      container.dataset.totalPrice = totalPrice;
      container.innerHTML = `
        <div class="pbe-row"><span>Total:</span><strong>${totalPrice.toFixed(2)} ${currencySymbol}</strong></div>
        <div class="pbe-row"><span>Por persona:</span><strong>${perPerson.toFixed(2)} ${currencySymbol}</strong></div>
        <div class="pbe-row"><span>Por noche:</span><strong>${perNight.toFixed(2)} ${currencySymbol}</strong></div>
        <div class="pbe-row"><span>Por noche/persona:</span><strong>${perNightPerPerson.toFixed(2)} ${currencySymbol}</strong></div>
      `;

      priceElement.insertAdjacentElement('afterend', container);
    });
  } catch (error) {
    console.error('Error al inyectar desglose de precios:', error);
  }
}

const observer = new MutationObserver(() => {
  tryInject();
});

observer.observe(document.body, { childList: true, subtree: true });

// Intento inicial al cargar
tryInject();
