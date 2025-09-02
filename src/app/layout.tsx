import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import "./globals.css";
import Providers from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  fallback: ["system-ui", "arial"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  fallback: ["Consolas", "Monaco", "monospace"],
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
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
