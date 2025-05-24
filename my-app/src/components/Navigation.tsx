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
    <nav className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-8">
            <Link 
              href="/" 
              className="flex items-center space-x-3 group"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">IR</span>
              </div>
              <span className="text-xl font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">
                Inco Ramp
              </span>
            </Link>
            
            {/* Navigation Links */}
            {isConnected && (
              <div className="hidden md:flex space-x-1">
                <Link 
                  href="/dashboard" 
                  className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all duration-200 font-medium"
                >
                  Dashboard
                </Link>
                {isOwner && (
                  <Link 
                    href="/admin" 
                    className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all duration-200 font-medium"
                  >
                    Admin
                  </Link>
                )}
              </div>
            )}
          </div>
          
          {/* Connect Button */}
          <div className="flex items-center">
            <ConnectButton />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
