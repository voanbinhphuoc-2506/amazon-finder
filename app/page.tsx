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

      console.log("Search keyword:", trimmedKeyword);
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
              <span className="text-sm font-medium">Dang san tim san pham tot nhat...</span>
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
                  className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-md shadow-emerald-100/70 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg"
                >
                  <Image
                    src={product.image || "https://via.placeholder.com/400x300?text=No+Image"}
                    alt={product.title}
                    width={400}
                    height={300}
                    className="h-44 w-full object-cover"
                  />
                  <div className="space-y-3 p-4">
                    <h3 className="line-clamp-2 min-h-12 text-sm font-semibold text-emerald-900">
                      {product.title}
                    </h3>
                    <p className="text-xl font-bold text-emerald-700">{product.price}</p>
                    <a
                      href={product.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full rounded-lg bg-emerald-600 py-2 text-center text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      View on Amazon
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
