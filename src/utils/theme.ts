/**
 * Theme Manager for Light Mode / Dark Mode / System Mode
 */

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'emp_att_theme_mode_v1';

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const val = localStorage.getItem(THEME_STORAGE_KEY);
    if (val === 'dark' || val === 'light' || val === 'system') {
      return val;
    }
  } catch {}
  return 'light';
}

export function applyTheme(theme: ThemeMode) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}

  let isDark = false;
  if (theme === 'dark') {
    isDark = true;
  } else if (theme === 'system') {
    isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  window.dispatchEvent(
    new CustomEvent('app_theme_changed', {
      detail: { theme, isDark }
    })
  );
}

export function initTheme() {
  if (typeof window === 'undefined') return;
  const current = getStoredTheme();
  applyTheme(current);

  if (window.matchMedia) {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (getStoredTheme() === 'system') {
        applyTheme('system');
      }
    };
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', listener);
    } else if (typeof (media as any).addListener === 'function') {
      (media as any).addListener(listener);
    }
  }
}
