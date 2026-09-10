import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const raveo = localFont({
  src: "./fonts/RaveoVF-subsetted.woff2",
  variable: "--font-raveo",
  weight: "400 730",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Sydney Essex - Product Engineer",
  description: "Product engineer based in NYC specializing in creative tools and agentic interfaces",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${raveo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
