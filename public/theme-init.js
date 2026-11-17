// Applies the saved (or system) theme before the first paint, so there is no flash.
(function () {
  var theme = null;
  try {
    theme = localStorage.getItem('rde-pg:theme');
  } catch (e) {
    theme = null;
  }
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
})();
