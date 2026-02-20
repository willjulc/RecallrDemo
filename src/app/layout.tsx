import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recallr | Smart Flashcards",
  description: "AI-generated study materials strictly sourced from your PDFs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=DM+Mono:wght@400;500&family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,400&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
