/** Scroll the page back to the top. The app scrolls inside <main> (header and transport stay in place). */
export function toTop(): void {
  document.querySelector('main')?.scrollTo(0, 0);
  window.scrollTo(0, 0);
}
