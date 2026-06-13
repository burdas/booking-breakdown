# Extensión de navegador: Desglose de precios de Booking

Guía paso a paso para crear una extensión de Chrome/Edge (Manifest V3) que extrae el precio total de una página de Booking.com y muestra un desglose:

- Precio total
- Precio por persona
- Precio por noche
- Precio por noche y por persona

---

## 1. Estructura del proyecto

Crea una carpeta con estos archivos:

```
booking-price-breakdown/
├── manifest.json
├── content.js
└── styles.css
```

---

## 2. manifest.json

Define los metadatos de la extensión y le dice al navegador que inyecte tu script automáticamente en las páginas de Booking.

```json
{
  "manifest_version": 3,
  "name": "Booking Price Breakdown",
  "version": "1.0",
  "description": "Desglosa el precio total en precio por persona, por noche, etc.",
  "permissions": [],
  "content_scripts": [
    {
      "matches": ["https://*.booking.com/*"],
      "js": ["content.js"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ]
}
```

**Notas:**
- `content_scripts` hace que `content.js` se ejecute automáticamente en cualquier URL que coincida con `matches`, sin que el usuario tenga que hacer clic en ningún icono.
- `run_at: "document_idle"` espera a que la página esté "tranquila" antes de ejecutar el script, pero como Booking carga contenido de forma dinámica, más adelante añadiremos un `MutationObserver` para cubrir los casos en que el precio aparece más tarde.

---

## 3. Extraer los datos de la página (content.js – parte 1)

Lo más delicado es localizar correctamente:

1. El elemento HTML que contiene el precio total.
2. El número de noches.
3. El número de personas (adultos + niños).

### 3.1 Localizar el precio total

Los selectores de Booking cambian con frecuencia porque usan clases generadas automáticamente (hashes tipo `css-1a2b3c`). Por eso es preferible buscar atributos semánticos como `data-testid` o `aria-*`, que son más estables.

Pasos para encontrar el selector correcto:

1. Abre una página de hotel en Booking.com.
2. Haz clic derecho sobre el precio total → "Inspeccionar".
3. Busca en el HTML un atributo como `data-testid="price-and-discounted-price"` o similar.
4. Si no hay `data-testid`, anota la clase CSS más específica y estable que encuentres como alternativa.

```javascript
function getPriceElement() {
  return document.querySelector('[data-testid="price-and-discounted-price"]')
    || document.querySelector('.prco-valign-middle-helper');
}

function getTotalPrice(priceElement) {
  // Limpia el texto: quita símbolos de moneda, espacios, etc.
  const priceText = priceElement.textContent
    .replace(/[^\d,.]/g, '')
    .replace(',', '');

  return parseFloat(priceText);
}
```

### 3.2 Obtener noches y personas

Booking suele incluir estos datos como parámetros en la URL de búsqueda (`checkin`, `checkout`, `group_adults`, `group_children`):

```javascript
function getNightsAndPeople() {
  const params = new URLSearchParams(window.location.search);

  const checkin = params.get('checkin');
  const checkout = params.get('checkout');
  const adults = parseInt(params.get('group_adults') || '1', 10);
  const children = parseInt(params.get('group_children') || '0', 10);

  let nights = 1;
  if (checkin && checkout) {
    const d1 = new Date(checkin);
    const d2 = new Date(checkout);
    nights = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
  }

  const totalPeople = adults + children;

  return { nights, totalPeople };
}
```

### 3.3 Función principal de extracción

```javascript
function extractData() {
  const priceElement = getPriceElement();
  if (!priceElement) return null;

  const totalPrice = getTotalPrice(priceElement);
  const { nights, totalPeople } = getNightsAndPeople();

  if (isNaN(totalPrice) || nights <= 0 || totalPeople <= 0) return null;

  return { priceElement, totalPrice, nights, totalPeople };
}
```

---

## 4. Calcular y mostrar el desglose (content.js – parte 2)

```javascript
function injectBreakdown(data) {
  const { priceElement, totalPrice, nights, totalPeople } = data;

  const perPerson = totalPrice / totalPeople;
  const perNight = totalPrice / nights;
  const perNightPerPerson = perNight / totalPeople;

  const container = document.createElement('div');
  container.className = 'price-breakdown-extension';
  container.innerHTML = `
    <div class="pbe-row"><span>Total:</span><strong>${totalPrice.toFixed(2)} €</strong></div>
    <div class="pbe-row"><span>Por persona:</span><strong>${perPerson.toFixed(2)} €</strong></div>
    <div class="pbe-row"><span>Por noche:</span><strong>${perNight.toFixed(2)} €</strong></div>
    <div class="pbe-row"><span>Por noche/persona:</span><strong>${perNightPerPerson.toFixed(2)} €</strong></div>
  `;

  priceElement.insertAdjacentElement('afterend', container);
}
```

