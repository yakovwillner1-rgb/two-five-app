/** Light / Dark theme. Light is the default. Stored apart from the app state under its own key. */
export type Theme = 'light' | 'dark';
const KEY = 'twofive-theme';
const root = document.documentElement;
export const getTheme = (): Theme => (root.dataset.theme === 'dark' ? 'dark' : 'light');
const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>';
export function applyTheme(t: Theme, store = true): void {
  if (t === 'dark') root.dataset.theme = 'dark'; else delete root.dataset.theme;
  if (store) { try { localStorage.setItem(KEY, t); } catch (e) { /* blocked */ } }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#0F1B24' : '#EEF8F8');
  const b = document.getElementById('themebtn');
  if (b) { b.innerHTML = t === 'dark' ? SUN : MOON; b.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'); }
}
export const toggleTheme = (): void => applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
