import { Suspense } from "react";
import HomeClient from "./home-client";
import { MothersDayCampaignShowcase } from "./mothers-day-showcase";

export default function HomePage() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeClient campaignSections={<MothersDayCampaignShowcase />} />
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
