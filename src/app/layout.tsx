import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Menged — Your Voice Knows the Way",
  description: "Voice-first transportation intelligence for Ethiopia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <TooltipProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "var(--base-white)",
                color: "var(--primary-forest)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "12px",
                boxShadow: "0 8px 30px -12px rgba(18, 60, 47, 0.12)"
              },
            }}
          />
        </TooltipProvider>
      </body>
    </html>
  );
}