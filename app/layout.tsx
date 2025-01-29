import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mural Flow",
  description: "Collaborate with people in real time!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
