import React, { useState, useEffect } from 'react';
import { useChainId, useReadContract, useWriteContract, useReadContracts } from 'wagmi';
import { chainsToRamp, rampAbi } from '../constants';

interface TokenManagementProps {
  onBack: () => void;
  addNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
}

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
  }
] as const;

const TokenManagement: React.FC<TokenManagementProps> = ({ onBack, addNotification }) => {
  const chainId = useChainId();
  const rampAddress = chainsToRamp[chainId]?.ramp;
  
  const [tokens, setTokens] = useState<string[]>([]);
  const [tokenDetails, setTokenDetails] = useState<TokenInfo[]>([]);
  const [newTokenAddress, setNewTokenAddress] = useState('');
  const [newPriceFeedAddress, setNewPriceFeedAddress] = useState('');
  const [tokenToRemove, setTokenToRemove] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isLoadingTokenDetails, setIsLoadingTokenDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const { writeContractAsync } = useWriteContract();
  
  // Get supported tokens
  const { data: supportedTokens, refetch: refetchTokens } = useReadContract({
    address: rampAddress as `0x${string}` | undefined,
    abi: rampAbi,
    functionName: 'getSupportedTokens',
    query: {
      enabled: !!rampAddress,
    },
  });
  
  // Update tokens when data changes
  useEffect(() => {
    if (supportedTokens && Array.isArray(supportedTokens)) {
      setTokens(supportedTokens);
    }
  }, [supportedTokens]);
  
  // Fetch token details (name and symbol) whenever the token list changes
  useEffect(() => {
    const fetchTokenDetails = async () => {
      if (!tokens || tokens.length === 0) return;
      
      setIsLoadingTokenDetails(true);
      setTokenDetails([]);
      
      try {
        const tokenInfo: TokenInfo[] = [];
        
        // Process each token one by one
        for (const tokenAddress of tokens) {
          try {
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
            
            // Decode the results (hex strings)
            const decodeHexString = (hexString: string) => {
              try {
                if (!hexString || hexString === '0x') return 'Unknown';
                
                // Remove 0x prefix and get the data portion (first 64 bytes are parameters)
                const hex = hexString.slice(2);
                
                // Get the offset to the string data (in bytes)
                const dataOffsetHex = hex.slice(0, 64);
                const dataOffset = parseInt(dataOffsetHex, 16);
                
                // Get the string length
                const lengthHex = hex.slice(dataOffset * 2, dataOffset * 2 + 64);
                const length = parseInt(lengthHex, 16);
                
                if (length === 0) return 'Unknown';
                
                // Get the string data
                const stringData = hex.slice(dataOffset * 2 + 64, dataOffset * 2 + 64 + length * 2);
                
                // Convert hex to utf-8 string
                let result = '';
                for (let i = 0; i < stringData.length; i += 2) {
                  result += String.fromCharCode(parseInt(stringData.substr(i, 2), 16));
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
            });
          } catch (error) {
            console.error(`Error fetching details for token ${tokenAddress}:`, error);
            tokenInfo.push({
              address: tokenAddress,
              name: 'Unknown',
              symbol: '???',
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
  }, [tokens]);
  
  // Function to add a new token
  const handleAddToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rampAddress || !newTokenAddress || !newPriceFeedAddress) return;
    
    try {
      setIsAdding(true);
      setError(null);
      setSuccessMessage(null);
      
      // Validate addresses
      if (!newTokenAddress.startsWith('0x') || newTokenAddress.length !== 42) {
        throw new Error('Invalid token address format');
      }
      
      if (!newPriceFeedAddress.startsWith('0x') || newPriceFeedAddress.length !== 42) {
        throw new Error('Invalid price feed address format');
      }
      
      await writeContractAsync({
        address: rampAddress as `0x${string}`,
        abi: rampAbi,
        functionName: 'addSupportedToken',
        args: [newTokenAddress, newPriceFeedAddress],
      });
      
      setNewTokenAddress('');
      setNewPriceFeedAddress('');
      const successMsg = 'Token added successfully! Fetching token details...';
      setSuccessMessage(successMsg);
      
      // Use the parent notification system if available
      if (addNotification) {
        addNotification(successMsg, 'success');
      }
      
      await refetchTokens();
    } catch (err: any) {
      console.error('Error adding token:', err);
      const errorMsg = err.message || 'Failed to add token';
      setError(errorMsg);
      
      // Use the parent notification system if available
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
    } finally {
      setIsAdding(false);
    }
  };
  
  // Function to remove a token
  const handleRemoveToken = async (tokenAddress: string) => {
    if (!rampAddress || !tokenAddress) return;
    
    // Find token details for confirmation
    const tokenToRemove = tokenDetails.find(t => t.address === tokenAddress);
    const confirmMessage = `Are you sure you want to remove ${tokenToRemove?.symbol || 'this token'}?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      setIsRemoving(true);
      setError(null);
      setSuccessMessage(null);
      
      await writeContractAsync({
        address: rampAddress as `0x${string}`,
        abi: rampAbi,
        functionName: 'removeSupportedToken',
        args: [tokenAddress],
      });
      
      const successMsg = `Token ${tokenToRemove?.symbol || ''} removed successfully!`;
      setSuccessMessage(successMsg);
      
      // Use the parent notification system if available
      if (addNotification) {
        addNotification(successMsg, 'success');
      }
      
      await refetchTokens();
    } catch (err: any) {
      console.error('Error removing token:', err);
      const errorMsg = err.message || 'Failed to remove token';
      setError(errorMsg);
      
      // Use the parent notification system if available
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
    } finally {
      setIsRemoving(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Supported Tokens</h1>
        <button 
          onClick={onBack}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
        >
          Back to Dashboard
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md">
          {successMessage}
        </div>
      )}
      
      {/* Add new token form */}
      <div className="mb-8 bg-gray-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Add New Token</h2>
        <form onSubmit={handleAddToken}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Token Address
              </label>
              <input
                type="text"
                value={newTokenAddress}
                onChange={(e) => setNewTokenAddress(e.target.value.trim())}
                placeholder="0x..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                pattern="^0x[a-fA-F0-9]{40}$"
                title="Please enter a valid Ethereum address starting with 0x followed by 40 hexadecimal characters"
              />
              <p className="mt-1 text-xs text-gray-500">Enter the ERC20 token contract address</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price Feed Address
              </label>
              <input
                type="text"
                value={newPriceFeedAddress}
                onChange={(e) => setNewPriceFeedAddress(e.target.value.trim())}
                placeholder="0x..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                pattern="^0x[a-fA-F0-9]{40}$"
                title="Please enter a valid Ethereum address starting with 0x followed by 40 hexadecimal characters"
              />
              <p className="mt-1 text-xs text-gray-500">Enter the Chainlink price feed address for this token</p>
            </div>
          </div>
          <button
            type="submit"
            disabled={isAdding || !newTokenAddress || !newPriceFeedAddress}
            className={`px-4 py-2 rounded-md ${
              isAdding || !newTokenAddress || !newPriceFeedAddress
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isAdding ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Adding...
              </span>
            ) : 'Add Token'}
          </button>
        </form>
      </div>
      
      {/* List of supported tokens */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Supported Tokens</h2>
        {isLoadingTokenDetails && (
          <div className="flex justify-center my-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
        {tokens && tokens.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Token Symbol
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Token Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Token Address
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tokenDetails.map((token) => (
                  <tr key={token.address} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {token.symbol || 'Loading...'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {token.name || 'Loading...'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {`${token.address.substring(0, 8)}...${token.address.substring(token.address.length - 6)}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleRemoveToken(token.address)}
                        disabled={isRemoving}
                        className={`text-red-600 hover:text-red-900 mr-2 ${isRemoving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isRemoving && tokenToRemove === token.address ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Removing...
                          </span>
                        ) : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No supported tokens found
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenManagement;
