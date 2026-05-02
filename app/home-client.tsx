"use client";

import Image from "next/image";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ProductSkeleton from "./components/ProductSkeleton";
import { analyticsEvent, trackAmazonClick, trackSearchEvent, utmParamsFromSearchParams } from "./lib/analytics";
import { COMPANY_DISPLAY_NAME } from "./lib/site";

type Product = {
  title: string;
  price: string;
  priceValue: number;
  rating: number;
  image: string;
  link: string;
};

type PriceRange = "all" | "starter" | "mid" | "high" | "pro";
type SortBy = "newest" | "price_asc" | "price_desc";

type SearchTrackSnapshot = {
  query: string;
  results_count: number;
  is_cached: boolean;
};

function headlineVariantValue(variant: number): "v1" | "v2" {
  return variant === 2 ? "v2" : "v1";
}

const MAX_QUERY_LENGTH = 120;
const MARKETPLACE_SKELETON_COUNT = 16;
const SEARCH_PROGRESS_RAMP_MS = 4000;
const SEARCH_PROGRESS_CAP_PCT = 90;
const SEARCH_PROGRESS_FADE_HOLD_MS = 220;
const SEARCH_PROGRESS_FADE_OUT_MS = 320;

const RESULT_REVEAL_STAGGER_MS = 55;

/** Make.com scenario webhook — waitlist form POSTs JSON `{ email }` here. */
const WAITLIST_WEBHOOK_URL =
  "https://hook.eu1.make.com/t6o1h7s8vg6pd07ngg4ok9qoyzli31ux";

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Do you sell products?",
    a: "No. We display public marketplace search results and link to retailer pages where you can review full details.",
  },
  {
    q: "Is this an official Amazon website?",
    a: `No. This is an independent tool operated by ${COMPANY_DISPLAY_NAME} and is not affiliated with or endorsed by Amazon.`,
  },
  {
    q: "Why do prices or ratings look different elsewhere?",
    a: "Listings change frequently. Third-party data can lag or omit fields. Always confirm price, availability, and policies on the retailer page.",
  },
  {
    q: "Do you guarantee demand, margins, or profitability?",
    a: "No. Any research output is informational only and not a promise of results.",
  },
  {
    q: "Why do you ask for cookies?",
    a: "Optional analytics help us improve performance and usability. You can reject optional cookies and still use the search tool.",
  },
  {
    q: "What does the affiliate disclosure mean?",
    a: "Some outbound links may include an affiliate tag. If you make a qualifying purchase, we may earn a commission at no extra cost to you.",
  },
  {
    q: "Is Prime shipping guaranteed on every item?",
    a: "No. Badges on cards are simplified labels for readability. Shipping programs depend on the specific listing and your location.",
  },
  {
    q: "How often is data refreshed?",
    a: "Results are fetched when you run a search (and when you change filters after a search). We do not claim real-time synchronization.",
  },
];

