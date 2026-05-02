export const COOKIE_CONSENT_KEY = "cookie_consent";

export type CookieConsentStatus = "accepted" | "rejected" | "undecided" | null;

export function getCookieConsent(): CookieConsentStatus {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored === "accepted") return "accepted";
    if (stored === "rejected") return "rejected";
    return "undecided";
  } catch {
    return "undecided";
  }
}
