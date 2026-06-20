import type { Metadata } from "next";
import "./globals.css";
import { bricolage, inter } from "@/lib/fonts";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Nibus",
  description: "A log and social layer for collected comic editions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${inter.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
