'use client';

import React, { useEffect, useState } from 'react';
import { useAccount, useChainId, useReadContract } from 'wagmi';
import { useRouter } from 'next/navigation';
import { chainsToRamp, rampAbi } from '../../constants';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import AdminDashboard from '../../components/AdminDashboard';

export default function AdminDashboardPage() {
  const router = useRouter();
  const chainId = useChainId();
  const { address: userAddress, isConnected } = useAccount();
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
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

  // Get pending users
  const { data: pendingUsers } = useReadContract({
    address: rampAddress as `0x${string}` | undefined,
    abi: rampAbi,
    functionName: 'getListOfPendingRegistrations',
    query: {
      enabled: isConnected && !!rampAddress && isOwner,
    },
  });

  // Check if current user is the owner
  useEffect(() => {
    if (!isConnected || isOwnerAddressLoading) {
      setIsLoading(true);
      return;
    }

    if (ownerAddress && userAddress) {
      const isCurrentUserOwner = ownerAddress.toLowerCase() === userAddress.toLowerCase();
      setIsOwner(isCurrentUserOwner);
      
      // If not owner, redirect to home
      if (!isCurrentUserOwner) {
        router.push('/');
      }
    }
    
    setIsLoading(false);
  }, [ownerAddress, userAddress, isConnected, isOwnerAddressLoading, router]);

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
          <p className="mb-6">Please connect your wallet to access the admin dashboard</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="mb-6">Only the contract owner can access the admin dashboard.</p>
          <button 
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  console.log("Rendering AdminDashboard component with pendingUsers:", pendingUsers);
  
  return (
    <div className="min-h-screen">
      {console.log("Inside Admin return statement - about to render AdminDashboard")}
      <ErrorBoundary fallback={<div className="p-8 text-red-500">Error loading Admin Dashboard. Check the console for details.</div>}>
        <AdminDashboard pendingUsers={pendingUsers || []} />
      </ErrorBoundary>
      {console.log("After rendering AdminDashboard component")}
    </div>
  );
}

// Error boundary component to catch rendering errors
class ErrorBoundary extends React.Component<{
  children: React.ReactNode;
  fallback: React.ReactNode;
}> {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: any, errorInfo: any) {
    console.error("Error in component:", error);
    console.error("Component stack:", errorInfo.componentStack);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
