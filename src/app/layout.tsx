import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevVault — Personal Developer Knowledge Management Platform",
  description:
    "Curate, organize, search, and explore high-signal developer resources across GitHub, YouTube, Instagram, and technical documentation.",
  applicationName: "DevVault",
  authors: [{ name: "DevVault Team" }],
  keywords: [
    "developer knowledge management",
    "developer bookmarks",
    "github",
    "youtube",
    "system design",
    "cybersecurity",
    "frontend",
    "backend",
  ],
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#090d16",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased selection:bg-primary/20 selection:text-primary">
        {children}
      </body>
    </html>
  );
}
