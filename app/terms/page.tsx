import { Metadata } from "next";
import Link from "next/link";
import { COMPANY_DISPLAY_NAME, SUPPORT_EMAIL, getSiteUrl, hasValidSupportEmail } from "@/app/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of using ${COMPANY_DISPLAY_NAME} tools and this website.`,
};

const url = getSiteUrl();

export default function TermsPage() {
  const updated = "April 29, 2026";

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white font-sans text-emerald-950">
      <main className="mx-auto max-w-3xl px-6 py-12 md:px-10">
        <h1 className="text-3xl font-bold text-emerald-900">Terms of Service</h1>
        <p className="mt-2 text-sm text-emerald-600">Last updated: {updated}</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-emerald-900 md:text-base">
          <p>
            By accessing or using{" "}
            <a href={url} className="font-semibold text-emerald-700 underline">
              {url}
            </a>{" "}
            (the &quot;Site&quot;), you agree to these Terms. If you do not agree, do not use the
            Site.
          </p>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-emerald-900">Independent service</h2>
            <p>
              The Site is operated by {COMPANY_DISPLAY_NAME} and is not affiliated with,
              endorsed by, or sponsored by Amazon.com, Inc. Amazon trademarks belong to their
              respective owners.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-emerald-900">No professional advice</h2>
            <p>
              The Site provides informational tooling only. Nothing on the Site is financial,
              legal, or business advice. You are responsible for your own decisions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-emerald-900">Outbound links</h2>
            <p>
              The Site may link to third-party retailers and other websites. We do not control
              third-party sites, pricing, availability, shipping, returns, or policies. Always
              verify listing details on the destination site.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-emerald-900">Affiliate disclosure</h2>
            <p>
              Some outbound links may include affiliate tracking parameters. {COMPANY_DISPLAY_NAME}{" "}
              may earn commissions from qualifying purchases, as described on the Site.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-emerald-900">Disclaimers</h2>
            <p>
              THE SITE AND ITS CONTENT ARE PROVIDED &quot;AS IS&quot; AND &quot;AS
              AVAILABLE.&quot; TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES,
              WHETHER EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR
              PURPOSE, AND NON-INFRINGEMENT.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-emerald-900">Limitation of liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, {COMPANY_DISPLAY_NAME} WILL NOT BE LIABLE FOR
              ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES, OR ANY LOSS OF
              PROFITS, REVENUE, OR DATA, ARISING OUT OF YOUR USE OF THE SITE.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-emerald-900">Acceptable use</h2>
            <p>
              You agree not to misuse the Site, interfere with its operation, attempt unauthorized
              access, or use automated means in a way that harms the service or others.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-emerald-900">Changes</h2>
            <p>We may modify these Terms. Continued use after changes means you accept the updated Terms.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-emerald-900">Contact</h2>
            {hasValidSupportEmail() ? (
              <p>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-emerald-700 underline">
                  {SUPPORT_EMAIL}
                </a>
              </p>
            ) : (
              <p>
                Use our{" "}
                <Link href="/contact" className="font-semibold text-emerald-700 underline">
                  Contact
                </Link>{" "}
                page.
              </p>
            )}
          </section>

          <p className="text-sm">
            <Link href="/privacy" className="font-semibold text-emerald-700 underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
