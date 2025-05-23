'use client';

import React, { useEffect } from 'react';
import { useAccount, useChainId, useReadContract } from 'wagmi';
import { useRouter } from 'next/navigation';
import { chainsToRamp, rampAbi } from '../../constants';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Dashboard from '../../components/Dashboard';

export default function DashboardPage() {
  const router = useRouter();
  const chainId = useChainId();
  const { address: userAddress, isConnected } = useAccount();
  const rampAddress = chainsToRamp[chainId]?.ramp;

  // Read approved user data from contract
  const { data: approvedUserData, isPending: isApprovedLoading } = useReadContract({
    address: rampAddress as `0x${string}` | undefined,
    abi: rampAbi,
    functionName: 'getApprovedUser',
    args: [userAddress],
    query: {
      enabled: isConnected && !!rampAddress && !!userAddress,
    },
  });

  // Redirect to home if user is not approved
  useEffect(() => {
    if (!isConnected) {
      return;
    }

    if (!isApprovedLoading && 
        (!approvedUserData || 
         approvedUserData.userAddress === '0x0000000000000000000000000000000000000000')) {
      router.push('/');
    }
  }, [approvedUserData, isApprovedLoading, isConnected, router]);

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Inco Ramp Dashboard</h1>
          <p className="mb-6">Please connect your wallet to access the dashboard</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (isApprovedLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!approvedUserData || approvedUserData.userAddress === '0x0000000000000000000000000000000000000000') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="mb-6">You need to be an approved user to access the dashboard.</p>
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

  console.log("Rendering Dashboard component with approvedUserData:", approvedUserData);
  
  return (
    <div className="min-h-screen">
      {console.log("Inside Dashboard page return statement - about to render Dashboard")}
      <ErrorBoundary fallback={<div className="p-8 text-red-500">Error loading Dashboard. Check the console for details.</div>}>
        <Dashboard approvedUserData={approvedUserData} />
      </ErrorBoundary>
      {console.log("After rendering Dashboard component")}
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
