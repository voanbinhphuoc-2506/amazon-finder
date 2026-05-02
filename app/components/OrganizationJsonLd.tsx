import { COMPANY_DISPLAY_NAME, SUPPORT_EMAIL, getSiteUrl, hasValidSupportEmail } from "@/app/lib/site";

export function OrganizationJsonLd() {
  const siteUrl = getSiteUrl();
  const payload: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: COMPANY_DISPLAY_NAME,
    url: siteUrl,
  };

  if (hasValidSupportEmail()) {
    payload.contactPoint = [
      {
        "@type": "ContactPoint",
        email: SUPPORT_EMAIL,
        contactType: "customer support",
      },
    ];
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
