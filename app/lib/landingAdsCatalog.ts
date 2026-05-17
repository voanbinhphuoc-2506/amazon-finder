import {
  LANDING_GRID_SLOTS,
  type LandingCatalogCategory,
  type LandingCatalogFile,
  type LandingCatalogProduct,
} from "@/app/lib/landingCatalog";

/** Associates tag — link DP chuẩn (không dùng URL thô từ API). */
export const LANDING_ADS_ASSOCIATE_TAG = "anvopro-20";

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
  return `${p.keyword ?? ""} ${p.category ?? ""} ${p.title}`.toLowerCase();
}

export function productMatchesAdsQuery(p: LandingCatalogProduct, normalizedQuery: string): boolean {
  const tokens = tokenizeForMatch(normalizedQuery);
  if (tokens.length === 0) {
    return false;
  }
  const hay = productHaystack(p);
  return tokens.every((t) => hay.includes(t));
}

/** Static mode: bỏ qua bộ lọc ngày giao hoàn toàn. */
export function passesAdsDeliveryDeadline(_product: LandingCatalogProduct): boolean {
  void _product;
  return true;
}

function normalizePriceValue(p: LandingCatalogProduct): number {
  if (typeof p.priceValue === "number" && Number.isFinite(p.priceValue)) {
    return p.priceValue;
  }
  if (typeof p.price === "number" && Number.isFinite(p.price)) {
    return p.price;
  }
  if (typeof p.price === "string") {
    const parsed = Number(p.price.replace(/[^\d.]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizePriceText(p: LandingCatalogProduct): string {
  if (typeof p.price === "number") {
    return `$${p.price.toFixed(2)}`;
  }
  return p.price || "N/A";
}

export function compareLandingCatalog(a: LandingCatalogProduct, b: LandingCatalogProduct): number {
  if (b.rating !== a.rating) {
    return b.rating - a.rating;
  }
  if (a.is_prime !== b.is_prime) {
    return (b.is_prime ? 1 : 0) - (a.is_prime ? 1 : 0);
  }
  return normalizePriceValue(b) - normalizePriceValue(a);
}

export function pickBestSellersFromCatalog(
  products: LandingCatalogProduct[],
  limit: number
): LandingCatalogProduct[] {
  return [...products].sort(compareLandingCatalog).slice(0, limit);
}

/** Ghim `featured` trước, phần còn lại lấy theo sort best-seller. */
function mergeFeaturedIntoGrid(
  ranked: LandingCatalogProduct[],
  pool: LandingCatalogProduct[],
  limit: number
): LandingCatalogProduct[] {
  const featured = pool.filter((p) => p.featured);
  const featuredAsins = new Set(featured.map((p) => p.asin));
  const rest = ranked.filter((p) => !featuredAsins.has(p.asin));
  const cap = Math.max(0, limit - featured.length);
  const merged = [...featured.map(withImmortalListingLink), ...rest.slice(0, cap).map(withImmortalListingLink)];
  return merged.slice(0, limit);
}

export function withImmortalListingLink(p: LandingCatalogProduct): LandingCatalogProduct {
  return {
    ...p,
    keyword: p.keyword ?? p.category ?? "Featured",
    price: normalizePriceText(p),
    priceValue: normalizePriceValue(p),
    is_prime: p.is_prime ?? true,
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

/** Kho sản phẩm static từ JSON. */
function motherDayPool(catalog: LandingCatalogFile): LandingCatalogProduct[] {
  const fromFlat = (catalog.products ?? []).filter((p) => Boolean(p?.asin));
  const fromCats = (catalog.categories ?? []).flatMap((c) => (c.products ?? []).filter((p) => Boolean(p?.asin)));
  return dedupeByAsin([...fromFlat, ...fromCats]).map(withImmortalListingLink).sort(compareLandingCatalog);
}

/** Đủ đúng 16 ô: lấy từ danh mục khớp `q`, lấp từ kho chung (quà MD khác). */
function padToSixteen(
  primary: LandingCatalogProduct[],
  pool: LandingCatalogProduct[]
): LandingCatalogProduct[] {
  const seen = new Set(primary.map((p) => p.asin));
  const out = [...primary];
  for (const p of pool) {
    if (out.length >= LANDING_GRID_SLOTS) {
      break;
    }
    if (seen.has(p.asin)) {
      continue;
    }
    seen.add(p.asin);
    out.push(p);
  }

  // Khi tổng SKU unique < 16, lặp vòng từ danh sách hiện có để vẫn đủ 16 ô.
  const refillSource = out.length > 0 ? out : pool;
  let i = 0;
  while (out.length < LANDING_GRID_SLOTS && refillSource.length > 0) {
    out.push(refillSource[i % refillSource.length]);
    i += 1;
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
    const ranked = pickBestSellersFromCatalog(pool, LANDING_GRID_SLOTS);
    return mergeFeaturedIntoGrid(ranked, pool, LANDING_GRID_SLOTS);
  }

  const normalized = normalizeAdsQueryParam(rawQuery);
  const cat = findCategoryForQuery(catalog, normalized);
  const querySlug = normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  let primary: LandingCatalogProduct[] = [];
  if (cat?.products?.length) {
    primary = cat.products
      .filter(passesAdsDeliveryDeadline)
      .map(withImmortalListingLink)
      .sort(compareLandingCatalog)
      .slice(0, LANDING_GRID_SLOTS);
  } else {
    primary = pool
      .filter((p) => {
        const byCategory = (p.category ?? "").toLowerCase() === querySlug;
        if (byCategory) return true;
        return productMatchesAdsQuery(p, normalized);
      })
      .slice(0, LANDING_GRID_SLOTS);
  }

  const padded = padToSixteen(primary, pool);
  return mergeFeaturedIntoGrid(padded, pool, LANDING_GRID_SLOTS);
}
