import React from 'react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId, useReadContract } from 'wagmi';
import { chainsToRamp, rampAbi } from '../constants';

const Navigation: React.FC = () => {
  const { address: userAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const rampAddress = chainsToRamp[chainId]?.ramp;
  
  // Get the contract owner
  const { data: ownerAddress } = useReadContract({
    address: rampAddress as `0x${string}` | undefined,
    abi: rampAbi,
    functionName: 'owner',
    query: {
      enabled: isConnected && !!rampAddress,
    },
  });
  
  // Check if current user is the owner
  const isOwner = ownerAddress && userAddress && 
    ownerAddress.toLowerCase() === userAddress.toLowerCase();

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-8">
          <Link href="/" className="text-xl font-bold text-blue-600">
            Inco Ramp
          </Link>
          
          {isConnected && (
            <div className="hidden md:flex space-x-6">
              <Link href="/dashboard" className="text-gray-600 hover:text-blue-500">
                User Dashboard
              </Link>
              {isOwner && (
                <Link href="/admin" className="text-gray-600 hover:text-blue-500">
                  Admin Dashboard
                </Link>
              )}
            </div>
          )}
        </div>
        
        <ConnectButton />
      </div>
    </nav>
  );
};

export default Navigation;
