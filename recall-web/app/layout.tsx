import type { Metadata } from "next";

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
      <body style={{ margin: 0, background: "#f6f7fb" }}>{children}</body>
    </html>
  );
}
