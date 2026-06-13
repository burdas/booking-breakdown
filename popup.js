document.addEventListener('DOMContentLoaded', () => {
  const settings = ['showTotal', 'showPerPerson', 'showPerNight', 'showPerNightPerPerson'];
  
  // Cargar configuraciones guardadas o usar valores por defecto (true)
  chrome.storage.local.get(settings, (result) => {
    settings.forEach((key) => {
      const checkbox = document.getElementById(key);
      if (checkbox) {
        // Si no está definido en storage, por defecto es true
        checkbox.checked = result[key] !== false;
      }
    });
  });

  // Guardar configuraciones cuando cambie cualquier interruptor
  settings.forEach((key) => {
    const checkbox = document.getElementById(key);
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        chrome.storage.local.set({ [key]: e.target.checked });
      });
    }
  });
});
