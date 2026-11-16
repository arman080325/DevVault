import type { Metadata, Viewport } from "next";
import { Manrope, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["500", "600", "700"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DevVault — Personal Developer Knowledge Management",
  description:
    "An editorial, calm, high-signal personal developer knowledge workspace. Discover. Capture. Organize. Explore. Grow.",
  applicationName: "DevVault",
  authors: [{ name: "DevVault" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#111714",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${manrope.variable} ${dmSans.variable} ${ibmPlexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Synchronous theme initialization to avoid flash and ensure instant theme application */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var urlParams = new URLSearchParams(window.location.search);
                var urlTheme = urlParams.get('theme');
                var savedTheme = localStorage.getItem('devvault-theme');
                var theme = urlTheme || savedTheme || 'dark';
                if (theme === 'light') {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                } else {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased selection:bg-primary/20 selection:text-foreground">
        {children}
      </body>
    </html>
  );
}
