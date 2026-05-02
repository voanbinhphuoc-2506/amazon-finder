import "./globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CookieConsent } from "./components/CookieConsent";
import { OrganizationJsonLd } from "./components/OrganizationJsonLd";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { COMPANY_DISPLAY_NAME, getSiteUrl } from "./lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = getSiteUrl();

/** GTM container IDs are `GTM-` + alphanumerics; reject anything else before interpolating into HTML/JS. */
function getValidatedGtmId(): string | null {
  const raw = process.env.NEXT_PUBLIC_GTM_ID?.trim();
  if (!raw || !/^GTM-[A-Z0-9]+$/i.test(raw)) {
    return null;
  }
  return raw.toUpperCase();
}

const gtmId = getValidatedGtmId();

const gtmScriptInnerHtml =
  gtmId !== null
    ? `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer',${JSON.stringify(gtmId)});`
    : "";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Product Research Tool | SmartWorkHacks",
    template: `%s | ${COMPANY_DISPLAY_NAME}`,
  },
  description:
    "Browse public Amazon.com marketplace listings with filters for price and customer ratings. Independent research tool—not affiliated with Amazon.",
  icons: {
    apple: "/apple-touch-icon.png",
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: COMPANY_DISPLAY_NAME,
    title: "Product Research Tool | SmartWorkHacks",
    description:
      "Filtered marketplace search for sellers and researchers. Results refresh each time you search.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Product Research Tool | SmartWorkHacks",
    description:
      "Filtered marketplace search for sellers and researchers. Results refresh each time you search.",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {gtmId !== null ? (
          <script
            dangerouslySetInnerHTML={{
              __html: gtmScriptInnerHtml,
            }}
          />
        ) : null}
      </head>
      <body className="min-h-full flex flex-col">
        {gtmId !== null ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(gtmId)}`}
              height={0}
              width={0}
              style={{ display: "none", visibility: "hidden" }}
              title="Google Tag Manager"
            />
          </noscript>
        ) : null}
        <OrganizationJsonLd />
        <SiteHeader />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        <SiteFooter />
        <CookieConsent />
      </body>
    </html>
  );
}
