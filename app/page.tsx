import { Suspense } from "react";
import HomeClient from "./home-client";
import {
  MothersDayCampaignShowcase,
  type MothersDayStaticLinks,
} from "./mothers-day-showcase";

/**
 * Static Amazon affiliate URLs (no API). Single-line href strings, no leading/trailing spaces.
 * Gift guide + spotlight + hot list use search (/s?k=…&tag=anvopro-20) for reliable landing pages.
 */
const MOTHERS_DAY_STATIC_LINKS: MothersDayStaticLinks = {
  browse: {
    techMom:
      `https://www.amazon.com/s?k=Mother's+Day+tech+gifts+Kindle&tag=anvopro-20`,
    wellnessMom:
      "https://www.amazon.com/s?k=massage+gun+neck+massager+deals&tag=anvopro-20",
    homeChef:
      "https://www.amazon.com/s?k=air+fryer+espresso+machine+deals&tag=anvopro-20",
    jewelryTimeless:
      "https://www.amazon.com/s?k=Swarovski+jewelry+Mother%27s+Day+gift&tag=anvopro-20",
  },
  checkPriceTopRated: {
    kindle:
      "https://www.amazon.com/s?k=Kindle+Paperwhite+latest+model&tag=anvopro-20",
    photoFrame:
      "https://www.amazon.com/s?k=10+inch+digital+photo+frame+wifi&tag=anvopro-20",
    robotVacuum:
      "https://www.amazon.com/s?k=slim+robot+vacuum+cleaner+deals&tag=anvopro-20",
  },
  checkPriceBestSellers: {
    spaGiftBasket:
      "https://www.amazon.com/s?k=Luxury+Spa+Gift+Basket+for+Women&tag=anvopro-20",
    silkPillowcase:
      "https://www.amazon.com/s?k=Mulberry+Silk+Pillowcase+for+hair+and+skin&tag=anvopro-20",
    smartEspresso:
      "https://www.amazon.com/s?k=smart+espresso+machine+with+milk+frother&tag=anvopro-20",
  },
};

export default function HomePage() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeClient
        campaignSections={
          <MothersDayCampaignShowcase links={MOTHERS_DAY_STATIC_LINKS} />
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
