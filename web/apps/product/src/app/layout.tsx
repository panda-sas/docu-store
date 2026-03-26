import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocuStore — Document Intelligence for Drug Discovery",
  description:
    "Semantic search, chemistry-aware queries, and AI-powered Q&A grounded in your actual documents.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
