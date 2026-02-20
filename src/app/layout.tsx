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
    <html lang="en" data-theme="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Epilogue:wght@700;800;900&family=Outfit:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
