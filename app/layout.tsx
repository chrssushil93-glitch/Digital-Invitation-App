import type { Metadata } from "next";
import "./globals.css";
import AuthHashHandler from "@/components/AuthHashHandler";
import { getSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return { title: { default: s.siteName, template: `%s · ${s.siteName}` }, description: s.metaDescription };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Hind:wght@400;500;600&family=Rozha+One&display=swap"
        />
      </head>
      <body>
        <AuthHashHandler />
        {children}
      </body>
    </html>
  );
}
