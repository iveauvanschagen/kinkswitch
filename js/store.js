// Opslag in de browser (localStorage). Fouten (privémodus, vol) worden stil genegeerd.
export function ls(k, v) {
  try {
    if (v === undefined) return localStorage.getItem(k);
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch (e) {
    return null;
  }
}
