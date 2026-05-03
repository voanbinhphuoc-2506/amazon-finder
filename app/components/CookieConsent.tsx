"use client";

import Script from "next/script";
import { useCallback, useEffect, useState } from "react";
import { COOKIE_CONSENT_KEY } from "@/app/lib/cookieConsentStorage";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
  }
}

function pushConsentToDataLayer(accepted: boolean) {
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({
    event: "cookie_consent_update",
    analytics_storage: accepted ? "granted" : "denied",
    ad_storage: accepted ? "granted" : "denied",
  });
}

function AnalyticsScripts() {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

  return (
    <>
      {!gtmId && gaId ? (
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`}
          strategy="lazyOnload"
        />
      ) : null}
      {!gtmId && gaId ? (
        <Script id="ga4-config" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', '${gaId.replace(/'/g, "")}', { anonymize_ip: true });
          `}
        </Script>
      ) : null}
      {clarityId ? (
        <Script id="ms-clarity" strategy="lazyOnload">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${clarityId.replace(/'/g, "")}");
          `}
        </Script>
      ) : null}
    </>
  );
}

export function CookieConsent() {
  const [consent, setConsent] = useState<"accepted" | "rejected" | "undecided" | null>(null);

  useEffect(() => {
    void Promise.resolve().then(() => {
      const stored = window.localStorage.getItem(COOKIE_CONSENT_KEY);
      if (stored === "accepted" || stored === "rejected") {
        setConsent(stored);
      } else {
        setConsent("undecided");
      }
    });
  }, []);

  const accept = useCallback(() => {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setConsent("accepted");
    window.dataLayer = window.dataLayer ?? [];
    pushConsentToDataLayer(true);
  }, []);

  const reject = useCallback(() => {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, "rejected");
    setConsent("rejected");
    window.dataLayer = window.dataLayer ?? [];
    pushConsentToDataLayer(false);
  }, []);

  if (consent === null) {
    return null;
  }

  return (
    <>
      {consent === "accepted" ? <AnalyticsScripts /> : null}
      {consent === "undecided" ? (
        <div
          role="dialog"
          aria-label="Cookie consent"
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-emerald-200 bg-white/95 p-4 shadow-lg backdrop-blur-md md:bottom-6 md:left-auto md:right-6 md:max-w-md md:rounded-2xl md:border md:p-5"
        >
          <p className="text-sm text-emerald-900">
            We use optional analytics and session tools to improve the experience. By clicking
            Accept, you agree to cookies used for those purposes. See our{" "}
            <a href="/privacy" className="font-semibold text-emerald-700 underline">
              Privacy Policy
            </a>{" "}
            for details.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={accept}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={reject}
              className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
            >
              Reject optional
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
