import Link from "next/link";
import { COMPANY_DISPLAY_NAME } from "@/app/lib/site";

const navLinkClass =
  "text-sm font-medium text-emerald-800 transition hover:text-emerald-950";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-emerald-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3 md:px-10">
        <Link href="/" className="text-sm font-bold tracking-tight text-emerald-900">
          {COMPANY_DISPLAY_NAME}
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 md:gap-x-6" aria-label="Main">
          <Link href="/how-it-works" className={navLinkClass}>
            How it works
          </Link>
          <Link href="/about" className={navLinkClass}>
            About
          </Link>
          <Link href="/contact" className={navLinkClass}>
            Contact
          </Link>
          <Link href="/privacy" className={navLinkClass}>
            Privacy
          </Link>
          <Link href="/terms" className={navLinkClass}>
            Terms
          </Link>
        </nav>
      </div>
    </header>
  );
}
