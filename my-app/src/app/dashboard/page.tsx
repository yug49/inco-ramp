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
         (approvedUserData as any).userAddress === '0x0000000000000000000000000000000000000000')) {
      router.push('/');
    }
  }, [approvedUserData, isApprovedLoading, isConnected, router]);

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="text-center bg-slate-900/50 backdrop-blur-sm rounded-2xl p-10 border border-slate-800 max-w-md w-full">
          <div className="w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold text-slate-200 mb-4">Inco Ramp Dashboard</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Please connect your wallet to access your dashboard and manage your transactions
          </p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  if (isApprovedLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-emerald-400 rounded-full animate-ping"></div>
          </div>
          <p className="mt-6 text-slate-400 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (!approvedUserData || (approvedUserData as any).userAddress === '0x0000000000000000000000000000000000000000') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="text-center bg-slate-900/50 backdrop-blur-sm rounded-2xl p-10 border border-slate-800 max-w-md w-full">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-200 mb-4">Access Denied</h1>
          <p className="text-slate-400 mb-8">You need to be an approved user to access the dashboard.</p>
          <button 
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all font-medium"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  console.log("Rendering Dashboard component with approvedUserData:", approvedUserData);
  
  return (
    <div className="min-h-screen bg-slate-950">
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
