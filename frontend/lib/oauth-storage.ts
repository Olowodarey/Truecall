// Cross-redirect storage for the Twitter OAuth handoff.
//
// iOS Safari frequently loses values written to `localStorage` immediately
// before a top-level redirect: the write isn't always flushed before the
// navigation, and when the native X app handles the OAuth link it can return
// the callback in a slightly different browsing context where the original
// `localStorage` isn't visible. Cookies are flushed synchronously and — with
// SameSite=Lax — ARE sent/readable on the top-level navigation Twitter uses to
// return to us, so they survive where localStorage does not.
//
// We write both (cookie + localStorage) and read cookie-first, which keeps
// Android working as before while fixing iOS.

const MAX_AGE = 600; // 10 minutes — an OAuth round-trip is short-lived

export function setOAuthValue(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage can throw in private mode / partitioned contexts
  }
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${key}=${encodeURIComponent(
    value,
  )}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax${secure}`;
}

export function getOAuthValue(key: string): string | null {
  const cookieMatch = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${key}=`));
  if (cookieMatch) {
    return decodeURIComponent(cookieMatch.slice(key.length + 1));
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function clearOAuthValue(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
  document.cookie = `${key}=; Max-Age=0; Path=/; SameSite=Lax`;
}
