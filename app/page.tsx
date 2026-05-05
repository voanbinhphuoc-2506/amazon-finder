import { readFileSync } from "fs";
import { join } from "path";
import { Suspense } from "react";
import LandingProductGrid from "./components/LandingProductGrid";
import type { LandingCatalogFile } from "./lib/landingCatalog";
import HomeClient from "./home-client";

/** Đọc catalog mỗi request để `scripts/amazon_rainforest_search.py` cập nhật file không cần build lại (dev). */
export const dynamic = "force-dynamic";

function loadLandingCatalog(): LandingCatalogFile {
  const p = join(process.cwd(), "data", "products.json");
  const raw = readFileSync(p, "utf8");
  return JSON.parse(raw) as LandingCatalogFile;
}

function FeaturedSectionFallback() {
  return (
    <div className="rounded-3xl border border-rose-100/80 bg-gradient-to-br from-white to-rose-50/30 p-8 text-center text-sm text-emerald-700">
      Loading featured picks…
    </div>
  );
}

export default function HomePage() {
  const landingCatalog = loadLandingCatalog();
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeClient
        campaignSections={
          <Suspense fallback={<FeaturedSectionFallback />}>
            <LandingProductGrid products={landingCatalog.products} />
          </Suspense>
        }
      />
    </Suspense>
  );
}

function HomeFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-gradient-to-b from-emerald-50 to-white text-emerald-800">
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-white/90 px-6 py-4 shadow-sm">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-700" />
        <span className="text-sm font-medium">Loading…</span>
      </div>
    </div>
  );
}
