"use client";

import type { ReactNode } from "react";

/**
 * Mother’s Day 2026 — landing chỉ hiển thị grid catalog (không search / filters).
 * Dữ liệu và lọc `?q=` xử lý trên server trong `app/page.tsx`.
 */
export default function HomeClient({ campaignSections }: { campaignSections: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white font-sans text-emerald-950">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-12 md:px-10">
        {campaignSections}
      </main>
    </div>
  );
}
