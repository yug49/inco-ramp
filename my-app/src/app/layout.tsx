import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers"; // Import the Providers component
import NavigationWrapper from "./navigation"; // Import the NavigationWrapper

export const metadata: Metadata = {
  title: "Inco Ramp",
  description: "A crypto on-ramp and off-ramp platform with KYC",
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
          <div className="min-h-screen flex flex-col bg-gray-50">
            {/* The Navigation component will be rendered at the top of every page */}
            <NavigationWrapper />
            <div className="flex-grow">
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}