function envTrim(key: string): string {
  const v = process.env[key];
  return typeof v === "string" ? v.trim() : "";
}

/** Set NEXT_PUBLIC_COMPANY_NAME on Vercel for production branding. */
export const COMPANY_DISPLAY_NAME =
  envTrim("NEXT_PUBLIC_COMPANY_NAME") || "SmartWorkHacks";

/** Set NEXT_PUBLIC_SUPPORT_EMAIL on Vercel before paid traffic. May be empty locally. */
export const SUPPORT_EMAIL = envTrim("NEXT_PUBLIC_SUPPORT_EMAIL");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function hasValidSupportEmail(): boolean {
  return EMAIL_RE.test(SUPPORT_EMAIL);
}

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (typeof raw === "string" && raw.trim()) {
    return raw.replace(/\/$/, "");
  }
  return "https://amazon-finder.vercel.app";
}
