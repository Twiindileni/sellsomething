import React from "react";
import { Helmet } from "react-helmet-async";

const SITE_NAME = "SellSomething Namibia";
const SITE_URL = "https://www.sellsomething.online";
const DEFAULT_IMAGE = `${SITE_URL}/brand/favicon-192.png`;
const DEFAULT_DESCRIPTION =
  "Buy and sell anything in Namibia. Post a free ad for products, services, vehicles, property and more. Safe escrow payments included.";

/**
 * Drop <SEO /> at the top of any page component to set title, description,
 * Open Graph and Twitter Card tags for that route.
 *
 * Props:
 *   title       – page title (appended with site name)
 *   description – meta description
 *   image       – OG image URL (absolute)
 *   url         – canonical URL (absolute)
 *   type        – OG type ("website" | "article" | "product")
 *   noIndex     – set true for dashboard / admin pages
 */
export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,
  type = "website",
  noIndex = false,
}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const canonicalUrl = url ? `${SITE_URL}${url}` : SITE_URL;

  return (
    <Helmet>
      {/* Primary */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph (Facebook, WhatsApp, LinkedIn) */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={canonicalUrl} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Geographic targeting for Namibia */}
      <meta name="geo.region" content="NA" />
      <meta name="geo.placename" content="Namibia" />
    </Helmet>
  );
}
