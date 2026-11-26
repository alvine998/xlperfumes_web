import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";
import "../styles/input.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sign in | XL Perfumes",
  description: "Sign in to your XL Perfumes account and continue your scent journey.",
  applicationName: "XL Perfumes",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "XL Perfumes" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#5538ad", viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PwaRegister />
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              border: "1px solid #d9dbea",
              borderRadius: "12px",
              padding: "12px 16px",
              color: "#302e45",
              background: "#ffffff",
              fontSize: "14px",
              fontWeight: 600,
              boxShadow: "0 12px 28px #25234a24",
            },
            success: {
              style: {
                borderColor: "#86d9a5",
                color: "#17633b",
                background: "#edfff3",
                boxShadow: "0 12px 28px #16803a24",
              },
              iconTheme: { primary: "#1e9b55", secondary: "#edfff3" },
            },
            error: {
              style: {
                borderColor: "#f0a4ad",
                color: "#982f42",
                background: "#fff0f2",
                boxShadow: "0 12px 28px #bd334424",
              },
              iconTheme: { primary: "#d83f56", secondary: "#fff0f2" },
            },
            blank: {
              icon: "⚠️",
              style: {
                borderColor: "#edc15c",
                color: "#79510b",
                background: "#fff8e4",
                boxShadow: "0 12px 28px #b47a1f2b",
              },
              iconTheme: { primary: "#d28a10", secondary: "#fff8e4" },
            },
          }}
        />
      </body>
    </html>
  );
}
