"use client"; // Essential for client-side logic

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { anvil, zksync, mainnet, base, baseSepolia} from "wagmi/chains"; // Import your desired chains
import { http, createStorage } from "wagmi";

// Retrieve the WalletConnect Project ID from environment variables
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// Basic error handling for missing Project ID
if (!walletConnectProjectId) {
  throw new Error("Error: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not defined. Please set it in your .env.local file");
}

// Create a custom storage with error handling
const customStorage = createStorage({
  storage: typeof window !== 'undefined' 
    ? {
        getItem: (key) => {
          try {
            return window.localStorage.getItem(key);
          } catch (error) {
            console.warn(`Error reading key "${key}" from localStorage:`, error);
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            window.localStorage.setItem(key, value);
          } catch (error) {
            console.warn(`Error setting key "${key}" to localStorage:`, error);
          }
        },
        removeItem: (key) => {
          try {
            window.localStorage.removeItem(key);
          } catch (error) {
            console.warn(`Error removing key "${key}" from localStorage:`, error);
          }
        }
      } 
    : undefined
});

// Define the configuration object
const config = getDefaultConfig({
  appName: "TSender", // Your dApp's name, shown in wallet prompts
  projectId: walletConnectProjectId, // WalletConnect Cloud Project ID
  chains: [anvil, zksync, mainnet, base, baseSepolia], // Array of chains your dApp supports
  ssr: false, // Set to false for static sites or if not heavily using SSR with wagmi
  storage: customStorage,
  transports: {
    [anvil.id]: http(),
    [zksync.id]: http(),
    [mainnet.id]: http(),
    [base.id]: http(),
    [baseSepolia.id]: http()
  }
});

export default config; // Export for use in Providers