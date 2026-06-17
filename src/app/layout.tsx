import type { Metadata } from "next";
import { Commissioner } from "next/font/google";
import "./globals.css";

const sans = Commissioner({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Grocerywatch.lk",
  description: "Food price intelligence for Sri Lanka",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={sans.variable}>{children}</body>
    </html>
  );
}
