(function() {
  var STORAGE_KEY = 'ct_theme';
  var THEMES = { dark: true, light: true };

  function resolveTheme(value) {
    return THEMES[value] ? value : 'dark';
  }

  function readStoredTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      return null;
    }
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function normalizeColor(color) {
    if (!color) return '';
    color = String(color).trim();
    if (!color) return '';
    if (color.indexOf('var(') === 0) {
      var varName = color.slice(4, -1).trim();
      return cssVar(varName);
    }
    return color;
  }

  function alpha(color, opacity) {
    color = normalizeColor(color);
    if (!color) return 'rgba(0, 0, 0, ' + opacity + ')';

    if (color.indexOf('#') === 0) {
      var hex = color.slice(1);
      if (hex.length === 3) {
        hex = hex.split('').map(function(part) { return part + part; }).join('');
      }
      if (hex.length === 6) {
        var r = parseInt(hex.slice(0, 2), 16);
        var g = parseInt(hex.slice(2, 4), 16);
        var b = parseInt(hex.slice(4, 6), 16);
        return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + opacity + ')';
      }
    }

    var rgbMatch = color.match(/^rgba?\(([^)]+)\)$/i);
    if (rgbMatch) {
      var parts = rgbMatch[1].split(',').map(function(part) { return part.trim(); });
      return 'rgba(' + parts[0] + ', ' + parts[1] + ', ' + parts[2] + ', ' + opacity + ')';
    }

    return color;
  }

  function palette() {
    return {
      theme: getTheme(),
      bg: cssVar('--bg'),
      bg2: cssVar('--bg2'),
      bg3: cssVar('--bg3'),
      bg4: cssVar('--bg4'),
      border: cssVar('--border'),
      border2: cssVar('--border2'),
      accent: cssVar('--accent'),
      accent2: cssVar('--accent2'),
      text: cssVar('--text'),
      text2: cssVar('--text2'),
      text3: cssVar('--text3'),
      green: cssVar('--green'),
      green2: cssVar('--green2'),
      yellow: cssVar('--yellow'),
      orange: cssVar('--orange'),
      red: cssVar('--red'),
      scoreExcellent: cssVar('--score-excellent'),
      scoreGood: cssVar('--score-good'),
      scoreOk: cssVar('--score-ok'),
      scoreMid: cssVar('--score-mid'),
      scoreLow: cssVar('--score-low'),
      chartGrid: cssVar('--chart-grid'),
      chartGridStrong: cssVar('--chart-grid-strong'),
      chartAxis: cssVar('--chart-axis'),
      chartAxisStrong: cssVar('--chart-axis-strong'),
      tooltipBg: cssVar('--chart-tooltip-bg'),
      tooltipBorder: cssVar('--chart-tooltip-border'),
      tooltipTitle: cssVar('--chart-tooltip-title'),
      tooltipBody: cssVar('--chart-tooltip-body'),
      chartSurfaceBorder: cssVar('--chart-surface-border'),
      heatOut: cssVar('--heat-out'),
      heatEmpty: cssVar('--heat-empty'),
      heat1: cssVar('--heat-1'),
      heat2: cssVar('--heat-2'),
      heat3: cssVar('--heat-3'),
      heat4: cssVar('--heat-4'),
      heat5: cssVar('--heat-5')
    };
  }

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }

  function syncToggle(button) {
    if (!button) return;
    var currentTheme = getTheme();
    var label = button.querySelector('[data-theme-label]');
    if (label) label.textContent = currentTheme === 'light' ? 'Claro' : 'Escuro';
    button.setAttribute('aria-pressed', currentTheme === 'light' ? 'true' : 'false');
    button.setAttribute(
      'title',
      currentTheme === 'light' ? 'Alternar para o modo escuro' : 'Alternar para o modo claro'
    );
  }

  function syncToggles() {
    document.querySelectorAll('[data-theme-toggle]').forEach(syncToggle);
  }

  function applyTheme(nextTheme, persist, emitEvent) {
    var resolved = resolveTheme(nextTheme);
    var root = document.documentElement;
    root.setAttribute('data-theme', resolved);
    root.style.colorScheme = resolved === 'light' ? 'light' : 'dark';

    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, resolved);
      } catch (err) {}
    }

    syncToggles();

    if (emitEvent && typeof window.CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('ct-themechange', {
        detail: {
          theme: resolved,
          palette: palette()
        }
      }));
    }

    return resolved;
  }

  function toggleTheme() {
    return applyTheme(getTheme() === 'light' ? 'dark' : 'light', true, true);
  }

  var initialTheme = resolveTheme(readStoredTheme());
  if (typeof document !== 'undefined') {
    applyTheme(initialTheme, false, false);
  }

  window.TrackTheme = {
    key: STORAGE_KEY,
    getTheme: getTheme,
    setTheme: function(nextTheme) {
      return applyTheme(nextTheme, true, true);
    },
    toggle: toggleTheme,
    cssVar: cssVar,
    alpha: alpha,
    palette: palette,
    syncToggle: syncToggle,
    syncToggles: syncToggles
  };

  document.addEventListener('DOMContentLoaded', function() {
    syncToggles();
    document.addEventListener('click', function(event) {
      var button = event.target.closest('[data-theme-toggle]');
      if (!button) return;
      event.preventDefault();
      toggleTheme();
    });
  });

  window.addEventListener('storage', function(event) {
    if (event.key === STORAGE_KEY) {
      applyTheme(resolveTheme(event.newValue), false, true);
    }
  });
})();
