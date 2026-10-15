export const COOKIE_CONSENT_KEY = "trd-cookie-consent";

export const getCookieConsent = () => {
  try {
    return localStorage.getItem(COOKIE_CONSENT_KEY);
  } catch {
    return null;
  }
};

export const hasDoNotTrack = () =>
  navigator.doNotTrack === "1" ||
  (window as any).doNotTrack === "1" ||
  (navigator as any).msDoNotTrack === "1";

export const canUseNonEssentialTracking = () =>
  getCookieConsent() === "accepted" && !hasDoNotTrack();
