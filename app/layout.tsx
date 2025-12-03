'use client'
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CavosProvider } from "@cavos/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CavosProvider
      config={{
        appId: 'bc1ba377-5452-45f2-bac9-b7e494440669',
        network: 'sepolia',
      }}
    >
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
        </body>
      </html>
    </CavosProvider>

  );
}
