# Booking Price Breakdown

Una extensión de navegador (compatible con Google Chrome, Microsoft Edge, Firefox y navegadores basados en Chromium) que desglosa el precio total de las estancias de **Booking.com** en tiempo real.

## Características

- 📊 **Desglose completo**: Muestra de forma clara el precio total, precio por persona, precio por noche y precio por noche y por persona.
- 🔄 **Soporte para SPA (Single Page Application)**: Utiliza `MutationObserver` para actualizar los desgloses automáticamente cuando cambias de fecha, filtros o huéspedes sin necesidad de recargar la página.
- 🏨 **Listados y Ficha de Hotel**: Funciona tanto en la vista individual de un alojamiento como en la lista de resultados de búsqueda.
- 🪙 **Detección automática de divisa**: Identifica la divisa utilizada en la página (EUR, USD, GBP, etc.) para mantener la coherencia visual.
- 👥 **Soporte para múltiples habitaciones**: Suma correctamente los huéspedes si el parámetro de la URL contiene múltiples habitaciones (ej. `group_adults=2,2`).

## Estructura del Proyecto

```text
booking-breakdown/
├── manifest.json              # Metadatos y permisos de la extensión (Manifest V3)
├── content.js                 # Lógica de extracción de datos e inyección del desglose
├── styles.css                 # Estilos CSS de las tarjetas de desglose
├── popup.html                 # Interfaz del popup de la extensión
├── popup.js                   # Lógica del popup
├── popup.css                  # Estilos del popup
├── browser-polyfill.min.js    # Polyfill de WebExtensions para compatibilidad cross-browser
├── icon{16,32,48,128}.png     # Iconos de la extensión
├── package.json               # Dependencias y scripts (web-ext)
├── package-lock.json
├── scripts/build.sh            # Script de build: limpia dist, empaqueta y descomprime
├── .web-ext-ignore             # (Legacy) Patrones históricos de exclusión
├── dist/                       # Archivos generados (zip + carpeta descomprimida, ignorado por git)
├── .gitignore                  # Ignora dist/, node_modules/ y archivos temporales
└── README.md                   # Este archivo de documentación
```

## Empaquetado para Publicación

Instala las dependencias y genera un `.zip` listo para publicar en Chrome Web Store o Firefox Add-ons:

```bash
npm install                      # Instala web-ext y webextension-polyfill
npm run build                    # Genera .zip en dist/
```

El empaquetado se realiza con [`web-ext`](https://github.com/mozilla/web-ext). El script `scripts/build.sh` limpia `dist/`, genera el `.zip` excluyendo los archivos de desarrollo mediante `--ignore-files` y lo descomprime, dejando tanto el `.zip` como la carpeta descomprimida en `dist/`.

## Cómo probar la extensión

Tras ejecutar `npm run build`, en `dist/` quedan el `.zip` y la carpeta descomprimida (`dist/booking_price_breakdown-1.3/`). Para probar la extensión, carga esa carpeta descomprimida:

- **Chrome / Edge**: abre `chrome://extensions` (o `edge://extensions`), activa el **"Modo de desarrollador"** y haz clic en **"Cargar descomprimida"** seleccionando la carpeta `dist/booking_price_breakdown-1.3/`.
- **Firefox**: abre `about:debugging#/runtime/this-firefox`, haz clic en **"Cargar complemento temporal..."** y selecciona el archivo `manifest.json` dentro de `dist/booking_price_breakdown-1.3/`.

Después, abre Booking.com y busca un destino para ver el desglose de precios.

## Instalación (Modo Desarrollador)

1. Descarga o clona este repositorio en tu máquina local.
2. Ejecuta `npm install` para instalar las dependencias.
3. Abre la sección de extensiones de tu navegador:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Firefox: `about:debugging#/runtime/this-firefox`
4. Activa el **"Modo de desarrollador"** (Developer mode).
5. Carga la extensión:
   - **Chromium**: Haz clic en **"Cargar descomprimida"** y selecciona la carpeta del proyecto.
   - **Firefox**: Haz clic en **"Cargar complemento temporal..."** y selecciona `manifest.json`.
6. Abre Booking.com, busca un destino ¡y verás el desglose de precios al instante!

## Licencia

Este proyecto está bajo la Licencia MIT. Para más detalles, ver el archivo [LICENSE](LICENSE).
