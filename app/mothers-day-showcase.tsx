import Image from "next/image";

export type MothersDayStaticLinks = {
  browse: {
    techMom: string;
    wellnessMom: string;
    homeChef: string;
    jewelryTimeless: string;
  };
  checkPriceTopRated: {
    kindle: string;
    photoFrame: string;
    robotVacuum: string;
  };
  checkPriceBestSellers: {
    spaGiftBasket: string;
    silkPillowcase: string;
    smartEspresso: string;
  };
};

const sectionShell =
  "scroll-mt-28 rounded-2xl border border-rose-100/80 bg-gradient-to-br from-white via-rose-50/30 to-amber-50/40 p-5 shadow-lg shadow-rose-100/40 ring-1 ring-amber-100/60 md:p-8";

const cardBase =
  "group overflow-hidden rounded-2xl border border-rose-100/90 bg-white/95 shadow-md shadow-rose-100/30 ring-1 ring-amber-50/50 transition duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl hover:shadow-rose-200/50";

const ctaAmazonClass =
  "inline-flex min-h-12 w-full origin-center items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 text-center text-sm font-bold text-white shadow-lg shadow-orange-400/35 transition duration-200 hover:scale-105 hover:from-orange-400 hover:to-amber-400 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2";

const ctaBrowseClass =
  "inline-flex min-h-12 w-full origin-center items-center justify-center rounded-xl border-2 border-amber-300/90 bg-gradient-to-b from-amber-50 to-white px-4 py-3 text-sm font-bold text-amber-950 shadow-sm transition duration-200 hover:scale-105 hover:border-orange-400 hover:bg-amber-100/80 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2";

const AMAZON_REL = "noopener noreferrer";

/** Intrinsic dimensions for next/image (4:3 cards). */
const IMG_4_3 = { width: 800, height: 600 } as const;
/** Spotlight cards: square crop for stable CLS. */
const IMG_SQUARE = { width: 800, height: 800 } as const;

function StarRating({ value, label }: { value: number; label: string }) {
  const filledCount = Math.min(5, Math.round(value));
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={label}>
      <div className="flex items-center gap-0.5" role="img">
        {Array.from({ length: 5 }, (_, i) => {
          const filled = i < filledCount;
          return (
            <svg
              key={i}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className={`h-4 w-4 md:h-5 md:w-5 ${
                filled ? "fill-amber-400 text-amber-400" : "fill-transparent text-amber-200"
              }`}
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 2.5l2.95 5.97 6.59.96-4.77 4.65 1.13 6.57L12 17.55l-5.9 3.1 1.13-6.57L2.46 9.43l6.59-.96L12 2.5z" />
            </svg>
          );
        })}
      </div>
      <span className="text-sm font-bold text-amber-900">{value.toFixed(1)}/5</span>
    </div>
  );
}

const categories = [
  {
    title: "Tech Mom",
    browseKey: "techMom" as const,
    blurb: "Gadgets she will reach for every single day.",
    image:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80",
    alt: "Tech gadgets and devices for mom",
  },
  {
    title: "Wellness Mom",
    browseKey: "wellnessMom" as const,
    blurb: "Restore, recharge, and feel genuinely cared for.",
    image:
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80",
    alt: "Wellness and self-care essentials",
  },
  {
    title: "Home Chef",
    browseKey: "homeChef" as const,
    blurb: "Kitchen upgrades that make cooking feel effortless.",
    image:
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80",
    alt: "Kitchen tools and cooking inspiration",
  },
  {
    title: "Jewelry & Timeless Gifts",
    browseKey: "jewelryTimeless" as const,
    blurb: "Elegant pieces that make her shine every day.",
    image:
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80",
    alt: "Fine jewelry and timeless gift ideas",
  },
] as const;

const topRated = [
  {
    title: "Kindle Paperwhite (2026)",
    rating: 4.8,
    highlights: ["Waterproof", "10-week battery"],
    priceHrefKey: "kindle" as const,
    image:
      "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
    alt: "E-reader and reading lifestyle",
  },
  {
    title: "Digital Photo Frame (10-inch)",
    rating: 4.7,
    highlights: ["Instant Wi-Fi sharing", "HD Touchscreen"],
    priceHrefKey: "photoFrame" as const,
    image:
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80",
    alt: "Digital photo frame on a shelf",
  },
  {
    title: "Robot Vacuum (Ultra Slim)",
    rating: 4.6,
    highlights: ["Self-emptying", "Pet hair expert"],
    priceHrefKey: "robotVacuum" as const,
    image:
      "https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=800&q=80",
    alt: "Robot vacuum on hardwood floor",
  },
] as const;

