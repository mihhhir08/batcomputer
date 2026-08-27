import type { MetadataRoute } from "next";

// A private terminal has no business in a search index.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
