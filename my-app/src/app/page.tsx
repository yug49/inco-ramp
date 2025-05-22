'use client';

import { ConnectButton } from "@rainbow-me/rainbowkit";
import UserRegistration from "../components/UserRegistration";
import { useAccount } from "wagmi";

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <main className="p-8 min-h-screen">
      <div className="flex justify-end mb-6">
        <ConnectButton />
      </div>
      
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Inco Ramp</h1>
        
        {isConnected ? (
          <UserRegistration />
        ) : (
          <div className="text-center mt-12">
            <p className="text-xl">Welcome to Inco Ramp</p>
            <p className="mt-4">Connect your wallet to get started</p>
          </div>
        )}
      </div>
    </main>
  );
}