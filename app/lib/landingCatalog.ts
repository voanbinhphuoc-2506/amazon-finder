/** Shape of `data/products.json` (filled by `scripts/amazon_rainforest_search.py`). */

export type LandingCatalogProduct = {
  keyword: string;
  title: string;
  asin: string;
  price: string;
  priceValue: number;
  rating: number;
  is_prime: boolean;
  image: string;
  link: string;
  /** Ngày giao sớm nhất (ISO), từ script Rainforest — dùng lọc ads. */
  earliest_delivery?: string;
};

export type LandingCatalogCategory = {
  slug: string;
  search_query: string;
  product_count: number;
  products: LandingCatalogProduct[];
};

export type LandingCatalogFile = {
  updatedAt: string;
  products: LandingCatalogProduct[];
  categories?: LandingCatalogCategory[];
  meta?: Record<string, unknown>;
};

export const LANDING_GRID_SLOTS = 16;