---

## 5. Manejar contenido dinámico (SPA)

Booking carga gran parte del contenido mediante JavaScript después de la carga inicial, y a veces navega entre páginas sin recargar (comportamiento de SPA). Para asegurarnos de que el desglose aparece (y se actualiza si cambian las fechas/huéspedes), usamos un `MutationObserver`:

```javascript
let injected = false;
let lastPrice = null;

function tryInject() {
  const data = extractData();
  if (!data) return;

  // Si ya está inyectado pero el precio ha cambiado (cambio de fechas/huéspedes),
  // eliminamos el anterior y volvemos a inyectar
  if (injected && data.totalPrice === lastPrice) return;

  const existing = document.querySelector('.price-breakdown-extension');
  if (existing) existing.remove();

  injectBreakdown(data);
  injected = true;
  lastPrice = data.totalPrice;
}

const observer = new MutationObserver(() => {
  tryInject();
});

observer.observe(document.body, { childList: true, subtree: true });

// Intento inicial al cargar
tryInject();
```

---

## 6. Estilos (styles.css)

```css
.price-breakdown-extension {
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 8px 12px;
  margin-top: 6px;
  background: #f5f9ff;
  font-size: 13px;
  font-family: Arial, sans-serif;
}

.pbe-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 0;
}

.pbe-row strong {
  color: #0071c2;
}
```

---

## 7. Cargar la extensión en el navegador para probarla

1. Abre `chrome://extensions` (o `edge://extensions` en Edge).
2. Activa el **"Modo de desarrollador"** (interruptor arriba a la derecha).
3. Haz clic en **"Cargar descomprimida"** (Load unpacked).
4. Selecciona la carpeta `booking-price-breakdown`.
5. Ve a una página de hotel en Booking.com.
6. Abre las DevTools (F12) → pestaña "Console" para ver errores y depurar.

Cada vez que modifiques `content.js`, recuerda pulsar el botón de **recargar** en `chrome://extensions` y refrescar la página de Booking.

---

## 8. Notas prácticas y casos a tener en cuenta

### Selectores frágiles
Los nombres de clase de Booking suelen ser hashes generados automáticamente y cambian con actualizaciones del sitio. Prioriza siempre atributos `data-testid` o `aria-*`. Si tu selector deja de funcionar, repite el proceso de inspección del paso 3.1.

### Distintas vistas de Booking
- **Página de resultados de búsqueda**: contiene múltiples precios, uno por cada hotel listado. En este caso necesitarás `document.querySelectorAll(...)` para iterar sobre todas las tarjetas de hotel e inyectar un desglose en cada una.
- **Ficha de un hotel**: normalmente hay un único precio principal, que es el caso cubierto en el código anterior.
- **Checkout / página de pago**: el precio puede estar estructurado de forma distinta (con impuestos, tasas, etc. desglosados ya por Booking), por lo que convendría comprobar el selector específico de esa página también.

### Moneda
El código asume euros (€). Para que funcione con otras divisas, detecta el símbolo o código de moneda presente en el propio texto del precio en lugar de asumirlo, y muéstralo dinámicamente en el desglose.

### Múltiples habitaciones
Si la búsqueda incluye varias habitaciones, `group_adults` puede venir como una lista separada por comas (uno por habitación, p. ej. `group_adults=2,2`). Antes de sumar, decide si "por persona" debe calcularse sobre el total de huéspedes de todas las habitaciones combinadas o mostrarse desglosado por habitación, y ajusta la suma de `adults` en consecuencia (sumando todos los valores de la lista).

### Robustez general
Es recomendable envolver `extractData()` en un bloque `try/catch` y comprobar siempre que los valores numéricos (`totalPrice`, `nights`, `totalPeople`) sean válidos (`> 0` y no `NaN`) antes de inyectar nada, para evitar mostrar datos erróneos si Booking cambia su estructura.

---

## 9. Posibles mejoras futuras

- Mostrar también el desglose de impuestos y tasas si Booking los expone por separado.
- Añadir un icono de extensión con un popup para activar/desactivar el desglose.
- Internacionalización (i18n) para mostrar los textos en distintos idiomas según el navegador del usuario.
- Guardar preferencias del usuario (por ejemplo, ocultar alguna de las líneas del desglose) usando `chrome.storage`.
