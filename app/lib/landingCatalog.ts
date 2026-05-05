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
};

export type LandingCatalogFile = {
  updatedAt: string;
  products: LandingCatalogProduct[];
};

export const LANDING_GRID_SLOTS = 16;
