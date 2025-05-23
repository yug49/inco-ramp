import React, { useState, useEffect } from 'react';
import { useChainId, useReadContract, useWriteContract, useAccount } from 'wagmi';
import { chainsToRamp, rampAbi } from '../constants';
import { Hex, createWalletClient, custom } from 'viem';
import { getViemChain, supportedChains} from '@inco/js';
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
  const [activeView, setActiveView] = useState<'dashboard' | 'tokens' | 'fiat'>('dashboard');
  const [notifications, setNotifications] = useState<NotificationProps[]>([]);
  
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
  const handleViewChange = (view: 'dashboard' | 'tokens' | 'fiat') => {
    if (view === 'dashboard' && activeView !== 'dashboard') {
      // Coming back from token or fiat management
      if (activeView === 'tokens') {
        addNotification('Token management session completed', 'info');
      } else if (activeView === 'fiat') {
        addNotification('Fiat currency management session completed', 'info');
      }
    } else if (view === 'tokens') {
      addNotification('Managing supported tokens', 'info');
    } else if (view === 'fiat') {
      addNotification('Managing fiat currencies', 'info');
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
    if (selectedUser && selectedPendingUserData) {
      const userData = selectedPendingUserData as any;
      setDetailedUser({
        userAddress: selectedUser,
        kycData: userData.kycData || '[Encrypted KYC Data]',
      });
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

  return (
    <div className="container mx-auto px-4 py-8">
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
                      <p className="text-sm text-gray-500">KYC Data (Encrypted)</p>
                      <div className="bg-gray-100 p-3 rounded-md overflow-auto max-h-40">
                        <pre className="text-xs">{detailedUser.kycData}</pre>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        * This data is encrypted on-chain. Only the user can request decryption.
                      </p>
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
      
      {/* Notifications Toasts */}
      <div className="fixed top-4 right-4 z-50">
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
            <div>
              {notification.message}
            </div>
            <button 
              onClick={() => setNotifications(notifications.filter(n => n.id !== notification.id))}
              className="ml-3 text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
