import React, { useState, useEffect } from 'react';
import { useChainId, useReadContract, useWriteContract, useAccount } from 'wagmi';
import { readContract } from '@wagmi/core';
import { chainsToRamp, rampAbi } from '../constants';
import { Hex, createWalletClient, custom } from 'viem';
import { getViemChain, supportedChains } from '@inco/js';
import { Lightning } from '@inco/js/lite';
import TokenManagement from './TokenManagement';
import FiatManagement from './FiatManagement';

interface PendingUser {
  userAddress: string;
  kycData: string;
}

interface AdminDashboardProps {
  pendingUsers: string[];
}

interface NotificationProps {
  message: string;
  type: 'success' | 'error' | 'info';
  id: number;
}

// Interface for token details
interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
}

// ERC20 ABI for fetching token names, symbols, and decimals
const erc20Abi = [
  {
    "inputs": [],
    "name": "name",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

const AdminDashboard: React.FC<AdminDashboardProps> = ({ pendingUsers }) => {
  console.log("AdminDashboard component rendering with pendingUsers:", pendingUsers);
  
  const chainId = useChainId();
  const { address: adminAddress } = useAccount();
  const rampAddress = chainsToRamp[chainId]?.ramp;
  console.log("AdminDashboard - chainId:", chainId, "adminAddress:", adminAddress, "rampAddress:", rampAddress);
  
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [detailedUser, setDetailedUser] = useState<PendingUser | null>(null);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [activeOrderTab, setActiveOrderTab] = useState<'pending' | 'fulfilled'>('pending');
  const [isFulfilling, setIsFulfilling] = useState<number | null>(null);
  const [isCancelling, setIsCancelling] = useState<number | null>(null);
  const [decryptionAddress, setDecryptionAddress] = useState<string>('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedData, setDecryptedData] = useState<number | null>(null);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'tokens' | 'fiat' | 'approved-users'>('dashboard');
  const [notifications, setNotifications] = useState<NotificationProps[]>([]);
  const [approvedUserAddresses, setApprovedUserAddresses] = useState<string[]>([]);
  const [isDeletingUser, setIsDeletingUser] = useState<string | null>(null);
  const [isDecryptingUserDetails, setIsDecryptingUserDetails] = useState(false);
  const [userDetailsDecryptedData, setUserDetailsDecryptedData] = useState<number | null>(null);
  
  // Token details state management
  const [tokenDetails, setTokenDetails] = useState<TokenInfo[]>([]);
  const [isLoadingTokenDetails, setIsLoadingTokenDetails] = useState<boolean>(false);
  
  // Add notification handler
  const addNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setNotifications([...notifications, { message, type, id }]);
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(currentNotifications => 
        currentNotifications.filter(notification => notification.id !== id)
      );
    }, 5000);
  };
  
  // Handle view change with notifications
  const handleViewChange = (view: 'dashboard' | 'tokens' | 'fiat' | 'approved-users') => {
    if (view === 'dashboard' && activeView !== 'dashboard') {
      // Coming back from token or fiat management
      if (activeView === 'tokens') {
        addNotification('Token management session completed', 'info');
      } else if (activeView === 'fiat') {
        addNotification('Fiat currency management session completed', 'info');
      } else if (activeView === 'approved-users') {
        addNotification('Approved users management session completed', 'info');
      }
    } else if (view === 'tokens') {
      addNotification('Managing supported tokens', 'info');
    } else if (view === 'fiat') {
      addNotification('Managing fiat currencies', 'info');
    } else if (view === 'approved-users') {
      addNotification('Managing approved users', 'info');
    }
    
    setActiveView(view);
  };
  
  // Clear all notifications when unmounting
  useEffect(() => {
    return () => {
      setNotifications([]);
    };
  }, []);
  
  const { writeContractAsync } = useWriteContract();
  
  // Get all orders for admin overview
  const { data: orders } = useReadContract({
    address: rampAddress as `0x${string}` | undefined,
    abi: rampAbi,
    functionName: 'getOrders',
    query: {
      enabled: !!rampAddress,
    },
  });
  
  // Get supported tokens from contract
  const { data: supportedTokens } = useReadContract({
    address: rampAddress as `0x${string}` | undefined,
    abi: rampAbi,
    functionName: 'getSupportedTokens',
    query: {
      enabled: !!rampAddress,
    },
  });
  
  // Update orders when data changes
  useEffect(() => {
    if (orders && Array.isArray(orders)) {
      setAllOrders(orders);
    }
  }, [orders]);
  
  // Fetch token details when supported tokens change
  useEffect(() => {
    const fetchTokenDetails = async () => {
      if (!supportedTokens || !Array.isArray(supportedTokens) || supportedTokens.length === 0) return;
      
      setIsLoadingTokenDetails(true);
      setTokenDetails([]);
      
      try {
        const tokenInfo: TokenInfo[] = [];
        
        // Process each token one by one
        for (const tokenAddress of supportedTokens) {
          try {
            // Check if window.ethereum is available
            if (!window.ethereum) {
              throw new Error("Ethereum provider not available");
            }
            
            // Read name using direct contract read
            const nameResult = await window.ethereum.request({
              method: 'eth_call',
              params: [
                {
                  to: tokenAddress,
                  data: '0x06fdde03', // Function signature for name()
                },
                'latest',
              ],
            });
            
            // Read symbol using direct contract read
            const symbolResult = await window.ethereum.request({
              method: 'eth_call',
              params: [
                {
                  to: tokenAddress,
                  data: '0x95d89b41', // Function signature for symbol()
                },
                'latest',
              ],
            });
            
            // Read decimals using direct contract read
            const decimalsResult = await window.ethereum.request({
              method: 'eth_call',
              params: [
                {
                  to: tokenAddress,
                  data: '0x313ce567', // Function signature for decimals()
                },
                'latest',
              ],
            });
            
            // Decode the hex strings to get readable names/symbols
            const decodeHexString = (hex: string): string => {
              try {
                if (!hex || hex === '0x') return 'Unknown';
                
                // Remove 0x prefix
                const cleanHex = hex.slice(2);
                
                // The first 64 characters (32 bytes) are the offset
                // The next 64 characters (32 bytes) are the length
                // The remaining characters are the actual string data
                
                if (cleanHex.length < 128) return 'Unknown';
                
                const lengthHex = cleanHex.slice(64, 128);
                const length = parseInt(lengthHex, 16);
                
                if (length === 0) return 'Unknown';
                
                const dataHex = cleanHex.slice(128, 128 + (length * 2));
                
                // Convert hex to string
                let result = '';
                for (let i = 0; i < dataHex.length; i += 2) {
                  const byte = parseInt(dataHex.substr(i, 2), 16);
                  if (byte !== 0) { // Skip null bytes
                    result += String.fromCharCode(byte);
                  }
                }
                
                return result || 'Unknown';
              } catch (error) {
                console.error('Error decoding hex string:', error);
                return 'Unknown';
              }
            };
            
            // Add token info to the list
            tokenInfo.push({
              address: tokenAddress,
              name: nameResult ? decodeHexString(nameResult) : 'Unknown',
              symbol: symbolResult ? decodeHexString(symbolResult) : '???',
              decimals: decimalsResult ? parseInt(decimalsResult, 16) : 18, // Default to 18 if decimals not available
            });
          } catch (error) {
            console.error(`Error fetching details for token ${tokenAddress}:`, error);
            tokenInfo.push({
              address: tokenAddress,
              name: 'Unknown',
              symbol: '???',
              decimals: 18, // Default to 18 decimals for unknown tokens
            });
          }
        }
        
        setTokenDetails(tokenInfo);
      } catch (error) {
        console.error('Error fetching token details:', error);
      } finally {
        setIsLoadingTokenDetails(false);
      }
    };
    
    fetchTokenDetails();
  }, [supportedTokens]);
  
  // Helper function to get token label from address
  const getTokenLabel = (tokenAddress: string): string => {
    if (!tokenAddress) {
      return 'Unknown Token';
    }
    
    const token = tokenDetails.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
    
    if (token && token.symbol) {
      return token.symbol;
    }
    // Fallback to last 6 characters of address if symbol not found
    return `${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`;
  };

  // Helper function to format token amounts with proper decimals
  const formatTokenAmount = (amount: string | number, tokenAddress: string): string => {
    if (!tokenAddress || !amount) return '0';
    
    const token = tokenDetails.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
    const decimals = token?.decimals || 18;
    
    // Convert the raw amount to a proper decimal representation
    const rawAmount = BigInt(amount.toString());
    const divisor = BigInt(10 ** decimals);
    const integerPart = rawAmount / divisor;
    const fractionalPart = rawAmount % divisor;
    
    // Format with up to 6 decimal places for display
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const truncatedFractional = fractionalStr.substring(0, 6).replace(/0+$/, '');
    
    if (truncatedFractional === '') {
      return integerPart.toString();
    }
    
    return `${integerPart.toString()}.${truncatedFractional}`;
  };

  // Helper function to format fiat amounts (divide by 1e18)
  const formatFiatAmount = (amount: string | number): string => {
    if (!amount) return '0';
    
    // Convert to BigInt for precise calculation
    const rawAmount = BigInt(amount.toString());
    const divisor = BigInt(10 ** 18); // 1e18
    const integerPart = rawAmount / divisor;
    const fractionalPart = rawAmount % divisor;
    
    // Format with up to 2 decimal places for fiat
    const fractionalStr = fractionalPart.toString().padStart(18, '0');
    const truncatedFractional = fractionalStr.substring(0, 2).replace(/0+$/, '');
    
    if (truncatedFractional === '') {
      return integerPart.toString();
    }
    
    return `${integerPart.toString()}.${truncatedFractional}`;
  };
  
  // Function to handle fulfilling an order
  const handleFulfillOrder = async (orderId: number) => {
    if (!rampAddress) return;
    
    try {
      setIsFulfilling(orderId);
      await writeContractAsync({
        address: rampAddress as `0x${string}`,
        abi: rampAbi,
        functionName: 'fullFillOrder',
        args: [BigInt(orderId)],
      });
      addNotification(`Order #${orderId} has been fulfilled`, 'success');
    } catch (error: any) {
      console.error('Error fulfilling order:', error);
      addNotification(`Failed to fulfill order: ${error.message}`, 'error');
    } finally {
      setIsFulfilling(null);
    }
  };
  
  // Function to handle canceling an order
  const handleCancelOrder = async (orderId: number) => {
    if (!rampAddress) return;
    
    try {
      setIsCancelling(orderId);
      await writeContractAsync({
        address: rampAddress as `0x${string}`,
        abi: rampAbi,
        functionName: 'cancelOrder',
        args: [BigInt(orderId)],
      });
      addNotification(`Order #${orderId} has been cancelled`, 'info');
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      addNotification(`Failed to cancel order: ${error.message}`, 'error');
    } finally {
      setIsCancelling(null);
    }
  };
  
  // Function to handle user approval
  const handleApproveUser = async (userAddress: string) => {
    if (!rampAddress) return;
    
    try {
      setIsApproving(true);
      await writeContractAsync({
        address: rampAddress as `0x${string}`,
        abi: rampAbi,
        functionName: 'approveUserRegistration',
        args: [userAddress],
      });
      setSelectedUser(null);
      setDetailedUser(null);
      addNotification(`User ${userAddress} has been approved`, 'success');
    } catch (error: any) {
      console.error('Error approving user:', error);
      addNotification(`Failed to approve user: ${error.message}`, 'error');
    } finally {
      setIsApproving(false);
    }
  };
  
  // Function to handle user rejection
  const handleRejectUser = async (userAddress: string) => {
    if (!rampAddress) return;
    
    try {
      setIsRejecting(true);
      await writeContractAsync({
        address: rampAddress as `0x${string}`,
        abi: rampAbi,
        functionName: 'rejectUserRegistration',
        args: [userAddress],
      });
      setSelectedUser(null);
      setDetailedUser(null);
      addNotification(`User ${userAddress} has been rejected`, 'info');
    } catch (error: any) {
      console.error('Error rejecting user:', error);
      addNotification(`Failed to reject user: ${error.message}`, 'error');
    } finally {
      setIsRejecting(false);
    }
  };
  
  // Add a contract read function for getting pending user data
  const { data: selectedPendingUserData } = useReadContract({
    address: rampAddress as `0x${string}` | undefined,
    abi: rampAbi,
    functionName: 'getPendingUser',
    args: [selectedUser as `0x${string}` || '0x0000000000000000000000000000000000000000'],
    query: {
      enabled: !!rampAddress && !!selectedUser,
    },
  });
  
  // Update detailed user data when selected user changes
  useEffect(() => {
    if (selectedUser) {
      // Handle even if selectedPendingUserData is undefined or invalid
      if (selectedPendingUserData) {
        const userData = selectedPendingUserData as any;
        
        // Check if userData has expected structure
        if (userData && typeof userData === 'object') {
          setDetailedUser({
            userAddress: selectedUser,
            kycData: userData.kycData || '[Encrypted KYC Data]',
          });
        } else {
          // Handle case when userData is not in expected format
          console.warn("User data is not in the expected format:", userData);
          setDetailedUser({
            userAddress: selectedUser,
            kycData: '[Encrypted KYC Data - Format Error]',
          });
        }
      } else {
        // Handle null/undefined data
        console.warn("No user data found for selected user");
        setDetailedUser({
          userAddress: selectedUser,
          kycData: '[No encrypted data available]',
        });
      }
    }
  }, [selectedUser, selectedPendingUserData]);
  
  // Function to get detailed user data
  const handleViewUserDetails = async (userAddress: string) => {
    if (!rampAddress) return;
    
    try {
      // Just set the selected user, which will trigger the useReadContract hook
      setSelectedUser(userAddress);
    } catch (error) {
      console.error('Error selecting user details:', error);
    }
  };

  // Function to handle view user details KYC data decryption
  const handleDecryptUserDetails = async () => {
    if (!selectedUser || !rampAddress || !adminAddress || !detailedUser) {
      setDecryptionError("Missing required data for decryption. Please connect your wallet.");
      return;
    }
    
    // Additional validation for kycData
    if (!detailedUser.kycData || 
        detailedUser.kycData === '[No encrypted data available]' || 
        detailedUser.kycData === '[Encrypted KYC Data - Format Error]') {
      addNotification("No valid encrypted data available for this user.", "error");
      return;
    }
    
    try {
      setIsDecryptingUserDetails(true);
      setDecryptionError(null);
      setUserDetailsDecryptedData(null);
      
      // Determine which chain to use for Inco
      let chainIdForInco;
      if (chainId === 84532) {
        // Base Sepolia
        chainIdForInco = supportedChains.baseSepolia;
      } else {
        // Fallback to Base Sepolia if chain not recognized
        chainIdForInco = supportedChains.baseSepolia;
      }
      
      // Create a Lightning instance - use Lightning.latest pattern to avoid parsing errors
      const zap = Lightning.latest('testnet', chainIdForInco);
      console.log("Lightning instance created for user details decryption");

      let signingWalletClient;
      if (typeof window !== "undefined" && window.ethereum) {
        signingWalletClient = createWalletClient({
          account: adminAddress as Hex, // This will be targetDecryptionAccount if the check above passes
          chain: getViemChain(chainIdForInco),
          transport: custom(window.ethereum), // Use the browser's Ethereum provider for signing
        });
      } else {
        setDecryptionError("Ethereum provider (e.g., MetaMask) not found. Please ensure your wallet is connected.");
        setIsDecryptingUserDetails(false);
        addNotification("Wallet connection error", "error");
        return;
      }
      
      console.log("Using wallet address for signing:", signingWalletClient.account.address);
      console.log("Using dapp address:", rampAddress);
      
      // Validate that kycData is a valid hex string
      let resultHandle: Hex;
      try {
        // Check if kycData is a valid hex string and make it a proper Hex type
        const hexPattern = /^0x[0-9a-fA-F]+$/;
        if (hexPattern.test(detailedUser.kycData)) {
          resultHandle = detailedUser.kycData as Hex;
        } else {
          throw new Error("Invalid KYC data format - not a valid hexadecimal string");
        }
        console.log("Result handle for decryption:", resultHandle);
      } catch (hexError) {
        console.error("Error processing KYC data:", hexError);
        throw new Error("Invalid KYC data format");
      }
      
      try {
        // Get reencryptor using the signing-capable walletClient
        const reencryptor = await zap.getReencryptor(signingWalletClient);
        console.log("Reencryptor obtained successfully");
        
        const resultPlaintext = await reencryptor({ handle: resultHandle });
        console.log("Decryption complete");
        
        // Store the decrypted value
        const decryptedValue = Number(resultPlaintext.value);
        console.log("Decrypted value:", decryptedValue);
        setUserDetailsDecryptedData(decryptedValue);
        addNotification("KYC data successfully decrypted", "success");
      } catch (innerError: any) {
        console.error("Error during reencryption process:", innerError);
        throw new Error(`Decryption process failed: ${innerError.message}`);
      }
      
    } catch (error: any) {
      console.error("Error requesting decryption:", error);
      setDecryptionError("Failed to decrypt data: " + error.message);
      addNotification("Failed to decrypt data: " + error.message, "error");
    } finally {
      setIsDecryptingUserDetails(false);
    }
  };

  // Add a contract read function for getting approved user data for decryption
  const { data: approvedUserForDecryption, refetch: refetchApprovedUser } = useReadContract({
    address: rampAddress as `0x${string}` | undefined,
    abi: rampAbi,
    functionName: 'getApprovedUser',
    args: [decryptionAddress as `0x${string}` || '0x0000000000000000000000000000000000000000'],
    query: {
      enabled: !!rampAddress && !!decryptionAddress && decryptionAddress.length > 0,
    },
  });

  // Get list of approved users
  const { data: approvedUsers } = useReadContract({
    address: rampAddress as `0x${string}` | undefined,
    abi: rampAbi,
    functionName: 'getListOfApprovedUsers',
    query: {
      enabled: !!rampAddress && activeView === 'approved-users',
    },
  });

  // Update approved user addresses when data changes
  useEffect(() => {
    if (approvedUsers && Array.isArray(approvedUsers)) {
      setApprovedUserAddresses(approvedUsers as string[]);
    }
  }, [approvedUsers]);

  // No need to fetch user details since we're only showing addresses and delete buttons

  // Function to handle deleting a user
  const handleDeleteUser = async (userAddress: string) => {
    if (!rampAddress) return;
    
    try {
      setIsDeletingUser(userAddress);
      await writeContractAsync({
        address: rampAddress as `0x${string}`,
        abi: rampAbi,
        functionName: 'deleteUser',
        args: [userAddress],
      });
      
      // Remove the user from the local state
      setApprovedUserAddresses(prevAddresses => 
        prevAddresses.filter(address => address !== userAddress)
      );
      
      addNotification(`User ${userAddress} has been deleted successfully`, 'success');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      addNotification(`Failed to delete user: ${error.message}`, 'error');
    } finally {
      setIsDeletingUser(null);
    }
  };
  
  // Function to handle KYC data decryption request by admin
  const handleDecryptRequest = async () => {
    if (!decryptionAddress || !rampAddress || !adminAddress) {
      setDecryptionError("Missing required data for decryption. Please connect your wallet.");
      return;
    }
    
    try {
      setIsDecrypting(true);
      setDecryptionError(null);
      setDecryptedData(null);
      
      // Refetch the approved user data first
      await refetchApprovedUser();
      
      const userData = approvedUserForDecryption as any;
      
      // Use the data fetched by the hook
      if (!userData || userData.userAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error("User not found or not approved");
      }
      
      // Determine which chain to use for Inco
      let chainIdForInco;
      if (chainId === 84532) {
        // Base Sepolia
        chainIdForInco = supportedChains.baseSepolia;
      } else {
        // Fallback to Base Sepolia if chain not recognized
        chainIdForInco = supportedChains.baseSepolia;
      }
      
      // Create a Lightning instance - use Lightning.latest pattern to avoid parsing errors
      const zap = Lightning.latest('testnet', chainIdForInco);
      console.log("Lightning instance created");

      let signingWalletClient;
      if (typeof window !== "undefined" && window.ethereum) {
        signingWalletClient = createWalletClient({
          account: adminAddress as Hex, // This will be targetDecryptionAccount if the check above passes
          chain: getViemChain(chainIdForInco),
          transport: custom(window.ethereum), // Use the browser's Ethereum provider for signing
        });
      } else {
        setDecryptionError("Ethereum provider (e.g., MetaMask) not found. Please ensure your wallet is connected and you are on the correct page.");
        setIsDecrypting(false);
        return;
      }
      
      console.log("Using wallet address for signing:", signingWalletClient.account.address);
      console.log("Using dapp address:", rampAddress);
      
      // The kycData from the contract is our resultHandle (referencing the encrypted data)
      const resultHandle = userData.kycData as Hex;
      console.log("Result handle for decryption:", resultHandle);
      
      try {
        // Get reencryptor using the signing-capable walletClient
        const reencryptor = await zap.getReencryptor(signingWalletClient);
        console.log("Reencryptor obtained successfully");
        
        const resultPlaintext = await reencryptor({ handle: resultHandle });
        console.log("Decryption complete");
        
        // Store the decrypted value
        const decryptedValue = Number(resultPlaintext.value);
        console.log("Decrypted value:", decryptedValue);
        setDecryptedData(decryptedValue);
        addNotification("KYC data successfully decrypted", "success");
      } catch (innerError: any) {
        console.error("Error during reencryption process:", innerError);
        throw new Error(`Decryption process failed: ${innerError.message}`);
      }
      
    } catch (error: any) {
      console.error("Error requesting decryption:", error);
      setDecryptionError("Failed to decrypt data: " + error.message);
      addNotification("Failed to decrypt data", "error");
    } finally {
      setIsDecrypting(false);
    }
  };

  // ApprovedUsersManagement component for displaying and managing approved users
  const ApprovedUsersManagement = () => {
    return (
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-slate-200">Approved Users Management</h2>
          <button
            onClick={() => handleViewChange('dashboard')}
            className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors duration-200"
          >
            Back to Dashboard
          </button>
        </div>
        
        <div className="p-6">
          {approvedUserAddresses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400">No approved users found</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-slate-300 mb-2">Total Approved Users: {approvedUserAddresses.length}</p>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-700">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        User Address
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-900/20 divide-y divide-slate-700">
                    {approvedUserAddresses.map((userAddress) => {
                      const isDeleting = isDeletingUser === userAddress;
                      
                      return (
                        <tr key={userAddress} className="hover:bg-slate-800/30 transition-colors duration-200">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-200 break-all">
                            {userAddress}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            <button
                              onClick={() => handleDeleteUser(userAddress)}
                              disabled={isDeleting}
                              className={`px-3 py-1 text-sm rounded-lg transition-all duration-200 ${
                                isDeleting
                                  ? "bg-slate-600 text-slate-400 cursor-not-allowed"
                                  : "bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 border border-red-500/30"
                              }`}
                            >
                              {isDeleting ? "Deleting..." : "Delete User"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 w-80">
        {notifications.map(notification => (
          <div 
            key={notification.id} 
            className={`mb-2 p-4 rounded-xl shadow-lg text-sm flex justify-between items-center backdrop-blur-sm transition-all duration-300 border ${
              notification.type === 'success' 
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                : notification.type === 'error' 
                  ? 'bg-red-500/10 text-red-300 border-red-500/30' 
                  : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
            }`}
          >
            <div>{notification.message}</div>
            <button 
              onClick={() => setNotifications(notifications.filter(n => n.id !== notification.id))} 
              className="ml-2 text-slate-400 hover:text-slate-200 transition-colors duration-200"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Content based on active view */}
      {activeView === 'tokens' && (
        <TokenManagement 
          onBack={() => handleViewChange('dashboard')} 
          addNotification={addNotification} 
        />
      )}
      
      {activeView === 'fiat' && (
        <FiatManagement 
          onBack={() => handleViewChange('dashboard')} 
          addNotification={addNotification} 
        />
      )}
      
      {activeView === 'approved-users' && (
        <ApprovedUsersManagement />
      )}
      
      {activeView === 'dashboard' && (
        <>
          <h1 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">Admin Dashboard</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar with admin info */}
            <div className="lg:col-span-1">
              <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
                <h2 className="text-xl font-semibold mb-4 text-slate-200">Admin Controls</h2>
                <div className="space-y-4">
                  <div className="py-3 px-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <h3 className="font-medium mb-1 text-blue-300">Pending Approvals</h3>
                    <p className="text-sm text-slate-400">
                      {pendingUsers ? pendingUsers.length : 0} users waiting for approval
                    </p>
                  </div>
                  
                  <div className="py-3 px-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <h3 className="font-medium mb-1 text-emerald-300">Orders Overview</h3>
                    <p className="text-sm text-slate-400">
                      Total Orders: {allOrders.length || 0}
                    </p>
                    <p className="text-sm text-slate-400">
                      Pending Fulfillment: {allOrders.filter(order => !order.fulfilled).length || 0}
                    </p>
                  </div>
                  
                  <div className="py-3 px-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <h3 className="font-medium mb-1 text-purple-300">Quick Actions</h3>
                    <div className="space-y-2 mt-2">
                      <button 
                        className="w-full py-2 px-3 text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 font-medium"
                        onClick={() => handleViewChange('tokens')}
                      >
                        Manage Supported Tokens
                      </button>
                      <button 
                        className="w-full py-2 px-3 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium"
                        onClick={() => handleViewChange('approved-users')}
                      >
                        Manage Approved Users
                      </button>
                      <button 
                        className="w-full py-2 px-3 text-sm bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 font-medium"
                        onClick={() => handleViewChange('fiat')}
                      >
                        Manage Fiat Currencies
                      </button>
                    </div>
                  </div>
                  
                  {/* KYC Data Decryption Request Section */}
                  <div className="py-3 px-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                    <h3 className="font-medium mb-3 text-orange-300">Request KYC Decryption</h3>
                    <p className="text-xs text-slate-400 mb-3">
                      Enter a user address to request decryption of their KYC data. This should only be used when legally required.
                    </p>
                    <div className="space-y-3">
                      {decryptedData !== null ? (
                        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-600">
                          <p className="text-sm font-medium mb-1 text-slate-300">Decrypted KYC Document Number:</p>
                          <p className="text-lg font-mono bg-slate-700/50 p-2 rounded border border-slate-600 break-all text-emerald-300">{decryptedData}</p>
                          <button 
                            onClick={() => setDecryptedData(null)} 
                            className="mt-3 text-sm text-orange-400 hover:text-orange-300 underline transition-colors duration-200"
                          >
                            Decrypt another
                          </button>
                        </div>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={decryptionAddress}
                            onChange={(e) => setDecryptionAddress(e.target.value)}
                            placeholder="User Address (0x...)"
                            className="w-full px-3 py-2 text-sm bg-slate-800/50 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                          />
                          <button
                            onClick={handleDecryptRequest}
                            disabled={!decryptionAddress || isDecrypting}
                            className={`w-full py-2 px-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                              !decryptionAddress || isDecrypting
                                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700'
                            }`}
                          >
                            {isDecrypting ? 'Processing...' : 'Request Decryption'}
                          </button>
                        </>
                      )}
                      
                      {decryptionError && (
                        <div className="text-sm text-red-400 mt-2 bg-red-500/10 p-2 rounded border border-red-500/20">{decryptionError}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Main dashboard area */}
            <div className="lg:col-span-3">
              {/* Pending User Approvals */}
              <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4 text-slate-200">Pending User Registrations</h2>
                
                {pendingUsers && pendingUsers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-700">
                      <thead className="bg-slate-800/50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            User Address
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-slate-900/20 divide-y divide-slate-700">
                        {pendingUsers.map((userAddress) => (
                          <tr key={userAddress} className={`transition-colors duration-200 ${selectedUser === userAddress ? 'bg-blue-500/20' : 'hover:bg-slate-800/30'}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-200">
                              {`${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 space-x-3">
                              <button
                                onClick={() => handleViewUserDetails(userAddress)}
                                className="text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200"
                              >
                                View Details
                              </button>
                              <button
                                onClick={() => handleApproveUser(userAddress)}
                                disabled={isApproving}
                                className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors duration-200"
                              >
                                {isApproving && selectedUser === userAddress ? 'Approving...' : 'Approve'}
                              </button>
                              <button
                                onClick={() => handleRejectUser(userAddress)}
                                disabled={isRejecting}
                                className="text-red-400 hover:text-red-300 font-medium transition-colors duration-200"
                              >
                                {isRejecting && selectedUser === userAddress ? 'Rejecting...' : 'Reject'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    No pending user registrations found
                  </div>
                )}
              </div>
              
              {/* User Details Section */}
              {selectedUser && detailedUser && (
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-slate-200">User Details</h2>
                    <button 
                      onClick={() => {
                        setSelectedUser(null);
                        setDetailedUser(null);
                      }}
                      className="text-slate-400 hover:text-slate-200 transition-colors duration-200"
                    >
                      Close
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-400">User Address</p>
                      <p className="font-medium break-all text-slate-200">{detailedUser.userAddress}</p>
                    </div>
                    <div>
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-slate-400">KYC Data (Encrypted)</p>
                        <button
                          onClick={handleDecryptUserDetails}
                          disabled={isDecryptingUserDetails}
                          className={`text-sm px-3 py-1 rounded-lg transition-all duration-200 ${
                            isDecryptingUserDetails 
                              ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
                              : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30'
                          }`}
                        >
                          {isDecryptingUserDetails ? 'Decrypting...' : 'Request Decryption'}
                        </button>
                      </div>
                      
                      {userDetailsDecryptedData !== null ? (
                        <div className="mt-2 mb-2">
                          <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/30">
                            <p className="text-sm font-medium text-emerald-300 mb-1">Decrypted KYC Document Number:</p>
                            <p className="text-lg font-mono bg-slate-800/50 p-2 rounded break-all text-emerald-300">{userDetailsDecryptedData}</p>
                          </div>
                          <button 
                            onClick={() => setUserDetailsDecryptedData(null)} 
                            className="mt-2 text-xs text-purple-400 hover:text-purple-300 transition-colors duration-200"
                          >
                            Hide decrypted data
                          </button>
                        </div>
                      ) : (
                        <div className="bg-slate-800/50 p-3 rounded-lg overflow-auto max-h-40 border border-slate-600">
                          <pre className="text-xs text-slate-300">{detailedUser.kycData}</pre>
                        </div>
                      )}
                      
                      <p className="text-xs text-slate-500 mt-2">
                        * This data is encrypted on-chain. Admin can decrypt it when legally required.
                      </p>
                      
                      {decryptionError && (
                        <div className="mt-2 text-sm text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">{decryptionError}</div>
                      )}
                    </div>
                    
                    <div className="flex space-x-3 pt-3">
                      <button
                        onClick={() => handleApproveUser(detailedUser.userAddress)}
                        disabled={isApproving}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                          isApproving ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700'
                        }`}
                      >
                        {isApproving ? 'Approving...' : 'Approve User'}
                      </button>
                      <button
                        onClick={() => handleRejectUser(detailedUser.userAddress)}
                        disabled={isRejecting}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                          isRejecting ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                        }`}
                      >
                        {isRejecting ? 'Rejecting...' : 'Reject User'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Orders Management */}
              <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 mt-6">
                <h2 className="text-xl font-semibold mb-4 text-slate-200">Orders Management</h2>
                
                {/* Order Tabs */}
                <div className="flex border-b border-slate-700 mb-4">
                  <button
                    className={`pb-2 px-4 text-sm font-medium transition-colors duration-200 ${
                      activeOrderTab === 'pending'
                        ? 'border-b-2 border-emerald-400 text-emerald-400'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    onClick={() => setActiveOrderTab('pending')}
                  >
                    Pending Orders
                  </button>
                  <button
                    className={`pb-2 px-4 text-sm font-medium transition-colors duration-200 ${
                      activeOrderTab === 'fulfilled'
                        ? 'border-b-2 border-emerald-400 text-emerald-400'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    onClick={() => setActiveOrderTab('fulfilled')}
                  >
                    Fulfilled Orders
                  </button>
                </div>
                
                {/* Orders Table */}
                {allOrders && allOrders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-700">
                      <thead className="bg-slate-800/50">
                        <tr>
                          <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            ID
                          </th>
                          <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            User
                          </th>
                          <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            Type
                          </th>
                          <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            Amount
                          </th>
                          <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            Date
                          </th>
                          {activeOrderTab === 'pending' && (
                            <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                              Actions
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-slate-900/20 divide-y divide-slate-700">
                        {allOrders
                          .filter(order => 
                            activeOrderTab === 'pending' 
                              ? !order.fulfilled 
                              : order.fulfilled
                          )
                          .map((order) => (
                            <tr key={order.id} className="hover:bg-slate-800/30 transition-colors duration-200">
                              <td className="px-2 py-4 whitespace-nowrap text-sm font-medium text-slate-200">
                                #{Number(order.id)}
                              </td>
                              <td className="px-2 py-4 whitespace-nowrap text-sm text-slate-300">
                                {`${order.user.userAddress.substring(0, 6)}...${order.user.userAddress.substring(order.user.userAddress.length - 4)}`}
                              </td>
                              <td className="px-2 py-4 whitespace-nowrap text-sm text-slate-300">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  order.isCryptoToFiat 
                                    ? 'bg-orange-500/20 text-orange-300' 
                                    : 'bg-blue-500/20 text-blue-300'
                                }`}>
                                  {order.isCryptoToFiat ? 'Crypto → Fiat' : 'Fiat → Crypto'}
                                </span>
                              </td>
                              <td className="px-2 py-4 whitespace-nowrap text-sm text-slate-300">
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-slate-400">Token:</span>
                                    <span>
                                      {isLoadingTokenDetails
                                        ? `${Number(order.amountOfToken)} tokens (loading...)`
                                        : `${formatTokenAmount(order.amountOfToken, order.tokenAddress)} ${getTokenLabel(order.tokenAddress)}`}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-slate-400">Fiat:</span>
                                    <span>${formatFiatAmount(order.amountOfFiatInUsd)} {order.fiat}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 py-4 whitespace-nowrap text-sm text-slate-300">
                                {new Date(Number(order.timestamp) * 1000).toLocaleString()}
                              </td>
                              {activeOrderTab === 'pending' && (
                                <td className="px-2 py-4 whitespace-nowrap text-sm text-slate-300 space-x-2">
                                  <button
                                    onClick={() => handleFulfillOrder(Number(order.id))}
                                    disabled={isFulfilling === Number(order.id)}
                                    className={`px-3 py-1 text-xs rounded-lg transition-all duration-200 font-medium ${
                                      isFulfilling === Number(order.id)
                                        ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                        : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                                    }`}
                                  >
                                    {isFulfilling === Number(order.id) ? 'Processing...' : 'Fulfill'}
                                  </button>
                                  <button
                                    onClick={() => handleCancelOrder(Number(order.id))}
                                    disabled={isCancelling === Number(order.id)}
                                    className={`px-3 py-1 text-xs rounded-lg transition-all duration-200 font-medium ${
                                      isCancelling === Number(order.id)
                                        ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                        : 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30'
                                    }`}
                                  >
                                    {isCancelling === Number(order.id) ? 'Processing...' : 'Cancel'}
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    No {activeOrderTab} orders found
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
