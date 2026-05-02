import Link from "next/link";
import { COMPANY_DISPLAY_NAME, SUPPORT_EMAIL, hasValidSupportEmail } from "@/app/lib/site";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-emerald-200 bg-white/90">
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <p className="text-xs text-emerald-800">
          As an Amazon Associate{" "}
          <span className="font-semibold">{COMPANY_DISPLAY_NAME}</span> earns from qualifying
          purchases. Amazon and related marks are trademarks of Amazon.com, Inc. or its affiliates.
          This site is not affiliated with or endorsed by Amazon.
        </p>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-emerald-700">
          <Link href="/privacy" className="hover:text-emerald-900">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-emerald-900">
            Terms of Service
          </Link>
          <Link href="/about" className="hover:text-emerald-900">
            About
          </Link>
          <Link href="/contact" className="hover:text-emerald-900">
            Contact
          </Link>
          <Link href="/how-it-works" className="hover:text-emerald-900">
            How it works
          </Link>
        </div>
        <p className="mt-6 text-xs text-emerald-600">
          &copy; {year} {COMPANY_DISPLAY_NAME}.
          {hasValidSupportEmail() ? (
            <>
              {" "}
              Questions?{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold underline">
                {SUPPORT_EMAIL}
              </a>
            </>
          ) : (
            <> Use the Contact page for support.</>
          )}
        </p>
      </div>
    </footer>
  );
}
