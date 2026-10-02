import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Cofy",
  description: "Omnichannel order management for Indonesian marketplace sellers"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
