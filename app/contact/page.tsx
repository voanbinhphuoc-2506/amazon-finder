import { Metadata } from "next";
import { COMPANY_DISPLAY_NAME, SUPPORT_EMAIL, hasValidSupportEmail } from "@/app/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact ${COMPANY_DISPLAY_NAME}.`,
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white font-sans text-emerald-950">
      <main className="mx-auto max-w-3xl px-6 py-12 md:px-10">
        <h1 className="text-3xl font-bold text-emerald-900">Contact</h1>
        <p className="mt-4 text-sm text-emerald-800 md:text-base">
          For privacy requests, partnerships, or general questions,
          {hasValidSupportEmail() ? " email us at the address below." : " use the channel we publish for your deployment (set NEXT_PUBLIC_SUPPORT_EMAIL on the host)."}
        </p>
        {hasValidSupportEmail() ? (
          <p className="mt-4">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-lg font-semibold text-emerald-700 underline"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
        ) : (
          <p className="mt-4 text-sm text-emerald-700">
            Production sites should configure{" "}
            <code className="rounded bg-emerald-100 px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPPORT_EMAIL</code>{" "}
            so visitors can reach you.
          </p>
        )}
      </main>
    </div>
  );
}
