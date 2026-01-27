// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const sohneBreit = localFont({
  src: "./fonts/TestSohneBreit-Kraftig.otf",
  variable: "--font-sohne-breit",
  weight: "700",
});

export const metadata: Metadata = {
  title: "Muko",
  description: "Intelligence-first design decisions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${sohneBreit.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}