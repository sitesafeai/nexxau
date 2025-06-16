import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/src/lib/theme.tsx";
import SessionProviderWrapper from "@/src/components/SessionProviderWrapper";
import DndProvider from "@/src/components/providers/DndProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nexxau",
  description: "Your comprehensive solution for site safety and security management.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider>
          <SessionProviderWrapper>
            <DndProvider>
              {children}
            </DndProvider>
          </SessionProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
