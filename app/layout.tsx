import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              border: "1px solid var(--line)",
              borderRadius: "2px",
              padding: "12px 16px",
              color: "var(--ink)",
              background: "var(--paper)",
              fontSize: "12px",
            },
            success: { iconTheme: { primary: "var(--accent)", secondary: "var(--paper)" } },
            error: { iconTheme: { primary: "var(--error)", secondary: "var(--paper)" } },
          }}
        />
      </body>
    </html>
  );
}
