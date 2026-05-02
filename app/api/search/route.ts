import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

type RainforestSearchResult = {
  title?: string;
  link?: string;
  image?: string;
  thumbnail?: string;
  position?: number;
  rating?: number;
  price?: {
    raw?: string;
    value?: number;
  };
};

type PriceRange = "starter" | "mid" | "high" | "pro" | "all";
type SortBy = "newest" | "price_asc" | "price_desc";

/** Payload stored in Redis (minimal fields). Links must use this tag before cache write. */
const AFFILIATE_TAG = "anvopro-20";

const CACHE_TTL_SECONDS = 60 * 60 * 24;
const MAX_RESULTS = 16;
/** Ask Rainforest for enough rows so filtering (rating, price band) still yields up to MAX_RESULTS. */
const RAINFOREST_NUMBER_OF_RESULTS = 48;
const MAX_QUERY_LENGTH = 120;
const CACHE_KEY_PREFIX = "amazon-finder:search:v2";

type CachedProduct = {
  title: string;
  price: string;
  image: string;
  rating: number;
  link: string;
};

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    return null;
  }
  return new Redis({ url, token });
}

function buildCacheKey(
  query: string,
  priceRange: PriceRange,
  minRating: number,
  sortBy: SortBy
): string {
  const normalized = query.toLowerCase().trim();
  return `${CACHE_KEY_PREFIX}:${normalized}:${priceRange}:${minRating}:${sortBy}`;
}

function attachAffiliateTag(rawLink: string): string {
  try {
    const url = new URL(rawLink, "https://www.amazon.com");
    url.searchParams.set("tag", AFFILIATE_TAG);
    return url.toString();
  } catch {
    return rawLink;
  }
}

function parsePriceValue(price: string): number {
  const n = Number(price.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parseCachedPayload(raw: unknown): CachedProduct[] | null {
  let data: unknown = raw;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data) as unknown;
    } catch {
      return null;
    }
  }
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }
  const rows: CachedProduct[] = [];
  for (const entry of data) {
    if (typeof entry !== "object" || entry === null) continue;
    const o = entry as Record<string, unknown>;
    const rating =
      typeof o.rating === "number" ? o.rating : Number(o.rating as string | number);
    if (
      typeof o.title !== "string" ||
      typeof o.price !== "string" ||
      typeof o.image !== "string" ||
      typeof o.link !== "string" ||
      !Number.isFinite(rating)
    ) {
      return null;
    }
    rows.push({
      title: o.title,
      price: o.price,
      image: o.image,
      rating,
      link: o.link,
    });
  }
  return rows.length > 0 ? rows : null;
}

function cachedRowsToResponseProducts(rows: CachedProduct[]) {
  return rows.map((p) => ({
    title: p.title,
    price: p.price,
    image: p.image,
    rating: p.rating,
    link: p.link,
    priceValue: parsePriceValue(p.price),
  }));
}

