"use client";

import type { ReactNode } from "react";

export default function HomeClient({ campaignSections }: { campaignSections: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white font-sans text-emerald-950">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12 md:px-10">
        <section className="rounded-3xl border border-emerald-200 bg-white/90 p-6 shadow-xl shadow-emerald-100 md:p-8">
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-emerald-900 md:text-4xl">
            Mother&apos;s Day Special: Best Tech &amp; Home Gifts for Mom
          </h1>
          <p className="mt-2 text-sm text-emerald-700 md:text-base">
            Handpicked gift ideas to help you celebrate Mom with smart, practical, and delightful picks.
          </p>
        </section>

        {campaignSections}
      </main>
    </div>
  );
}
