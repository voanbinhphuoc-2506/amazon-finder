/**
 * Central Amazon Associates URL tagging (server + client).
 * Handles long/complex URLs including Sponsored /sspa/click links with nested `url` params.
 */

export const AMAZON_ASSOCIATES_TAG = "anvopro-20";

const AMAZON_HOST_SNIPPETS = [
  "amazon.com",
  "amazon.co.uk",
  "amazon.de",
  "amazon.fr",
  "amazon.it",
  "amazon.es",
  "amazon.ca",
  "amazon.com.au",
  "amazon.in",
  "amazon.co.jp",
  "amazon.nl",
  "amazon.se",
  "amazon.pl",
  "amazon.com.mx",
  "amazon.com.br",
  "amzn.to",
  "a.co",
] as const;

export function isAmazonFamilyHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return AMAZON_HOST_SNIPPETS.some((s) => h === s || h.endsWith(`.${s}`));
}

const NESTED_DEST_PARAMS = ["url", "redirect", "redirectUrl"] as const;

const MAX_NEST_DEPTH = 10;

function encodeNestedParamValue(wasAbsolute: boolean, inner: URL): string {
  return wasAbsolute
    ? encodeURIComponent(inner.toString())
    : encodeURIComponent(`${inner.pathname}${inner.search}${inner.hash}`);
}

/**
 * Recursively tag nested `url` / redirect-style params (sspa/sponsored can chain several levels).
 */
function applyTagToAmazonUrlObject(
  u: URL,
  originForRelative: string,
  tag: string,
  depth: number
): void {
  if (depth > MAX_NEST_DEPTH) {
    return;
  }

  for (const key of NESTED_DEST_PARAMS) {
    const raw = u.searchParams.get(key);
    if (!raw) {
      continue;
    }

    let decoded: string;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      continue;
    }
    if (!decoded || decoded.length < 2) {
      continue;
    }

    let inner: URL;
    let wasAbsolute: boolean;
    try {
      if (/^https?:\/\//i.test(decoded)) {
        inner = new URL(decoded);
        wasAbsolute = true;
      } else {
        inner = new URL(decoded, originForRelative);
        wasAbsolute = false;
      }
    } catch {
      continue;
    }

    if (!isAmazonFamilyHostname(inner.hostname)) {
      continue;
    }

    applyTagToAmazonUrlObject(
      inner,
      `${inner.protocol}//${inner.hostname}`,
      tag,
      depth + 1
    );
    inner.searchParams.set("tag", tag);
    u.searchParams.set(key, encodeNestedParamValue(wasAbsolute, inner));
  }

  u.searchParams.set("tag", tag);
}

/**
 * Force `tag` on the outer URL and on nested destination params used by sspa/sponsored flows.
 */
export function applyAmazonAssociatesTag(
  href: string,
  baseForRelative = "https://www.amazon.com"
): string {
  const trimmed = href.trim();
  if (!trimmed || trimmed === "#") {
    return trimmed || "#";
  }

  let url: URL;
  try {
    url = new URL(trimmed, baseForRelative);
  } catch {
    return href;
  }

  if (!isAmazonFamilyHostname(url.hostname)) {
    return href;
  }

  applyTagToAmazonUrlObject(
    url,
    `${url.protocol}//${url.hostname}`,
    AMAZON_ASSOCIATES_TAG,
    0
  );
  return url.toString();
}
