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
    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-xl border border-emerald-500/30">
            <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Manage Supported Tokens</h1>
        </div>
        <button 
          onClick={onBack}
          className="px-6 py-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 hover:text-slate-200 transition-all duration-200 border border-slate-700 hover:border-slate-600"
        >
          Back to Dashboard
        </button>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 backdrop-blur-sm text-red-400 rounded-xl border border-red-500/30">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}
      
      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-500/10 backdrop-blur-sm text-emerald-400 rounded-xl border border-emerald-500/30">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{successMessage}</span>
          </div>
        </div>
      )}
      
      {/* Add new token form */}
      <div className="mb-8 bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl border border-slate-700/50">
        <h2 className="text-xl font-semibold mb-6 text-slate-200 flex items-center space-x-2">
          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Add New Token</span>
        </h2>
        <form onSubmit={handleAddToken}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Token Address
              </label>
              <input
                type="text"
                value={newTokenAddress}
                onChange={(e) => setNewTokenAddress(e.target.value.trim())}
                placeholder="0x..."
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-200 placeholder-slate-500 transition-all duration-200"
                required
                pattern="^0x[a-fA-F0-9]{40}$"
                title="Please enter a valid Ethereum address starting with 0x followed by 40 hexadecimal characters"
              />
              <p className="mt-2 text-xs text-slate-400">Enter the ERC20 token contract address</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Price Feed Address
              </label>
              <input
                type="text"
                value={newPriceFeedAddress}
                onChange={(e) => setNewPriceFeedAddress(e.target.value.trim())}
                placeholder="0x..."
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-200 placeholder-slate-500 transition-all duration-200"
                required
                pattern="^0x[a-fA-F0-9]{40}$"
                title="Please enter a valid Ethereum address starting with 0x followed by 40 hexadecimal characters"
              />
              <p className="mt-2 text-xs text-slate-400">Enter the Chainlink price feed address for this token</p>
            </div>
          </div>
          <button
            type="submit"
            disabled={isAdding || !newTokenAddress || !newPriceFeedAddress}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
              isAdding || !newTokenAddress || !newPriceFeedAddress
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 transform hover:scale-105 shadow-lg hover:shadow-emerald-500/25'
            }`}
          >
            {isAdding ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-slate-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Adding Token...
              </span>
            ) : 'Add Token'}
          </button>
        </form>
      </div>
      
      {/* List of supported tokens */}
      <div>
        <h2 className="text-xl font-semibold mb-6 text-slate-200 flex items-center space-x-2">
          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>Supported Tokens</span>
        </h2>
        {isLoadingTokenDetails && (
          <div className="flex justify-center my-8">
            <div className="relative">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
              <div className="absolute top-0 left-0 animate-spin rounded-full h-8 w-8 border-r-2 border-l-2 border-emerald-300 animation-delay-150"></div>
            </div>
          </div>
        )}
        {tokens && tokens.length > 0 ? (
          <div className="overflow-x-auto bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-800/50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Token Symbol
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Token Name
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Token Address
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {tokenDetails.map((token) => (
                  <tr key={token.address} className="hover:bg-slate-800/50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-200">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {token.symbol || 'Loading...'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {token.name || 'Loading...'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">
                      <span className="bg-slate-900/50 px-2 py-1 rounded-lg border border-slate-700">
                        {`${token.address.substring(0, 8)}...${token.address.substring(token.address.length - 6)}`}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <button
                        onClick={() => handleRemoveToken(token.address)}
                        disabled={isRemoving}
                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                          isRemoving 
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 border border-red-500/30 hover:border-red-400/50'
                        }`}
                      >
                        {isRemoving && tokenToRemove === token.address ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Removing...
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove
                          </span>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50">
            <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            <p className="text-slate-400 text-lg">No supported tokens found</p>
            <p className="text-slate-500 text-sm mt-1">Add your first token to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenManagement;
