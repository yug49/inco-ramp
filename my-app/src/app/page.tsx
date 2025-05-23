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
    <main className="p-8 min-h-screen">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Inco Ramp</h1>
        
        {isConnected ? (
          isCheckingOwner ? (
            <div className="flex justify-center items-center mt-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <span className="ml-2">Checking authorization...</span>
            </div>
          ) : (
            <UserRegistration />
          )
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