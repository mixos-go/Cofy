import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Cofy Ops",
  description: "Internal operator console for Cofy support"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
