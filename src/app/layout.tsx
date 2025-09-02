import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Joye Admin",
  description: "Joye Admin Dashboard",
  icons: {
    icon: [
      { url: "/logo.png?v=3", type: "image/png", sizes: "16x16" },
      { url: "/logo.png?v=3", type: "image/png", sizes: "32x32" },
      { url: "/logo.png?v=3", type: "image/png", sizes: "48x48" },
    ],
    shortcut: [{ url: "/logo.png?v=3", type: "image/png" }],
    apple: [{ url: "/logo.png?v=3" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
