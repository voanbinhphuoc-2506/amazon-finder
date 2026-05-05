import {
  LANDING_GRID_SLOTS,
  type LandingCatalogCategory,
  type LandingCatalogFile,
  type LandingCatalogProduct,
} from "@/app/lib/landingCatalog";

/** Associates tag — link DP chuẩn (không dùng URL thô từ API). */
export const LANDING_ADS_ASSOCIATE_TAG = "anvopro-20";

/** Giao trước hoặc đúng ngày 10/05/2026 (cuối ngày UTC). */
const DELIVERY_LAST_MS = Date.parse("2026-05-10T23:59:59.999Z");

export function buildAmazonImmortalDpUrl(asin: string): string {
  const a = asin.trim();
  if (!a) {
    return `https://www.amazon.com/dp/?tag=${LANDING_ADS_ASSOCIATE_TAG}`;
  }
  return `https://www.amazon.com/dp/${encodeURIComponent(a)}?tag=${LANDING_ADS_ASSOCIATE_TAG}`;
}

/** Chuẩn hóa giá trị ?q= (vd fitness+tracker, %20). */
export function normalizeAdsQueryParam(raw: string): string {
  try {
    return decodeURIComponent(raw.replace(/\+/g, " "))
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  } catch {
    return raw.replace(/\+/g, " ").trim().toLowerCase().replace(/\s+/g, " ");
  }
}

function tokenizeForMatch(normalized: string): string[] {
  return normalized
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function productHaystack(p: LandingCatalogProduct): string {
  return `${p.keyword} ${p.title}`.toLowerCase();
}

export function productMatchesAdsQuery(p: LandingCatalogProduct, normalizedQuery: string): boolean {
  const tokens = tokenizeForMatch(normalizedQuery);
  if (tokens.length === 0) {
    return false;
  }
  const hay = productHaystack(p);
  return tokens.every((t) => hay.includes(t));
}

/** earliest_delivery ISO; thiếu field → vẫn hiển thị (catalog cũ). */
export function passesAdsDeliveryDeadline(p: LandingCatalogProduct): boolean {
  const raw = p.earliest_delivery;
  if (raw == null || String(raw).trim() === "") {
    return true;
  }
  const ms = Date.parse(String(raw));
  if (Number.isNaN(ms)) {
    return true;
  }
  return ms <= DELIVERY_LAST_MS;
}

export function compareLandingCatalog(a: LandingCatalogProduct, b: LandingCatalogProduct): number {
  if (b.rating !== a.rating) {
    return b.rating - a.rating;
  }
  if (a.is_prime !== b.is_prime) {
    return (b.is_prime ? 1 : 0) - (a.is_prime ? 1 : 0);
  }
  return b.priceValue - a.priceValue;
}

export function pickBestSellersFromCatalog(
  products: LandingCatalogProduct[],
  limit: number
): LandingCatalogProduct[] {
  return [...products].sort(compareLandingCatalog).slice(0, limit);
}

export function withImmortalListingLink(p: LandingCatalogProduct): LandingCatalogProduct {
  return {
    ...p,
    link: buildAmazonImmortalDpUrl(p.asin),
  };
}

function dedupeByAsin(products: LandingCatalogProduct[]): LandingCatalogProduct[] {
  const map = new Map<string, LandingCatalogProduct>();
  for (const p of products) {
    if (!map.has(p.asin)) {
      map.set(p.asin, p);
    }
  }
  return Array.from(map.values());
}

function findCategoryForQuery(
  catalog: LandingCatalogFile,
  normalized: string
): LandingCatalogCategory | null {
  const cats = catalog.categories ?? [];
  const slugish = normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  for (const c of cats) {
    if (normalizeAdsQueryParam(c.search_query) === normalized) {
      return c;
    }
    if (c.slug === slugish) {
      return c;
    }
  }
  return null;
}

/** Kho quà Mother’s Day: mọi SKU trong JSON đã qua lọc ngày, dedupe, sort. */
function motherDayPool(catalog: LandingCatalogFile): LandingCatalogProduct[] {
  const fromFlat = (catalog.products ?? []).filter(passesAdsDeliveryDeadline);
  const fromCats = (catalog.categories ?? []).flatMap((c) =>
    (c.products ?? []).filter(passesAdsDeliveryDeadline)
  );
  return dedupeByAsin([...fromFlat, ...fromCats]).sort(compareLandingCatalog);
}

/** Đủ đúng 16 ô: lấy từ danh mục khớp `q`, lấp từ kho chung (quà MD khác). */
function padToSixteen(
  primary: LandingCatalogProduct[],
  pool: LandingCatalogProduct[]
): LandingCatalogProduct[] {
  const seen = new Set(primary.map((p) => p.asin));
  const out = primary.map(withImmortalListingLink);
  for (const p of pool) {
    if (out.length >= LANDING_GRID_SLOTS) {
      break;
    }
    if (seen.has(p.asin)) {
      continue;
    }
    seen.add(p.asin);
    out.push(withImmortalListingLink(p));
  }
  return out.slice(0, LANDING_GRID_SLOTS);
}

/**
 * `rawQuery === null` → grid 16 món tốt nhất toàn catalog (Mother’s Day).
 * Có `q` → 16 món từ danh mục JSON khớp từ khóa, lấp từ kho chung nếu thiếu.
 */
export function selectMotherDayAdsGrid(
  catalog: LandingCatalogFile,
  rawQuery: string | null
): LandingCatalogProduct[] {
  const pool = motherDayPool(catalog);

  if (rawQuery == null || !rawQuery.trim()) {
    return pickBestSellersFromCatalog(pool, LANDING_GRID_SLOTS).map(withImmortalListingLink);
  }

  const normalized = normalizeAdsQueryParam(rawQuery);
  const cat = findCategoryForQuery(catalog, normalized);

  let primary: LandingCatalogProduct[] = [];
  if (cat?.products?.length) {
    primary = cat.products
      .filter(passesAdsDeliveryDeadline)
      .sort(compareLandingCatalog)
      .slice(0, LANDING_GRID_SLOTS);
  } else {
    primary = pool.filter((p) => productMatchesAdsQuery(p, normalized)).slice(0, LANDING_GRID_SLOTS);
  }

  return padToSixteen(primary, pool);
}
