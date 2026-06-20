import { Bricolage_Grotesque, Inter } from "next/font/google";

// Display — wordmark, titles, big numbers.
export const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

// Text — body copy, reviews, metadata, labels, buttons.
export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});
