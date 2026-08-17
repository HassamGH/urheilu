export function navigate(path: string) {
  const event = new CustomEvent<string>('app:navigate', { detail: path, cancelable: true });
  window.dispatchEvent(event);
  if (event.defaultPrevented) return;

  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

// The sport filter lives in the URL (instead of plain component state) so that navigating away
// and pressing back lands on the same filtered view rather than resetting to the unfiltered home page.
export function sportFilterHref(slug: string) {
  return slug === 'all' ? '/' : `/?sport=${encodeURIComponent(slug)}`;
}

export function getSportFromLocation() {
  return new URLSearchParams(window.location.search).get('sport') || 'all';
}
