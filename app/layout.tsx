import type { Metadata } from "next";
import "./globals.css";
import AuthHashHandler from "@/components/AuthHashHandler";

export const metadata: Metadata = {
  title: "Nimantran",
  description: "Animated digital invitations in English, Hindi and Marathi with built-in RSVPs and view tracking.",
};

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
