import { readFileSync } from "fs";
import { join } from "path";
import { Suspense } from "react";
import LandingProductGrid from "./components/LandingProductGrid";
import { selectMotherDayAdsGrid } from "./lib/landingAdsCatalog";
import type { LandingCatalogFile } from "./lib/landingCatalog";
import HomeClient from "./home-client";

/** Static mode: chỉ đọc từ `data/products.json`, không gọi API runtime. */
export const dynamic = "force-static";

function loadLandingCatalog(): LandingCatalogFile {
  const p = join(process.cwd(), "data", "products.json");
  const raw = readFileSync(p, "utf8");
  const parsed = JSON.parse(raw) as LandingCatalogFile | LandingCatalogFile["products"];
  if (Array.isArray(parsed)) {
    return { products: parsed };
  }
  return parsed;
}

function FeaturedSectionFallback() {
  return (
    <div className="rounded-3xl border border-rose-100/80 bg-gradient-to-br from-white to-rose-50/30 p-8 text-center text-sm text-emerald-700">
      Loading smart home picks...
    </div>
  );
}

function readAdsQuery(sp: Record<string, string | string[] | undefined>): string | null {
  const raw = sp.q;
  if (raw == null) {
    return null;
  }
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (typeof s !== "string" || !s.trim()) {
    return null;
  }
  return s.trim().slice(0, 200);
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const adsQuery = readAdsQuery(sp);
  const landingCatalog = loadLandingCatalog();
  const gridProducts = selectMotherDayAdsGrid(landingCatalog, adsQuery);

  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeClient
        campaignSections={
          <Suspense fallback={<FeaturedSectionFallback />}>
            <LandingProductGrid products={gridProducts} />
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
