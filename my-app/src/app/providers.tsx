"use client";

import * as React from 'react';
import { useState, useEffect } from 'react';
import { RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import config from '@/rainbowKitConfig'; // Import the configuration we created

// Import RainbowKit CSS for default styling
import '@rainbow-me/rainbowkit/styles.css';

// Create a single QueryClient instance with error handling configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

// Define the Providers component
export function Providers({ children }: { children: React.ReactNode }) {
  // Hydration safety check: ensure component mounts on client before rendering children
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    
    // Clear localStorage WalletConnect cache if there are issues
    if (typeof window !== 'undefined') {
      const clearWalletConnectCache = () => {
        const keys = Object.keys(localStorage);
        const wcKeys = keys.filter(key => 
          key.startsWith('wc@') || 
          key.startsWith('wagmi') || 
          key.startsWith('rk-') ||
          key.includes('walletconnect')
        );
        
        if (wcKeys.length > 0 && window.location.search.includes('clear_wc_cache')) {
          for (const key of wcKeys) {
            localStorage.removeItem(key);
          }
          console.log('WalletConnect cache cleared');
        }
      };
      
      clearWalletConnectCache();
    }
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={lightTheme({
          accentColor: '#7b3fe4',
          accentColorForeground: 'white',
          borderRadius: 'medium',
        })}>
          {/* Only render children after client-side mounting */}
          {mounted ? children : null}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}