function getPriceBounds(range: PriceRange) {
  switch (range) {
    case "starter":
      return { min: 100, max: 300 };
    case "mid":
      return { min: 300, max: 1000 };
    case "high":
      return { min: 1000, max: 3000 };
    case "pro":
      return { min: 3000, max: Number.POSITIVE_INFINITY };
    default:
      return { min: 0, max: Number.POSITIVE_INFINITY };
  }
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  const priceRange = (request.nextUrl.searchParams.get("priceRange") ?? "all") as PriceRange;
  const minRating = Number(request.nextUrl.searchParams.get("minRating") ?? "4");
  const sortBy = (request.nextUrl.searchParams.get("sortBy") ?? "newest") as SortBy;

  if (!query) {
    return NextResponse.json({ error: "Missing query parameter: q" }, { status: 400 });
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Query too long (max ${MAX_QUERY_LENGTH} characters)` },
      { status: 400 }
    );
  }

  if (Number.isNaN(minRating) || minRating < 0 || minRating > 5) {
    return NextResponse.json(
      { error: "Invalid minRating (must be a number between 0 and 5)" },
      { status: 400 }
    );
  }

  const apiKey = process.env.RAINFOREST_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing RAINFOREST_API_KEY" }, { status: 500 });
  }

  const { min, max } = getPriceBounds(priceRange);
  const cacheKey = buildCacheKey(query, priceRange, minRating, sortBy);
  const redis = getRedis();

  if (redis) {
    try {
      const cachedRaw = await redis.get<unknown>(cacheKey);
      const cached = parseCachedPayload(cachedRaw);
      if (cached) {
        return NextResponse.json({
          products: cachedRowsToResponseProducts(cached),
          cached: true,
          isCached: true,
        });
      }
    } catch (redisError) {
      console.error(
        `[api/search] Redis GET failed key=${cacheKey}`,
        redisError instanceof Error ? redisError.message : redisError
      );
    }
  }

  const rainforestUrl = new URL("https://api.rainforestapi.com/request");
  rainforestUrl.searchParams.set("api_key", apiKey);
  rainforestUrl.searchParams.set("type", "search");
  rainforestUrl.searchParams.set("amazon_domain", "amazon.com");
  rainforestUrl.searchParams.set("search_term", query);
  rainforestUrl.searchParams.set("number_of_results", String(RAINFOREST_NUMBER_OF_RESULTS));

  try {
    const response = await fetch(rainforestUrl.toString(), { cache: "no-store" });
    if (!response.ok) {
      const bodyPreview = await response.text().catch(() => "");
      const userFacingMessage =
        response.status === 402
          ? "Rainforest API account or billing issue"
          : "Rainforest API request failed";
      console.error(
        `[api/search] Rainforest API error: status=${response.status} q="${query}" priceRange=${priceRange} minRating=${minRating} sortBy=${sortBy} body=${bodyPreview.slice(0, 200)}`
      );
      return NextResponse.json(
        { error: userFacingMessage, upstreamStatus: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();
    const items: RainforestSearchResult[] = Array.isArray(data?.search_results)
      ? data.search_results
      : [];

    const products = items
      .filter((item) => item.title && item.link)
      .map((item) => ({
        title: item.title ?? "Untitled Product",
        link: item.link ? attachAffiliateTag(item.link) : "#",
        image: item.image ?? item.thumbnail ?? "",
        priceValue:
          typeof item.price?.value === "number"
            ? item.price.value
            : Number((item.price?.raw ?? "").replace(/[^0-9.]/g, "")),
        price:
          item.price?.raw ??
          (typeof item.price?.value === "number" ? `$${item.price.value}` : "N/A"),
        rating: typeof item.rating === "number" ? item.rating : 0,
        position: typeof item.position === "number" ? item.position : Number.MAX_SAFE_INTEGER,
      }))
      .filter((product) => product.rating >= minRating)
      .filter(
        (product) =>
          Number.isFinite(product.priceValue) &&
          product.priceValue >= min &&
          product.priceValue <= max
      );

    if (sortBy === "price_asc") {
      products.sort((a, b) => a.priceValue - b.priceValue);
    } else if (sortBy === "price_desc") {
      products.sort((a, b) => b.priceValue - a.priceValue);
    } else {
      products.sort((a, b) => a.position - b.position);
    }

    const top = products.slice(0, MAX_RESULTS);

    const toCache: CachedProduct[] = top.map((p) => ({
      title: p.title,
      price: p.price,
      image: p.image,
      rating: p.rating,
      link: p.link,
    }));

    if (redis && toCache.length > 0) {
      try {
        await redis.set(cacheKey, toCache, { ex: CACHE_TTL_SECONDS });
      } catch (redisError) {
        console.error(
          `[api/search] Redis SET failed key=${cacheKey}`,
          redisError instanceof Error ? redisError.message : redisError
        );
      }
    }

    const responseProducts = top.map((p) => ({
      title: p.title,
      price: p.price,
      image: p.image,
      rating: p.rating,
      link: p.link,
      priceValue: p.priceValue,
    }));

    return NextResponse.json({ products: responseProducts, cached: false, isCached: false });
  } catch (error) {
    console.error(
      `[api/search] Unexpected error: q="${query}" message=${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return NextResponse.json({ error: "Unexpected error while searching" }, { status: 500 });
  }
}
