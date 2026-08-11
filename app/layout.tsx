import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Repair Center",
  description: "Submit and track hardware repair requests.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
