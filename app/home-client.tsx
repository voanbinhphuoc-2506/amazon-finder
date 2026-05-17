"use client";

import type { ReactNode } from "react";

export default function HomeClient({ campaignSections }: { campaignSections: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white font-sans text-emerald-950">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12 md:px-10">
        <section className="relative overflow-hidden rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50/40 to-sky-50/60 p-6 shadow-xl shadow-emerald-100/80 ring-1 ring-emerald-100/60 md:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-200/40 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-emerald-200/50 blur-3xl"
          />
          <p className="relative inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
            Curated Amazon listings
          </p>
          <h1 className="relative mt-4 max-w-3xl text-3xl font-bold tracking-tight text-emerald-950 md:text-5xl md:leading-tight">
            <span className="bg-gradient-to-r from-emerald-800 via-teal-700 to-sky-700 bg-clip-text text-transparent">
              Smart Home Gadgets &amp; Decor
            </span>
          </h1>
          <p className="relative mt-4 max-w-2xl text-base leading-relaxed text-emerald-800/90 md:text-lg">
            Connected tech, cozy accents, and everyday upgrades—hand-picked for modern living. Tap any card to view
            the full listing on Amazon.
          </p>
        </section>

        {campaignSections}
      </main>
    </div>
  );
}
