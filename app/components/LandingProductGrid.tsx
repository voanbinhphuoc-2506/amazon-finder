"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { buildAmazonImmortalDpUrl } from "@/app/lib/landingAdsCatalog";
import {
  LANDING_GRID_SLOTS,
  type LandingCatalogProduct,
} from "@/app/lib/landingCatalog";
import { trackAmazonClick, utmParamsFromSearchParams } from "@/app/lib/analytics";

type Slot = LandingCatalogProduct | null;

function buildSlots(products: LandingCatalogProduct[]): Slot[] {
  const slice = products.slice(0, LANDING_GRID_SLOTS);
  const out: Slot[] = [...slice];
  while (out.length < LANDING_GRID_SLOTS) {
    out.push(null);
  }
  return out;
}

export default function LandingProductGrid({
  products,
}: {
  products: LandingCatalogProduct[];
}) {
  const searchParams = useSearchParams();
  const utm = utmParamsFromSearchParams(searchParams);
  const slots = buildSlots(products);

  return (
    <section
      id="featured-picks"
      className="scroll-mt-28 rounded-3xl border border-rose-100/80 bg-gradient-to-br from-white via-rose-50/20 to-amber-50/30 p-5 shadow-lg shadow-rose-100/40 ring-1 ring-amber-100/50 md:p-8"
      aria-labelledby="featured-picks-heading"
    >
      <div className="mb-6 border-b border-rose-100/80 pb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">
          Mother&apos;s Day 2026
        </p>
        <h2
          id="featured-picks-heading"
          className="mt-1 text-2xl font-bold tracking-tight text-emerald-950 md:text-3xl"
        >
          Featured picks — direct listings
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {slots.map((slot, index) =>
          slot ? (
            <article
              key={`${slot.asin}-${index}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-rose-100/90 bg-white/95 shadow-md shadow-rose-100/30 ring-1 ring-amber-50/50 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-200/50"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-amber-50 to-rose-50">
                <Image
                  src={slot.image || "https://via.placeholder.com/400x300?text=No+image"}
                  alt={slot.title}
                  width={400}
                  height={300}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  loading={index < 4 ? "eager" : "lazy"}
                  priority={index === 0}
                  className="h-full w-full object-contain p-3 transition duration-500 group-hover:scale-105"
                />
                {slot.is_prime ? (
                  <span className="absolute left-2 top-2 rounded-full bg-gradient-to-r from-sky-600 to-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                    Prime
                  </span>
                ) : null}
                {slot.rating > 4.5 ? (
                  <span className="absolute right-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                    {slot.rating.toFixed(1)}★
                  </span>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-600">
                  {slot.keyword}
                </p>
                <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-emerald-950">
                  {slot.title}
                </h3>
                <p className="text-sm font-bold text-emerald-800">{slot.price}</p>
                <a
                  href={buildAmazonImmortalDpUrl(slot.asin)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackAmazonClick({
                      product_name: slot.title,
                      product_price: slot.price,
                      position: index + 1,
                      utm_campaign: utm.utm_campaign,
                    })
                  }
                  className="mt-auto inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-2.5 text-center text-sm font-bold text-white shadow-md shadow-orange-400/30 transition hover:scale-[1.02] hover:from-orange-400 hover:to-amber-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
                >
                  View on Amazon
                </a>
              </div>
            </article>
          ) : (
            <div
              key={`empty-${index}`}
              className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-200/60 bg-emerald-50/30 p-4 text-center text-sm text-emerald-600/90"
            >
              <span className="font-medium text-emerald-800">Coming soon</span>
            </div>
          )
        )}
      </div>

      <p
        className="mt-8 border-t border-emerald-100/90 pt-6 text-center text-xs text-emerald-700/80 md:text-sm"
        role="note"
      >
        As an Amazon Associate, we earn from qualifying purchases.
      </p>
    </section>
  );
}
