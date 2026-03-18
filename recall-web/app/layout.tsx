import type { Metadata } from "next";
import "./globals.css";

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
      <body className="bg-background text-foreground" style={{ margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
