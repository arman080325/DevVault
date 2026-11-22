import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevVault — Personal Developer Knowledge Management",
  description:
    "A quiet, editorial place for the ideas, tools and lessons you want to return to. Discover. Capture. Organize. Explore. Grow.",
  applicationName: "DevVault",
  authors: [{ name: "DevVault" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#F5F1E9",
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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Synchronous theme and appearance initialization to avoid flash and ensure instant preference application */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var urlParams = new URLSearchParams(window.location.search);
                var urlTheme = urlParams.get('theme');
                var savedTheme = localStorage.getItem('devvault-theme');
                var theme = urlTheme || savedTheme || 'light';
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                }
                var savedFont = localStorage.getItem('devvault-font-preference') || 'newsreader';
                document.documentElement.setAttribute('data-font-pref', savedFont);
                var savedDensity = localStorage.getItem('devvault-density');
                if (savedDensity === 'compact') {
                  document.documentElement.classList.add('compact-density');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
