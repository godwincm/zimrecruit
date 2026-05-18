import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ZimRecruit", template: "%s | ZimRecruit" },
  description: "Verified recruitment and credential verification for Zimbabwe",
  metadataBase: new URL(process.env.APP_BASE_URL ?? "https://zimrecruit.co.zw"),
  openGraph: {
    type: "website",
    locale: "en_ZW",
    siteName: "ZimRecruit",
    description: "Hire with verified confidence. Every credential carries a trusted proof.",
  },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Theme detection before first paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { borderRadius: "12px", fontSize: "14px", fontWeight: 500 },
          }}
        />
      </body>
    </html>
  );
}
