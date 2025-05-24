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
  
  // Update orders when data changes
  useEffect(() => {
    if (orders && Array.isArray(orders)) {
      setAllOrders(orders);
    }
  }, [orders]);
  
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

      // The account for which data was encrypted and which must authorize decryption.
      const targetDecryptionAccount = "0x792b89393cA2eC17797ff6C4D17a397ffe0f4AB6";

      // Ensure the connected admin is the one authorized to decrypt.
      if (adminAddress?.toLowerCase() !== targetDecryptionAccount.toLowerCase()) {
        setDecryptionError(`Decryption can only be performed by the account ${targetDecryptionAccount}. You are connected as ${adminAddress}. Please switch accounts in your wallet.`);
        setIsDecryptingUserDetails(false);
        addNotification(`Authentication error: Connect with account ${targetDecryptionAccount.substring(0, 6)}...${targetDecryptionAccount.substring(targetDecryptionAccount.length - 4)}`, "error");
        return;
      }

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

      // The account for which data was encrypted and which must authorize decryption.
      const targetDecryptionAccount = "0x792b89393cA2eC17797ff6C4D17a397ffe0f4AB6";

      // Ensure the connected admin is the one authorized to decrypt.
      if (adminAddress?.toLowerCase() !== targetDecryptionAccount.toLowerCase()) {
        setDecryptionError(`Decryption can only be performed by the account ${targetDecryptionAccount}. You are connected as ${adminAddress}. Please switch accounts in your wallet.`);
        setIsDecrypting(false);
        return;
      }

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
      <div className="bg-white rounded-lg shadow-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Approved Users Management</h2>
          <button
            onClick={() => handleViewChange('dashboard')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
        
        <div className="p-4">
          {approvedUserAddresses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No approved users found</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 mb-2">Total Approved Users: {approvedUserAddresses.length}</p>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User Address
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {approvedUserAddresses.map((userAddress) => {
                      const isDeleting = isDeletingUser === userAddress;
                      
                      return (
                        <tr key={userAddress} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 break-all">
                            {userAddress}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            <button
                              onClick={() => handleDeleteUser(userAddress)}
                              disabled={isDeleting}
                              className={`px-3 py-1 text-sm rounded ${
                                isDeleting
                                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                  : "bg-red-100 text-red-700 hover:bg-red-200"
                              } transition-colors`}
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
            className={`mb-2 p-4 rounded-lg shadow-md text-sm flex justify-between items-center ${
              notification.type === 'success' 
                ? 'bg-green-50 text-green-800' 
                : notification.type === 'error' 
                  ? 'bg-red-50 text-red-800' 
                  : 'bg-blue-50 text-blue-800'
            }`}
          >
            <div>{notification.message}</div>
            <button 
              onClick={() => setNotifications(notifications.filter(n => n.id !== notification.id))} 
              className="ml-2 text-gray-500 hover:text-gray-700"
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
          <h1 className="text-3xl font-bold mb-8 text-center">Admin Dashboard</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar with admin info */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Admin Controls</h2>
                <div className="space-y-4">
                  <div className="py-2 px-4 bg-blue-50 rounded-lg">
                    <h3 className="font-medium mb-1">Pending Approvals</h3>
                    <p className="text-sm text-gray-600">
                      {pendingUsers ? pendingUsers.length : 0} users waiting for approval
                    </p>
                  </div>
                  
                  <div className="py-2 px-4 bg-green-50 rounded-lg">
                    <h3 className="font-medium mb-1">Orders Overview</h3>
                    <p className="text-sm text-gray-600">
                      Total Orders: {allOrders.length || 0}
                    </p>
                    <p className="text-sm text-gray-600">
                      Pending Fulfillment: {allOrders.filter(order => !order.fulfilled).length || 0}
                    </p>
                  </div>
                  
                  <div className="py-2 px-4 bg-indigo-50 rounded-lg">
                    <h3 className="font-medium mb-1">Quick Actions</h3>
                    <div className="space-y-2 mt-2">
                      <button 
                        className="w-full py-1.5 px-3 text-sm bg-indigo-100 text-indigo-800 rounded hover:bg-indigo-200 transition-colors duration-200"
                        onClick={() => handleViewChange('tokens')}
                      >
                        Manage Supported Tokens
                      </button>
                      <button 
                        className="w-full py-1.5 px-3 text-sm bg-indigo-100 text-indigo-800 rounded hover:bg-indigo-200 transition-colors duration-200"
                        onClick={() => handleViewChange('approved-users')}
                      >
                        Manage Approved Users
                      </button>
                      <button 
                        className="w-full py-1.5 px-3 text-sm bg-indigo-100 text-indigo-800 rounded hover:bg-indigo-200 transition-colors duration-200"
                        onClick={() => handleViewChange('fiat')}
                      >
                        Manage Fiat Currencies
                      </button>
                    </div>
                  </div>
                  
                  {/* KYC Data Decryption Request Section */}
                  <div className="py-2 px-4 bg-purple-50 rounded-lg">
                    <h3 className="font-medium mb-3">Request KYC Decryption</h3>
                    <p className="text-xs text-gray-600 mb-3">
                      Enter a user address to request decryption of their KYC data. This should only be used when legally required.
                    </p>
                    <div className="space-y-3">
                      {decryptedData !== null ? (
                        <div className="bg-white p-4 rounded">
                          <p className="text-sm font-medium mb-1">Decrypted KYC Document Number:</p>
                          <p className="text-lg font-mono bg-gray-50 p-2 rounded break-all">{decryptedData}</p>
                          <button 
                            onClick={() => setDecryptedData(null)} 
                            className="mt-3 text-sm text-purple-600 hover:text-purple-800 underline"
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
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <button
                            onClick={handleDecryptRequest}
                            disabled={!decryptionAddress || isDecrypting}
                            className={`w-full py-1.5 px-3 text-sm font-medium rounded text-white ${
                              !decryptionAddress || isDecrypting
                                ? 'bg-gray-400'
                                : 'bg-purple-600 hover:bg-purple-700'
                            }`}
                          >
                            {isDecrypting ? 'Processing...' : 'Request Decryption'}
                          </button>
                        </>
                      )}
                      
                      {decryptionError && (
                        <div className="text-sm text-red-500 mt-2">{decryptionError}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Main dashboard area */}
            <div className="lg:col-span-3">
              {/* Pending User Approvals */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Pending User Registrations</h2>
                
                {pendingUsers && pendingUsers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User Address
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {pendingUsers.map((userAddress) => (
                          <tr key={userAddress} className={`${selectedUser === userAddress ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {`${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <button
                                onClick={() => handleViewUserDetails(userAddress)}
                                className="text-blue-600 hover:text-blue-900 mr-3"
                              >
                                View Details
                              </button>
                              <button
                                onClick={() => handleApproveUser(userAddress)}
                                disabled={isApproving}
                                className="text-green-600 hover:text-green-900 mr-3"
                              >
                                {isApproving && selectedUser === userAddress ? 'Approving...' : 'Approve'}
                              </button>
                              <button
                                onClick={() => handleRejectUser(userAddress)}
                                disabled={isRejecting}
                                className="text-red-600 hover:text-red-900"
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
                  <div className="text-center py-8 text-gray-500">
                    No pending user registrations found
                  </div>
                )}
              </div>
              
              {/* User Details Section */}
              {selectedUser && detailedUser && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">User Details</h2>
                    <button 
                      onClick={() => {
                        setSelectedUser(null);
                        setDetailedUser(null);
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Close
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500">User Address</p>
                      <p className="font-medium break-all">{detailedUser.userAddress}</p>
                    </div>
                    <div>
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-500">KYC Data (Encrypted)</p>
                        <button
                          onClick={handleDecryptUserDetails}
                          disabled={isDecryptingUserDetails}
                          className={`text-sm px-3 py-1 rounded ${
                            isDecryptingUserDetails 
                              ? 'bg-gray-300 text-gray-600' 
                              : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                          }`}
                        >
                          {isDecryptingUserDetails ? 'Decrypting...' : 'Request Decryption'}
                        </button>
                      </div>
                      
                      {userDetailsDecryptedData !== null ? (
                        <div className="mt-2 mb-2">
                          <div className="bg-green-50 p-3 rounded-md border border-green-200">
                            <p className="text-sm font-medium text-green-700 mb-1">Decrypted KYC Document Number:</p>
                            <p className="text-lg font-mono bg-white p-2 rounded break-all">{userDetailsDecryptedData}</p>
                          </div>
                          <button 
                            onClick={() => setUserDetailsDecryptedData(null)} 
                            className="mt-2 text-xs text-purple-600 hover:text-purple-800"
                          >
                            Hide decrypted data
                          </button>
                        </div>
                      ) : (
                        <div className="bg-gray-100 p-3 rounded-md overflow-auto max-h-40">
                          <pre className="text-xs">{detailedUser.kycData}</pre>
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-500 mt-2">
                        * This data is encrypted on-chain. Admin can decrypt it when legally required.
                      </p>
                      
                      {decryptionError && (
                        <div className="mt-2 text-sm text-red-500">{decryptionError}</div>
                      )}
                    </div>
                    
                    <div className="flex space-x-3 pt-3">
                      <button
                        onClick={() => handleApproveUser(detailedUser.userAddress)}
                        disabled={isApproving}
                        className={`flex-1 py-2 px-4 rounded font-medium text-white ${
                          isApproving ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {isApproving ? 'Approving...' : 'Approve User'}
                      </button>
                      <button
                        onClick={() => handleRejectUser(detailedUser.userAddress)}
                        disabled={isRejecting}
                        className={`flex-1 py-2 px-4 rounded font-medium text-white ${
                          isRejecting ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'
                        }`}
                      >
                        {isRejecting ? 'Rejecting...' : 'Reject User'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Orders Management */}
              <div className="bg-white rounded-lg shadow-md p-6 mt-6">
                <h2 className="text-xl font-semibold mb-4">Orders Management</h2>
                
                {/* Order Tabs */}
                <div className="flex border-b border-gray-200 mb-4">
                  <button
                    className={`pb-2 px-4 text-sm font-medium ${
                      activeOrderTab === 'pending'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveOrderTab('pending')}
                  >
                    Pending Orders
                  </button>
                  <button
                    className={`pb-2 px-4 text-sm font-medium ${
                      activeOrderTab === 'fulfilled'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveOrderTab('fulfilled')}
                  >
                    Fulfilled Orders
                  </button>
                </div>
                
                {/* Orders Table */}
                {allOrders && allOrders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ID
                          </th>
                          <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          {activeOrderTab === 'pending' && (
                            <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {allOrders
                          .filter(order => 
                            activeOrderTab === 'pending' 
                              ? !order.fulfilled 
                              : order.fulfilled
                          )
                          .map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50">
                              <td className="px-2 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                #{Number(order.id)}
                              </td>
                              <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                                {`${order.user.userAddress.substring(0, 6)}...${order.user.userAddress.substring(order.user.userAddress.length - 4)}`}
                              </td>
                              <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                                {order.isCryptoToFiat ? 'Crypto → Fiat' : 'Fiat → Crypto'}
                              </td>
                              <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                                {order.isCryptoToFiat 
                                  ? `${Number(order.amountOfToken)} tokens` 
                                  : `${Number(order.amountOfFiatInUsd)} ${order.fiat}`}
                              </td>
                              <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(Number(order.timestamp) * 1000).toLocaleString()}
                              </td>
                              {activeOrderTab === 'pending' && (
                                <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                                  <button
                                    onClick={() => handleFulfillOrder(Number(order.id))}
                                    disabled={isFulfilling === Number(order.id)}
                                    className={`px-3 py-1 text-xs rounded ${
                                      isFulfilling === Number(order.id)
                                        ? 'bg-gray-300'
                                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                                    }`}
                                  >
                                    {isFulfilling === Number(order.id) ? 'Processing...' : 'Fulfill'}
                                  </button>
                                  <button
                                    onClick={() => handleCancelOrder(Number(order.id))}
                                    disabled={isCancelling === Number(order.id)}
                                    className={`px-3 py-1 text-xs rounded ${
                                      isCancelling === Number(order.id)
                                        ? 'bg-gray-300'
                                        : 'bg-red-100 text-red-800 hover:bg-red-200'
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
                  <div className="text-center py-8 text-gray-500">
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