export default function HomeClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const headlineVariant = searchParams.get("v") === "2" ? 2 : 1;

  /**
   * List-mode URLs: `?s=keyword&type=list` auto-runs search (and fires `sw_search` after results).
   * Legacy: `?q=keyword` still auto-runs when `type` is not `list`.
   */
  const urlTypeIsList = searchParams.get("type") === "list";
  const fromS = (searchParams.get("s")?.trim() ?? "").slice(0, MAX_QUERY_LENGTH);
  const fromQ = (searchParams.get("q")?.trim() ?? "").slice(0, MAX_QUERY_LENGTH);
  const urlSearchQuery = urlTypeIsList ? (fromS || fromQ) : fromQ;

  const utmParamsFromUrl = useMemo(() => utmParamsFromSearchParams(searchParams), [searchParams]);

  const heroTitle = useMemo(
    () =>
      headlineVariant === 2
        ? "Research marketplace listings with less tab chaos."
        : "Marketplace listing research—with filters sellers actually use.",
    [headlineVariant]
  );

  const heroSubtitle = useMemo(
    () =>
      headlineVariant === 2
        ? "Search public Amazon.com results and slice by price band, minimum reviews, and sort order. Confirm everything on the destination listing."
        : "Search public Amazon.com results, then narrow by price, minimum star rating, and sort order. Always verify details on the retailer page before buying or sourcing.",
    [headlineVariant]
  );

  const [keyword, setKeyword] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [searchedKeyword, setSearchedKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [priceRange, setPriceRange] = useState<PriceRange>("all");
  const [minRating, setMinRating] = useState("4");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const skipNextAutoSearch = useRef(false);
  /** Ensures `trackSearchEvent` runs at most once per full page load. */
  const hasTracked = useRef(false);

  const [searchTrackSnapshot, setSearchTrackSnapshot] = useState<SearchTrackSnapshot | null>(
    null
  );

  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistStatus, setWaitlistStatus] = useState<"idle" | "sending" | "done" | "err">(
    "idle"
  );
  const [waitlistMessage, setWaitlistMessage] = useState("");

  const [resultsRevealKey, setResultsRevealKey] = useState(0);
  const [searchProgressPct, setSearchProgressPct] = useState(0);
  const [searchProgressMounted, setSearchProgressMounted] = useState(false);
  const [searchProgressFadeVisible, setSearchProgressFadeVisible] = useState(true);

  const rampRafRef = useRef<number | null>(null);
  const rampActiveRef = useRef(false);
  const progressTimeoutsRef = useRef<number[]>([]);

  const cancelProgressRamp = () => {
    rampActiveRef.current = false;
    if (rampRafRef.current != null) {
      cancelAnimationFrame(rampRafRef.current);
      rampRafRef.current = null;
    }
  };

  const clearProgressTimeouts = () => {
    progressTimeoutsRef.current.forEach((id) => clearTimeout(id));
    progressTimeoutsRef.current = [];
  };

  useEffect(() => {
    return () => {
      cancelProgressRamp();
      clearProgressTimeouts();
    };
  }, []);

  useEffect(() => {
    if (!searchTrackSnapshot || hasTracked.current) {
      return;
    }
    trackSearchEvent({
      query: searchTrackSnapshot.query,
      results_count: searchTrackSnapshot.results_count,
      is_cached: searchTrackSnapshot.is_cached,
      utm_params: utmParamsFromUrl,
    });
    analyticsEvent("sw_search", {
      search_term: searchTrackSnapshot.query,
      results_count: searchTrackSnapshot.results_count,
      is_cached: searchTrackSnapshot.is_cached,
      price_range: priceRange,
      min_rating: minRating,
      sort_by: sortBy,
      ab_variant: headlineVariantValue(headlineVariant),
    });
    hasTracked.current = true;
  }, [
    searchTrackSnapshot,
    utmParamsFromUrl,
    headlineVariant,
    priceRange,
    minRating,
    sortBy,
  ]);

  const performSearch = useCallback(
    async (searchTerm: string) => {
      const trimmedKeyword = searchTerm.trim();
      if (!trimmedKeyword) {
        return;
      }

      cancelProgressRamp();
      clearProgressTimeouts();

      setSearchProgressMounted(true);
      setSearchProgressFadeVisible(true);
      setSearchProgressPct(0);

      rampActiveRef.current = true;
      const rampStartedAt = performance.now();
      const rampStep = () => {
        if (!rampActiveRef.current) {
          return;
        }
        const elapsed = performance.now() - rampStartedAt;
        const pct = Math.min(
          SEARCH_PROGRESS_CAP_PCT,
          (elapsed / SEARCH_PROGRESS_RAMP_MS) * SEARCH_PROGRESS_CAP_PCT
        );
        setSearchProgressPct(pct);
        if (pct < SEARCH_PROGRESS_CAP_PCT && rampActiveRef.current) {
          rampRafRef.current = requestAnimationFrame(rampStep);
        } else {
          rampRafRef.current = null;
        }
      };
      rampRafRef.current = requestAnimationFrame(rampStep);

      setIsLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          q: trimmedKeyword,
          priceRange,
          minRating,
          sortBy,
        });
        const response = await fetch(`/api/search?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Search failed");
        }

        const list = Array.isArray(data?.products) ? data.products : [];
        setProducts(list);
        setResultsRevealKey((k) => k + 1);
        setSearchTrackSnapshot({
          query: trimmedKeyword,
          results_count: list.length,
          is_cached: data?.isCached === true || data?.cached === true,
        });

        cancelProgressRamp();
        setSearchProgressPct(100);
        progressTimeoutsRef.current.push(
          window.setTimeout(() => setSearchProgressFadeVisible(false), SEARCH_PROGRESS_FADE_HOLD_MS)
        );
        progressTimeoutsRef.current.push(
          window.setTimeout(() => {
            setSearchProgressMounted(false);
            setSearchProgressPct(0);
            setSearchProgressFadeVisible(true);
          }, SEARCH_PROGRESS_FADE_HOLD_MS + SEARCH_PROGRESS_FADE_OUT_MS)
        );
      } catch (fetchError) {
        setProducts([]);
        setError(
          fetchError instanceof Error ? fetchError.message : "Something went wrong while searching."
        );
        cancelProgressRamp();
        progressTimeoutsRef.current.push(
          window.setTimeout(() => setSearchProgressFadeVisible(false), 0)
        );
        progressTimeoutsRef.current.push(
          window.setTimeout(() => {
            setSearchProgressMounted(false);
            setSearchProgressPct(0);
            setSearchProgressFadeVisible(true);
          }, SEARCH_PROGRESS_FADE_OUT_MS)
        );
      } finally {
        setIsLoading(false);
      }
    },
    [minRating, priceRange, sortBy]
  );

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedKeyword = keyword.trim().slice(0, MAX_QUERY_LENGTH);
    if (!trimmedKeyword) {
      setProducts([]);
      setSearchedKeyword("");
      setError("");
      const next = new URLSearchParams(searchParams.toString());
      next.delete("q");
      next.delete("s");
      next.delete("type");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      return;
    }

    skipNextAutoSearch.current = true;
    setSearchedKeyword(trimmedKeyword);
    await performSearch(trimmedKeyword);

    const next = new URLSearchParams(searchParams.toString());
    next.set("s", trimmedKeyword);
    next.set("type", "list");
    next.delete("q");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  useEffect(() => {
    if (!urlSearchQuery) {
      return;
    }
    queueMicrotask(() => {
      setKeyword(urlSearchQuery);
      setSearchedKeyword(urlSearchQuery);
    });
  }, [urlSearchQuery]);

  useEffect(() => {
    if (!searchedKeyword) {
      return;
    }
    if (skipNextAutoSearch.current) {
      skipNextAutoSearch.current = false;
      return;
    }
    void performSearch(searchedKeyword);
  }, [searchedKeyword, priceRange, minRating, sortBy, performSearch]);

  const submitWaitlist = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = waitlistEmail.trim().toLowerCase();
    if (!trimmed) {
      setWaitlistStatus("err");
      setWaitlistMessage("Enter a valid email.");
      return;
    }

    setWaitlistStatus("sending");
    setWaitlistMessage("");

    try {
      const response = await fetch(WAITLIST_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      if (!response.ok) {
        throw new Error("Failed to subscribe");
      }

      setWaitlistStatus("done");
      setWaitlistMessage("Thanks—saved. We will only email you about product research updates.");
      setWaitlistEmail("");
      analyticsEvent("sw_waitlist_submit", { ab_variant: headlineVariantValue(headlineVariant) });
    } catch (subscribeError) {
      setWaitlistStatus("err");
      setWaitlistMessage(
        subscribeError instanceof Error ? subscribeError.message : "Something went wrong."
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white font-sans text-emerald-950">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-12 md:px-10">
        <section className="rounded-3xl border border-emerald-200 bg-white/85 p-6 shadow-xl shadow-emerald-100 backdrop-blur-sm md:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            Independent tool · Not affiliated with Amazon
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-emerald-900 md:text-4xl">
            {heroTitle}
          </h1>
          <p className="mt-2 text-sm text-emerald-700 md:text-base">{heroSubtitle}</p>

          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-xs text-amber-950 md:text-sm">
            <span className="font-semibold">Affiliate disclosure:</span> As an Amazon Associate,{" "}
            {COMPANY_DISPLAY_NAME} earns from qualifying purchases. Outbound links may include
            affiliate tracking.
          </p>

          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 md:p-5">
            <h2 className="text-sm font-semibold text-emerald-900">Get research tips (optional)</h2>
            <p className="mt-1 text-xs text-emerald-800 md:text-sm">
              Leave your email for occasional updates on how to use this tool responsibly. No spam.
            </p>
            <form
              className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center"
              onSubmit={submitWaitlist}
            >
              <input
                type="email"
                name="email"
                value={waitlistEmail}
                onChange={(event) => setWaitlistEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@company.com"
                className="h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm outline-none ring-emerald-500 focus:border-emerald-400 focus:ring-2"
              />
              <button
                type="submit"
                disabled={waitlistStatus === "sending"}
                className="h-11 shrink-0 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
              >
                {waitlistStatus === "sending" ? "Saving…" : "Join waitlist"}
              </button>
            </form>
            {waitlistMessage ? (
              <p
                className={`mt-2 text-xs md:text-sm ${waitlistStatus === "err" ? "text-red-700" : "text-emerald-800"}`}
              >
                {waitlistMessage}
              </p>
            ) : null}
          </div>

          <form
            className="mt-6 flex flex-col gap-3 sm:flex-row"
            onSubmit={handleSearch}
          >
            <input
              type="text"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Search keywords, niche ideas, or a public ASIN…"
              className="h-12 w-full rounded-xl border border-emerald-200 bg-white px-4 text-sm outline-none ring-emerald-500 transition focus:border-emerald-400 focus:ring-2"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="h-12 rounded-xl bg-emerald-600 px-6 font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              {isLoading ? "Searching…" : "Search"}
            </button>
          </form>

          {searchProgressMounted ? (
            <div
              className="pointer-events-none mt-2 h-1 overflow-hidden rounded-full bg-emerald-100 transition-opacity duration-300 ease-out"
              style={{
                opacity: searchProgressFadeVisible ? 1 : 0,
              }}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(Math.min(100, searchProgressPct))}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 shadow-sm shadow-emerald-400/30"
                style={{ width: `${searchProgressPct}%` }}
              />
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 md:grid-cols-3">
            <label className="text-sm font-medium text-emerald-800">
              Price
              <select
                value={priceRange}
                onChange={(event) => setPriceRange(event.target.value as PriceRange)}
                className="mt-1 h-10 w-full rounded-lg border border-emerald-200 bg-white px-3 text-sm"
              >
                <option value="all">All prices</option>
                <option value="starter">Starter: $100 – $300</option>
                <option value="mid">Mid-range: $300 – $1,000</option>
                <option value="high">High-end: $1,000 – $3,000</option>
                <option value="pro">Pro / luxury: over $3,000</option>
              </select>
            </label>

            <label className="text-sm font-medium text-emerald-800">
              Minimum rating
              <select
                value={minRating}
                onChange={(event) => setMinRating(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-emerald-200 bg-white px-3 text-sm"
              >
                <option value="4">4 stars and up</option>
                <option value="4.5">4.5 stars and up</option>
              </select>
            </label>

            <label className="text-sm font-medium text-emerald-800">
              Sort
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortBy)}
                className="mt-1 h-10 w-full rounded-lg border border-emerald-200 bg-white px-3 text-sm"
              >
                <option value="newest">Best match (search order)</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
              </select>
            </label>
          </div>
        </section>

        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-emerald-900 md:text-2xl">
              Marketplace results
            </h2>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              {products.length} results{searchedKeyword ? "" : " · run a search"}
            </span>
          </div>

          <p className="mb-2 text-xs text-emerald-600">
            Last updated: refreshed on each search (not a live guarantee).
          </p>

          {searchedKeyword && (
            <p className="mb-4 text-sm text-emerald-700">
              Showing results for:{" "}
              <span className="font-semibold">&quot;{searchedKeyword}&quot;</span>
            </p>
          )}

          {isLoading ? (
            <div className="mt-6 space-y-4" role="status" aria-live="polite">
              <p className="rounded-xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50 via-white to-teal-50 px-5 py-3.5 shadow-sm shadow-emerald-100/70">
                <span className="finding-banner-text text-xl font-bold tracking-tight md:text-2xl">
                  Finding…
                </span>
              </p>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: MARKETPLACE_SKELETON_COUNT }, (_, index) => (
                  <ProductSkeleton key={index} />
                ))}
              </div>
            </div>
          ) : null}

          {!isLoading && error && (
            <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          )}

          {!isLoading && !error && products.length > 0 ? (
            <div
              key={resultsRevealKey}
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
            >
              {products.map((product, index) => (
                <article
                  key={`${product.link}-${product.title}`}
                  className="product-grid-reveal-card group relative flex flex-col overflow-hidden rounded-2xl border border-emerald-100/70 bg-white shadow-lg shadow-emerald-100/60 ring-1 ring-emerald-100/60 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-emerald-200 hover:shadow-2xl hover:shadow-emerald-300/40 hover:ring-emerald-200"
                  style={{
                    animationDelay: `${Math.min(index, 30) * RESULT_REVEAL_STAGGER_MS}ms`,
                  }}
                >
                  <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-400/0 via-emerald-400/0 to-teal-400/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:from-emerald-400/10 group-hover:to-teal-400/10" />

                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-slate-50 via-white to-emerald-50">
                    <Image
                      src={product.image || "https://via.placeholder.com/400x300?text=No+Image"}
                      alt={product.title}
                      width={400}
                      height={300}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-contain p-4 transition-transform duration-500 ease-out group-hover:scale-110"
                    />

                    <div className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-0 transition-all duration-700 ease-out group-hover:left-[120%] group-hover:opacity-100" />

                    {product.rating >= 4.5 && (
                      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-orange-500/40">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                        </span>
                        Top pick
                      </div>
                    )}

                    <span
                      className="pointer-events-none absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-emerald-600 shadow-md backdrop-blur-sm"
                      aria-hidden="true"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 opacity-60"
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <h3 className="line-clamp-2 min-h-[3rem] text-sm font-semibold leading-relaxed text-emerald-950 transition-colors group-hover:text-emerald-700">
                      {product.title}
                    </h3>

                    <div className="flex items-center gap-2">
                      <div
                        className="flex items-center gap-0.5 rounded-md bg-amber-50 px-2 py-1 ring-1 ring-amber-100"
                        aria-label={`Rated ${product.rating.toFixed(1)} out of 5`}
                      >
                        {Array.from({ length: 5 }, (_, starIndex) => (
                          <svg
                            key={`${product.link}-star-${starIndex}`}
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            className={`h-3.5 w-3.5 ${
                              starIndex < Math.round(product.rating)
                                ? "fill-amber-400 text-amber-400"
                                : "fill-transparent text-amber-200"
                            }`}
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                          >
                            <path d="M12 2.5l2.95 5.97 6.59.96-4.77 4.65 1.13 6.57L12 17.55l-5.9 3.1 1.13-6.57L2.46 9.43l6.59-.96L12 2.5z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-xs font-semibold text-amber-700">
                        {product.rating.toFixed(1)}
                      </span>
                    </div>

                    <div className="flex items-end justify-between gap-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-semibold text-emerald-600">
                          {product.price.replace(/[\d.,]/g, "").trim() || "$"}
                        </span>
                        <span className="text-3xl font-black tracking-tight text-emerald-700">
                          {product.price.replace(/[^\d.,]/g, "") || product.price}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 ring-1 ring-slate-200">
                        Listing
                      </span>
                    </div>

                    <a
                      href={product.link}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      onClick={() =>
                        trackAmazonClick({
                          product_name: product.title,
                          product_price: product.price,
                          position: index + 1,
                          utm_campaign: utmParamsFromUrl.utm_campaign,
                        })
                      }
                      className="group/btn relative mt-1 inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 bg-[length:200%_100%] py-2.5 text-center text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:-translate-y-1 hover:bg-[position:100%_0] hover:shadow-xl hover:shadow-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:translate-y-0"
                    >
                      <span>View on Amazon</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1"
                      >
                        <path d="M5 12h14M13 5l7 7-7 7" />
                      </svg>
                    </a>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {!isLoading && !error && searchedKeyword && products.length === 0 && (
            <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              No products matched your filters. Try another keyword or relax filters.
            </p>
          )}
        </section>

        <section className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold text-emerald-900">How it works</h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-emerald-900">
              <li>Enter a keyword your buyers might type into a public marketplace search.</li>
              <li>We request search results and apply your price and rating filters server-side.</li>
              <li>Open a listing to verify specs, shipping, returns, and the latest price.</li>
              <li>Use this as a starting point—not a substitute for supplier due diligence.</li>
            </ol>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-white/80 p-5">
            <h2 className="text-xl font-semibold text-emerald-900">Limitations</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-emerald-900">
              <li>Images and ratings come from third-party data and may be incomplete.</li>
              <li>We do not guarantee inventory, coupons, or shipping speed.</li>
              <li>
                A/B test landing copy with <span className="font-mono text-xs">?v=1</span> or{" "}
                <span className="font-mono text-xs">?v=2</span>, or use{" "}
                <span className="font-mono text-xs">/lp-a</span> and{" "}
                <span className="font-mono text-xs">/lp-b</span>.
              </li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-emerald-900">FAQ</h2>
          <div className="mt-4 divide-y divide-emerald-100 rounded-2xl border border-emerald-200 bg-white/80">
            {FAQ_ITEMS.map((item) => (
              <details key={item.q} className="group px-4 py-3">
                <summary className="cursor-pointer list-none text-sm font-semibold text-emerald-900 group-open:text-emerald-700">
                  {item.q}
                </summary>
                <p className="mt-2 text-sm text-emerald-800">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
