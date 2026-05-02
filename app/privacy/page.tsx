import { Metadata } from "next";
import Link from "next/link";
import { COMPANY_DISPLAY_NAME, SUPPORT_EMAIL, getSiteUrl, hasValidSupportEmail } from "@/app/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${COMPANY_DISPLAY_NAME} handles information on this website.`,
};

const url = getSiteUrl();

export default function PrivacyPage() {
  const updated = "April 29, 2026";

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white font-sans text-emerald-950">
      <main className="mx-auto max-w-3xl px-6 py-12 md:px-10">
        <h1 className="text-3xl font-bold text-emerald-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-emerald-600">Last updated: {updated}</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-emerald-900 md:text-base">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-emerald-900">Who we are</h2>
            <p>
              This Privacy Policy describes how {COMPANY_DISPLAY_NAME} (&quot;we&quot;,
              &quot;us&quot;) processes information when you use{" "}
              <a href={url} className="font-semibold text-emerald-700 underline">
                {url}
              </a>{" "}
              (the &quot;Site&quot;).
            </p>
            <p>
              If you have questions about this policy,{" "}
              {hasValidSupportEmail() ? (
                <>
                  contact{" "}
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-emerald-700 underline">
                    {SUPPORT_EMAIL}
                  </a>
                  .
                </>
              ) : (
                <>
                  use our{" "}
                  <Link href="/contact" className="font-semibold text-emerald-700 underline">
                    Contact
                  </Link>{" "}
                  page.
                </>
              )}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-emerald-900">Information we process</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-semibold">Search queries you submit.</span> When you run a
                search, your keyword and selected filters are sent to our server to request product
                results from our data provider. We do not intend to use search queries for
                marketing, but server logs on our hosting provider may temporarily record requests
                for security and reliability.
              </li>
              <li>
                <span className="font-semibold">Technical data.</span> Like many websites, our
                hosting provider may collect standard technical information such as IP address,
                user agent, timestamps, and request paths. We use this information to operate and
                protect the Site.
              </li>
              <li>
                <span className="font-semibold">Optional email signups.</span> If you submit your
                email in a waitlist form, we process that email to respond to your request or
                deliver updates you opted into. Do not submit sensitive personal information through
                the Site.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-emerald-900">Cookies and similar tech</h2>
            <p>
              We may use cookies/local storage to remember your cookie consent choice. If you
              accept optional analytics or session tools, those providers may set additional
              cookies or similar technologies. You can review the tools we reference and adjust your
              choice using the cookie prompt on the Site.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-emerald-900">Third parties</h2>
            <p>
              Product information is retrieved from a third-party data provider and links may
              redirect to retailers such as Amazon.com. Those destinations have their own privacy
              policies. Optional analytics tools (if enabled) may include vendors such as Google
              (Analytics / Tag Manager) and Microsoft Clarity, depending on configuration and your
              consent.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-emerald-900">Retention</h2>
            <p>
              We do not operate a user account system on this Site. Any retention of server logs is
              controlled by our hosting provider&apos;s policies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-emerald-900">Your choices</h2>
            <p>
              You can decline optional cookies via the cookie banner. You may also use common
              browser controls to block cookies. Blocking certain cookies may impact optional
              analytics features.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-emerald-900">Children</h2>
            <p>The Site is not directed to children under 13, and we do not knowingly collect their data.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-emerald-900">Changes</h2>
            <p>
              We may update this policy from time to time. The &quot;Last updated&quot; date above
              will change when we do.
            </p>
          </section>

          <p className="text-sm">
            <Link href="/terms" className="font-semibold text-emerald-700 underline">
              Terms of Service
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
