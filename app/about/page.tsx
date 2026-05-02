import { Metadata } from "next";
import Link from "next/link";
import { COMPANY_DISPLAY_NAME, SUPPORT_EMAIL, hasValidSupportEmail } from "@/app/lib/site";

export const metadata: Metadata = {
  title: "About Us",
  description: `What ${COMPANY_DISPLAY_NAME} does and how this research tool works.`,
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white font-sans text-emerald-950">
      <main className="mx-auto max-w-3xl px-6 py-12 md:px-10">
        <h1 className="text-3xl font-bold text-emerald-900">About {COMPANY_DISPLAY_NAME}</h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-emerald-900 md:text-base">
          <p>
            {COMPANY_DISPLAY_NAME} builds practical tools for sellers and researchers who want a
            faster way to browse public Amazon.com marketplace listings with filters—without
            pretending to be Amazon.
          </p>
          <p>
            This website is an independent third-party tool. Amazon.com, Inc. does not sponsor or
            endorse this service. Amazon and the Amazon logo are trademarks of Amazon.com, Inc. or
            its affiliates.
          </p>
          <p>
            Outbound product links may include an affiliate tag so we can earn a commission on
            qualifying purchases, at no extra cost to you. See our homepage disclosure for the
            standard Associates disclaimer.
          </p>
          <p>
            We do not guarantee rankings, margins, demand, or that any listing will be profitable.
            Always verify details on the retailer&apos;s product page before making a business
            decision.
          </p>
          <p>
            Questions?{" "}
            {hasValidSupportEmail() ? (
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-emerald-700 underline">
                {SUPPORT_EMAIL}
              </a>
            ) : (
              <Link href="/contact" className="font-semibold text-emerald-700 underline">
                Contact us
              </Link>
            )}
            {" · "}
            <Link href="/how-it-works" className="font-semibold text-emerald-700 underline">
              How it works
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
