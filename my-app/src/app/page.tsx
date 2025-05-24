'use client';

import { ConnectButton } from "@rainbow-me/rainbowkit";
import UserRegistration from "../components/UserRegistration";
import { useAccount, useChainId, useReadContract } from "wagmi";
import { chainsToRamp, rampAbi } from "../constants";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { address: userAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const router = useRouter();
  const [isCheckingOwner, setIsCheckingOwner] = useState<boolean>(false);
  
  const rampAddress = chainsToRamp[chainId]?.ramp;

  // Get the contract owner
  const { data: ownerAddress, isPending: isOwnerAddressLoading } = useReadContract({
    address: rampAddress as `0x${string}` | undefined,
    abi: rampAbi,
    functionName: 'owner',
    query: {
      enabled: isConnected && !!rampAddress,
    },
  });

  // Check if current user is the owner and redirect to admin dashboard
  useEffect(() => {
    if (!isConnected || isOwnerAddressLoading) {
      return;
    }

    setIsCheckingOwner(true);
    
    if (ownerAddress && userAddress) {
      const isCurrentUserOwner = ownerAddress.toLowerCase() === userAddress.toLowerCase();
      
      if (isCurrentUserOwner) {
        router.push('/admin');
      }
    }
    
    setIsCheckingOwner(false);
  }, [ownerAddress, userAddress, isConnected, isOwnerAddressLoading, router]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl mb-6">
            <span className="text-white font-bold text-xl">IR</span>
          </div>
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-slate-200 via-emerald-400 to-slate-200 bg-clip-text text-transparent">
            Inco Ramp
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Secure, private, and compliant crypto on-ramp and off-ramp platform with built-in KYC verification
          </p>
        </div>
        
        {isConnected ? (
          isCheckingOwner ? (
            <div className="flex flex-col items-center justify-center mt-20">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-emerald-400 rounded-full animate-ping"></div>
              </div>
              <p className="mt-6 text-slate-400 font-medium">Checking authorization...</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <UserRegistration />
            </div>
          )
        ) : (
          <div className="text-center mt-20">
            <div className="max-w-md mx-auto bg-slate-900/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-800">
              <div className="w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-slate-200 mb-4">
                Welcome to Inco Ramp
              </h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                Connect your wallet to start using our secure crypto on-ramp and off-ramp services
              </p>
              <div className="text-sm text-slate-500">
                Supported networks and features available after connection
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}