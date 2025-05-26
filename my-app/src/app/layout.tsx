import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers"; // Import the Providers component
import NavigationWrapper from "./navigation"; // Import the NavigationWrapper
import { AnimatedWarrior } from "../components/AnimatedWarrior"; // Import the AnimatedWarrior component
import { NotificationProvider } from "../components/NotificationContext"; // Import the NotificationProvider

export const metadata: Metadata = {
  title: "Crypto-Fiat Gateway",
  description: "A crypto on-ramp and off-ramp platform with KYC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <Providers>
          <NotificationProvider>
            <div className="min-h-screen flex flex-col bg-slate-950">
              {/* The Navigation component will be rendered at the top of every page */}
              <NavigationWrapper />
              <div className="flex-grow">
                {children}
              </div>
              {/* Animated warrior assistant fixed at bottom right */}
              <AnimatedWarrior />
            </div>
          </NotificationProvider>
        </Providers>
      </body>
    </html>
  );
}