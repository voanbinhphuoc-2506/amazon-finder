/** Shape of `data/products.json` (filled by `scripts/amazon_rainforest_search.py`). */

export type LandingCatalogProduct = {
  keyword?: string;
  title: string;
  asin: string;
  price: string | number;
  priceValue?: number;
  rating: number;
  is_prime?: boolean;
  image: string;
  link?: string;
  /** Flat JSON schema mới: category theo slug (vd robot-vacuum). */
  category?: string;
  /** Luôn hiển thị trong lưới Featured (không bị cắt bởi sort top 16). */
  featured?: boolean;
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
  updatedAt?: string;
  last_updated?: string;
  products: LandingCatalogProduct[];
  categories?: LandingCatalogCategory[];
  meta?: Record<string, unknown>;
};

export const LANDING_GRID_SLOTS = 16;
