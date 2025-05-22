import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers"; // Import the Providers component

export const metadata: Metadata = {
  title: "TSender",
  description: "A simple ERC20 token sender dApp", // Example description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}