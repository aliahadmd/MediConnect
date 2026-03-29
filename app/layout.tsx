import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MediConnect- telemedicine platform",
  description:
    "MediConnect is a production-ready virtual clinic that connects patients with doctors through a modern web interface.",
  keywords: [
    "Mediconnect",
    "Doctor",
    "Healthcare",
    "video",
    "medicine",
    "Patient",
  ],
  openGraph: {
    title: "MediConnect- telemedicine platform",
    description:
      "MediConnect is a production-ready virtual clinic that connects patients with doctors through a modern web interface.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MediConnect- telemedicine platform",
    description:
      "MediConnect is a production-ready virtual clinic that connects patients with doctors through a modern web interface.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
