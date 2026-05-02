import { Metadata } from "next";
import Link from "next/link";
import { COMPANY_DISPLAY_NAME } from "@/app/lib/site";

export const metadata: Metadata = {
  title: "How it works",
  description: `How the ${COMPANY_DISPLAY_NAME} marketplace search tool gathers and filters results.`,
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white font-sans text-emerald-950">
      <main className="mx-auto max-w-3xl px-6 py-12 md:px-10">
        <h1 className="text-3xl font-bold text-emerald-900">How it works</h1>
        <p className="mt-4 text-sm text-emerald-800 md:text-base">
          A short, plain-English overview of what happens when you use this tool.
        </p>

        <ol className="mt-8 list-decimal space-y-4 pl-5 text-sm leading-relaxed text-emerald-900 md:text-base">
          <li>
            You enter a public search keyword (for example a category, niche term, or product
            idea).
          </li>
          <li>
            The Site sends your keyword and filter selections to our server, which requests search
            results from a third-party marketplace data provider.
          </li>
          <li>
            We filter and sort results on the server based on your selected price band, minimum
            rating, and sort order.
          </li>
          <li>
            Product cards show title, price text (when available), rating (when available), and an
            image. Details can change quickly—always confirm on the retailer page.
          </li>
          <li>
            When you click through, you may land on a marketplace listing. Links may include an
            affiliate tag.
          </li>
        </ol>

        <div className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-sm text-emerald-900">
          <p className="font-semibold">Limitations</p>
          <p className="mt-2">
            We do not guarantee demand, profit, ranking, or price accuracy. Ratings and prices come
            from third-party data and may be incomplete.
          </p>
        </div>

        <p className="mt-8 text-sm">
          <Link href="/" className="font-semibold text-emerald-700 underline">
            Back to search
          </Link>
        </p>
      </main>
    </div>
  );
}
