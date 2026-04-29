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

  const apiKey = process.env.RAINFOREST_API_KEY;
  const amazonTag = process.env.AMAZON_TAG?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "Missing RAINFOREST_API_KEY" }, { status: 500 });
  }

  const { min, max } = getPriceBounds(priceRange);

  const attachAmazonTag = (rawLink: string) => {
    try {
      const url = new URL(rawLink, "https://www.amazon.com");
      if (amazonTag) {
        url.searchParams.set("tag", amazonTag);
      }
      return url.toString();
    } catch {
      return rawLink;
    }
  };

  const rainforestUrl = new URL("https://api.rainforestapi.com/request");
  rainforestUrl.searchParams.set("api_key", apiKey);
  rainforestUrl.searchParams.set("type", "search");
  rainforestUrl.searchParams.set("amazon_domain", "amazon.com");
  rainforestUrl.searchParams.set("search_term", query);

  try {
    const response = await fetch(rainforestUrl.toString(), { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json(
        { error: "Rainforest API request failed" },
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
        link: item.link ? attachAmazonTag(item.link) : "#",
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

    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ error: "Unexpected error while searching" }, { status: 500 });
  }
}
