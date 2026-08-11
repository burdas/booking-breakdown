'use strict';

const I18n = (() => {
  const DEFAULT_LANG = 'es';

  const MESSAGES = {
    es: {
      langAuto: 'Idioma del navegador',
      langLabel: 'Idioma',
      popupDescription: 'Personaliza qué desgloses deseas ver en la página de Booking:',
      optionTotal: '💰 Precio total',
      optionPerPerson: '👥 Por persona',
      optionPerNight: '🌙 Por noche',
      optionPerNightPerPerson: '✨ Por noche y persona',
      ariaTotal: 'Mostrar precio total',
      ariaPerPerson: 'Mostrar precio por persona',
      ariaPerNight: 'Mostrar precio por noche',
      ariaPerNightPerPerson: 'Mostrar precio por noche y persona',
      footerText: 'Los cambios se aplican automáticamente en tiempo real.',
      labelTotal: '💰 Total:',
      labelPerPerson: '👥 Por persona:',
      labelPerNight: '🌙 Por noche:',
      labelPerNightPerson: '✨ Por noche/persona:',
    },
    en: {
      langAuto: 'Browser language',
      langLabel: 'Language',
      popupDescription: 'Customize which breakdowns you want to see on the Booking page:',
      optionTotal: '💰 Total price',
      optionPerPerson: '👥 Per person',
      optionPerNight: '🌙 Per night',
      optionPerNightPerPerson: '✨ Per night and person',
      ariaTotal: 'Show total price',
      ariaPerPerson: 'Show price per person',
      ariaPerNight: 'Show price per night',
      ariaPerNightPerPerson: 'Show price per night and person',
      footerText: 'Changes are applied automatically in real time.',
      labelTotal: '💰 Total:',
      labelPerPerson: '👥 Per person:',
      labelPerNight: '🌙 Per night:',
      labelPerNightPerson: '✨ Per night/person:',
    },
  };

  let currentLang = DEFAULT_LANG;

  function fromUILanguage() {
    const ui = browser.i18n.getUILanguage();
    const code = ui ? ui.toLowerCase() : '';
    if (code.startsWith('es')) return 'es';
    if (code.startsWith('en')) return 'en';
    return DEFAULT_LANG;
  }

  function getMessage(key, lang) {
    const table = MESSAGES[lang] || MESSAGES[DEFAULT_LANG];
    return (table && table[key]) || MESSAGES[DEFAULT_LANG][key] || key;
  }

  async function resolveLanguage() {
    let preference = 'auto';
    try {
      const result = await browser.storage.local.get({ language: 'auto' });
      preference = result.language;
    } catch (e) {
      preference = 'auto';
    }
    currentLang = preference === 'auto' ? fromUILanguage() : preference;
    return currentLang;
  }

  function t(key) {
    return getMessage(key, currentLang);
  }

  return {
    resolveLanguage,
    getMessage,
    t,
    get current() {
      return currentLang;
    },
  };
})();
