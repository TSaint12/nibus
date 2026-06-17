import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Cover art is hot-linked from these providers (see cover pipeline).
    remotePatterns: [
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "https", hostname: "books.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
