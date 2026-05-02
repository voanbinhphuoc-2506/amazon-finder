import { getCookieConsent } from "@/app/lib/cookieConsentStorage";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/**
 * Attribution keys advertisers typically pass on landing URLs.
 * Keeps only these in `utm_params` so the dataLayer payload stays predictable for GTM.
 */
const TRACKING_PARAM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "utm_id",
  "gclid",
  "wbraid",
  "gbraid",
] as const;

export type TrackingParamKey = (typeof TRACKING_PARAM_KEYS)[number];

export type UtmParamsPayload = Partial<Record<TrackingParamKey, string>>;

function sanitizeTrackingParams(raw: Record<string, string | undefined> | undefined): UtmParamsPayload {
  if (!raw) return {};
  const out: UtmParamsPayload = {};
  for (const key of TRACKING_PARAM_KEYS) {
    const v = raw[key]?.trim();
    if (v) {
      out[key] = v;
    }
  }
  return out;
}

/** Reads known marketing/Ads params from the current URL (for landing pages with ?utm_*=...) */
export function utmParamsFromSearchParams(searchParams: URLSearchParams): UtmParamsPayload {
  const raw: Partial<Record<TrackingParamKey, string>> = {};
  for (const key of TRACKING_PARAM_KEYS) {
    const v = searchParams.get(key)?.trim();
    if (v) raw[key] = v;
  }
  return sanitizeTrackingParams(raw as Record<string, string | undefined>);
}

/**
 * Push a GTM-friendly custom event.
 * Trigger in GTM: Custom Event where Event name equals AMAZON_FINDER_SEARCH_EVENT.
 */
export const AMAZON_FINDER_SEARCH_EVENT = "amazon_finder_search";
/** Outbound Amazon listing click (flat payload, same style as `sw_search` in GTM). */
export const SW_OUTBOUND_AMAZON_CLICK_EVENT = "sw_outbound_amazon_click";

export type TrackSearchEventArgs = {
  query: string;
  results_count: number;
  is_cached: boolean;
  utm_params?: Record<string, string | undefined>;
};

export function trackSearchEvent({
  query,
  results_count,
  is_cached,
  utm_params,
}: TrackSearchEventArgs): void {
  if (typeof window === "undefined") return;
  if (getCookieConsent() !== "accepted") return;

  const utm_params_clean = sanitizeTrackingParams(
    utm_params as Record<string, string | undefined>
  );

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({
    event: AMAZON_FINDER_SEARCH_EVENT,
    /** Search semantics (explicit names for GA4/GTM Data Layer Variables) */
    query,
    results_count,
    is_cached,
    /** Nested object usable as a single Data Layer Variable of type Object */
    utm_params: utm_params_clean,
  });
}

export type TrackAmazonClickArgs = {
  product_name: string;
  product_price: string;
  /** 1-based index in the current results grid */
  position: number;
  /** From landing URL (`utm_campaign`); omit on dataLayer when empty */
  utm_campaign?: string | undefined;
};

/** GTM Custom Event name: {@link SW_OUTBOUND_AMAZON_CLICK_EVENT}. */
export function trackAmazonClick({
  product_name,
  product_price,
  position,
  utm_campaign,
}: TrackAmazonClickArgs): void {
  if (typeof window === "undefined") return;
  if (getCookieConsent() !== "accepted") return;

  const campaign = typeof utm_campaign === "string" ? utm_campaign.trim() : "";
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({
    event: SW_OUTBOUND_AMAZON_CLICK_EVENT,
    product_name,
    product_price,
    position,
    ...(campaign ? { utm_campaign: campaign } : {}),
  });
}

export function analyticsEvent(name: string, payload?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (getCookieConsent() !== "accepted") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event: name, ...payload });
}