const bestSellers = [
  {
    badge: "Best Seller" as const,
    title: "Luxury Spa Gift Basket",
    blurb: "Spa-night essentials she can unwrap tonight.",
    priceHrefKey: "spaGiftBasket" as const,
    image:
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
    alt: "Spa setting with candles and relaxation essentials",
  },
  {
    badge: "Mom's Favorite" as const,
    title: "Mulberry Silk Pillowcase",
    blurb: "The ultimate beauty sleep essential for Mom.",
    priceHrefKey: "silkPillowcase" as const,
    image:
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80",
    alt: "Silk bedding and pillowcase",
  },
  {
    badge: "Limited Deal" as const,
    title: "Smart Espresso Machine",
    blurb: "Café-quality pours without leaving home.",
    priceHrefKey: "smartEspresso" as const,
    image:
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80",
    alt: "Espresso machine on kitchen counter",
  },
] as const;

function badgeClass(badge: (typeof bestSellers)[number]["badge"]) {
  if (badge === "Best Seller") {
    return "bg-gradient-to-r from-orange-500 to-amber-500 text-white";
  }
  if (badge === "Mom's Favorite") {
    return "bg-gradient-to-r from-rose-500 to-pink-600 text-white";
  }
  return "bg-gradient-to-r from-emerald-600 to-teal-600 text-white";
}

export function MothersDayCampaignShowcase({ links }: { links: MothersDayStaticLinks }) {
  return (
    <div className="space-y-10 md:space-y-12">
      <section id="gift-guide" className={sectionShell}>
        <div className="mb-6 border-b border-rose-100/80 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">
            Mother&apos;s Day 2026
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-emerald-950 md:text-3xl">
            Mother&apos;s Day Gift Guide
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat, index) => (
            <article
              key={cat.browseKey}
              className={`${cardBase} flex flex-col bg-gradient-to-b from-white to-rose-50/40`}
            >
              <div className="relative isolate aspect-[4/3] w-full overflow-hidden bg-rose-50 before:pointer-events-none before:absolute before:inset-0 before:z-10 before:bg-gradient-to-t before:from-rose-950/30 before:via-transparent before:to-amber-50/10">
                <Image
                  src={cat.image}
                  alt={cat.alt}
                  width={IMG_4_3.width}
                  height={IMG_4_3.height}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  priority={index === 0}
                  loading={index === 0 ? undefined : "lazy"}
                  className="relative z-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4 md:p-5">
                <h3 className="text-lg font-bold tracking-tight text-emerald-950">{cat.title}</h3>
                <p className="text-sm leading-relaxed text-emerald-800">{cat.blurb}</p>
                <a
                  href={links.browse[cat.browseKey]}
                  target="_blank"
                  rel={AMAZON_REL}
                  className={`${ctaBrowseClass} mt-auto`}
                >
                  Browse Picks
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="top-rated" className={sectionShell}>
        <div className="mb-6 border-b border-rose-100/80 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">
            Spotlight picks
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-emerald-950 md:text-3xl">
            Top Rated Products 2026
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {topRated.map((product) => (
            <article
              key={product.priceHrefKey}
              className={`${cardBase} flex flex-col bg-gradient-to-b from-white to-amber-50/30`}
            >
              <div className="relative aspect-[5/4] w-full overflow-hidden bg-gradient-to-br from-amber-50 to-rose-50 md:aspect-square">
                <Image
                  src={product.image}
                  alt={product.alt}
                  width={IMG_SQUARE.width}
                  height={IMG_SQUARE.height}
                  sizes="(max-width: 768px) 100vw, 33vw"
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4 md:p-5">
                <StarRating value={product.rating} label={`Rated ${product.rating} out of 5`} />
                <h3 className="text-base font-semibold text-emerald-950 md:text-lg">{product.title}</h3>
                <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                    Highlights
                  </p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-emerald-900">
                    {product.highlights.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
                <a
                  href={links.checkPriceTopRated[product.priceHrefKey]}
                  target="_blank"
                  rel={AMAZON_REL}
                  className={`${ctaAmazonClass} mt-auto`}
                >
                  Check Price on Amazon
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="best-sellers" className={sectionShell}>
        <div className="mb-6 border-b border-rose-100/80 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">
            The hot list
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-emerald-950 md:text-3xl">
            Best Sellers for Mom
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {bestSellers.map((item) => (
            <article
              key={item.priceHrefKey}
              className={`${cardBase} flex flex-col bg-gradient-to-b from-white to-rose-50/35`}
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-rose-50 to-amber-50">
                <Image
                  src={item.image}
                  alt={item.alt}
                  width={IMG_4_3.width}
                  height={IMG_4_3.height}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <span
                  className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide shadow-md ${badgeClass(item.badge)}`}
                >
                  {item.badge}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4 md:p-5">
                <h3 className="text-base font-semibold leading-snug text-emerald-950 md:text-lg">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-emerald-800">{item.blurb}</p>
                <a
                  href={links.checkPriceBestSellers[item.priceHrefKey]}
                  target="_blank"
                  rel={AMAZON_REL}
                  className={`${ctaAmazonClass} mt-auto`}
                >
                  Check Price on Amazon
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <p
        className="border-t border-emerald-100/90 pt-8 text-center text-xs leading-relaxed text-emerald-700/80 md:text-sm"
        role="note"
      >
        As an Amazon Associate, we earn from qualifying purchases.
      </p>
    </div>
  );
}
