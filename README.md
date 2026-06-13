# Booking Price Breakdown

Una extensión de navegador (compatible con Google Chrome, Microsoft Edge y navegadores basados en Chromium) que desglosa el precio total de las estancias de **Booking.com** en tiempo real.

## Características

- 📊 **Desglose completo**: Muestra de forma clara el precio total, precio por persona, precio por noche y precio por noche y por persona.
- 🔄 **Soporte para SPA (Single Page Application)**: Utiliza `MutationObserver` para actualizar los desgloses automáticamente cuando cambias de fecha, filtros o huéspedes sin necesidad de recargar la página.
- 🏨 **Listados y Ficha de Hotel**: Funciona tanto en la vista individual de un alojamiento como en la lista de resultados de búsqueda.
- 🪙 **Detección automática de divisa**: Identifica la divisa utilizada en la página (EUR, USD, GBP, etc.) para mantener la coherencia visual.
- 👥 **Soporte para múltiples habitaciones**: Suma correctamente los huéspedes si el parámetro de la URL contiene múltiples habitaciones (ej. `group_adults=2,2`).

## Estructura del Proyecto

```text
booking-breakdown/
├── manifest.json  # Metadatos y permisos de la extensión (Manifest V3)
├── content.js     # Lógica de extracción de datos e inyección del desglose
├── styles.css     # Estilos CSS de las tarjetas de desglose
├── plan.md        # Plan de desarrollo original de la extensión
└── README.md      # Este archivo de documentación
```

## Instalación (Modo Desarrollador)

1. Descarga o clona este repositorio en tu máquina local.
2. Abre tu navegador Chromium y accede a la sección de extensiones:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. Activa el **"Modo de desarrollador"** (Developer mode) situado en la esquina superior derecha.
4. Haz clic en el botón **"Cargar descomprimida"** (Load unpacked).
5. Selecciona la carpeta raíz de este proyecto (`booking-breakdown`).
6. Abre Booking.com, busca un destino ¡y verás el desglose de precios al instante!

## Licencia

Este proyecto está bajo la Licencia MIT. Para más detalles, ver el archivo [LICENSE](LICENSE).
