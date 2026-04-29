"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

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

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [searchedKeyword, setSearchedKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [priceRange, setPriceRange] = useState<PriceRange>("all");
  const [minRating, setMinRating] = useState("4");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const skipNextAutoSearch = useRef(false);

  const performSearch = useCallback(
    async (searchTerm: string) => {
      const trimmedKeyword = searchTerm.trim();
      if (!trimmedKeyword) {
        return;
      }

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

        setProducts(Array.isArray(data?.products) ? data.products : []);
      } catch (fetchError) {
        setProducts([]);
        setError(
          fetchError instanceof Error ? fetchError.message : "Something went wrong while searching."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [priceRange, minRating, sortBy]
  );

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) {
      setProducts([]);
      setSearchedKeyword("");
      setError("");
      return;
    }

    setIsLoading(true);
    skipNextAutoSearch.current = true;
    setSearchedKeyword(trimmedKeyword);
    await performSearch(trimmedKeyword);
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white font-sans text-emerald-950">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-12 md:px-10">
        <section className="rounded-3xl border border-emerald-200 bg-white/85 p-6 shadow-xl shadow-emerald-100 backdrop-blur-sm md:p-8">
          <h1 className="text-3xl font-bold tracking-tight text-emerald-900 md:text-4xl">
            Amazon Winning Product Finder
          </h1>
          <p className="mt-2 text-sm text-emerald-700 md:text-base">
            Discover high-potential products with strong demand and healthy
            margins.
          </p>

          <form
            className="mt-6 flex flex-col gap-3 sm:flex-row"
            onSubmit={handleSearch}
          >
            <input
              type="text"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Search product keyword, niche, or ASIN..."
              className="h-12 w-full rounded-xl border border-emerald-200 bg-white px-4 text-sm outline-none ring-emerald-500 transition focus:border-emerald-400 focus:ring-2"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="h-12 rounded-xl bg-emerald-600 px-6 font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              {isLoading ? "Searching..." : "Search"}
            </button>
          </form>

          <div className="mt-4 grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 md:grid-cols-3">
            <label className="text-sm font-medium text-emerald-800">
              Price
              <select
                value={priceRange}
                onChange={(event) => setPriceRange(event.target.value as PriceRange)}
                className="mt-1 h-10 w-full rounded-lg border border-emerald-200 bg-white px-3 text-sm"
              >
                <option value="all">All Prices</option>
                <option value="starter">Starter: $100 - $300</option>
                <option value="mid">Mid-Range: $300 - $1,000</option>
                <option value="high">High-End: $1,000 - $3,000</option>
                <option value="pro">Pro/Luxury: Trên $3,000</option>
              </select>
            </label>

            <label className="text-sm font-medium text-emerald-800">
              Rating
              <select
                value={minRating}
                onChange={(event) => setMinRating(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-emerald-200 bg-white px-3 text-sm"
              >
                <option value="4">4 stars & up</option>
                <option value="4.5">4.5 stars & up</option>
              </select>
            </label>

            <label className="text-sm font-medium text-emerald-800">
              Sort
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortBy)}
                className="mt-1 h-10 w-full rounded-lg border border-emerald-200 bg-white px-3 text-sm"
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price Low to High</option>
                <option value="price_desc">Price High to Low</option>
              </select>
            </label>
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-emerald-900 md:text-2xl">
              Sample Winning Products
            </h2>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              {products.length} results
            </span>
          </div>

          {searchedKeyword && (
            <p className="mb-4 text-sm text-emerald-700">
              Showing results for:{" "}
              <span className="font-semibold">&quot;{searchedKeyword}&quot;</span>
            </p>
          )}

          {isLoading && (
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-700" />
              <span className="text-sm font-medium">Finding best matches...</span>
            </div>
          )}

          {!isLoading && error && (
            <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          )}

          {!isLoading && !error && products.length > 0 && (
            <div className="grid gap-6 transition-all duration-300 ease-out sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => (
                <article
                  key={`${product.link}-${product.title}`}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-emerald-100/70 bg-white shadow-lg shadow-emerald-100/60 ring-1 ring-emerald-100/60 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-emerald-200 hover:shadow-2xl hover:shadow-emerald-300/40 hover:ring-emerald-200"
                >
                  <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-400/0 via-emerald-400/0 to-teal-400/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:from-emerald-400/10 group-hover:to-teal-400/10" />

                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-slate-50 via-white to-emerald-50">
                    <Image
                      src={product.image || "https://via.placeholder.com/400x300?text=No+Image"}
                      alt={product.title}
                      width={400}
                      height={300}
                      className="absolute inset-0 h-full w-full object-contain p-4 transition-transform duration-500 ease-out group-hover:scale-110"
                    />

                    <div className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-0 transition-all duration-700 ease-out group-hover:left-[120%] group-hover:opacity-100" />

                    <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-orange-500/40">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                      </span>
                      Top Pick
                    </div>

                    <button
                      type="button"
                      aria-label="Save to wishlist"
                      className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-emerald-600 shadow-md backdrop-blur-sm transition hover:scale-110 hover:bg-white hover:text-rose-500"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
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
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700 ring-1 ring-sky-100">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="h-3 w-3"
                        >
                          <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
                        </svg>
                        Prime
                      </span>
                    </div>

                    <a
                      href={product.link}
                      target="_blank"
                      rel="noopener noreferrer"
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
          )}

          {!isLoading && !error && searchedKeyword && products.length === 0 && (
            <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              No products found. Try another keyword.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
