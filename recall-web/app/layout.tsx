import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Recall Dashboard",
  description: "Recall spaced repetition dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground transition-colors duration-300" style={{ margin: 0 }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
