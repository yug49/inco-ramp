import React, { useState, useEffect } from 'react';
import { useAccount, useChainId, useReadContract, useWriteContract } from 'wagmi';
import { chainsToRamp, rampAbi } from '../constants';
import { Hex, createWalletClient, http, custom } from 'viem';
import { getViemChain, supportedChains } from '@inco/js';
import { Lightning } from '@inco/js/lite';

// Types for user data returned from contract
interface ApprovedUserData {
  userAddress: string;
  kycData: any; // Encrypted KYC data as euint256
}

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals?: number;
}

interface DashboardProps {
  approvedUserData: ApprovedUserData;
}

// ERC20 ABI for fetching token names and symbols
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

const Dashboard: React.FC<DashboardProps> = ({ approvedUserData }) => {
  console.log("Dashboard component rendering with approvedUserData:", approvedUserData);
  
  const [decryptedData, setDecryptedData] = useState<number | null>(null);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Order creation states
  const [activeOrderTab, setActiveOrderTab] = useState<'fiatToCrypto' | 'cryptoToFiat'>('fiatToCrypto');
  const [fiatAmount, setFiatAmount] = useState<string>('');
  const [tokenAmount, setTokenAmount] = useState<string>('');
  const [selectedFiat, setSelectedFiat] = useState<string>('');
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [bankDetails, setBankDetails] = useState<string>('');
  const [upiId, setUpiId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'upi'>('bank');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  
  // Exchange rate states
  const [usdEquivalent, setUsdEquivalent] = useState<string>('');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [isLoadingRates, setIsLoadingRates] = useState<boolean>(false);
  const [rateError, setRateError] = useState<string | null>(null);
  
  // Store supported tokens and fiats
  const [supportedTokens, setSupportedTokens] = useState<string[]>([]);
  const [supportedFiats, setSupportedFiats] = useState<string[]>([]);
  const [tokenDetails, setTokenDetails] = useState<TokenInfo[]>([]);
  const [isLoadingTokenDetails, setIsLoadingTokenDetails] = useState<boolean>(false);
  const [loadingTokens, setLoadingTokens] = useState<boolean>(false);
  const [loadingFiats, setLoadingFiats] = useState<boolean>(false);
  
  const chainId = useChainId();
  const { address: userAddress } = useAccount();
  const rampAddress = chainsToRamp[chainId]?.ramp;
  
  // Wagmi hook to write to contract
  const { writeContractAsync, isPending } = useWriteContract();
  
  console.log("Dashboard - chainId:", chainId, "userAddress:", userAddress, "rampAddress:", rampAddress);
  
  // Get supported tokens from contract
  const { data: tokenAddresses, isLoading: isLoadingTokens } = useReadContract({
    address: rampAddress as `0x${string}` | undefined,
    abi: rampAbi,
    functionName: 'getSupportedTokens',
    query: {
      enabled: !!rampAddress,
    },
  });
  
  // Get supported fiat currencies from contract
  const { data: fiatCurrencies, isLoading: isLoadingFiats } = useReadContract({
    address: rampAddress as `0x${string}` | undefined,
    abi: rampAbi,
    functionName: 'getSupportedFiatCurrencies',
    query: {
      enabled: !!rampAddress,
    },
  });
  
  // Update tokens when data changes
  useEffect(() => {
    if (tokenAddresses && Array.isArray(tokenAddresses)) {
      setSupportedTokens(tokenAddresses);
      if (tokenAddresses.length > 0 && !selectedToken) {
        setSelectedToken(tokenAddresses[0]);
      }
    }
  }, [tokenAddresses, selectedToken]);
  
  // Update fiats when data changes
  useEffect(() => {
    if (fiatCurrencies && Array.isArray(fiatCurrencies)) {
      setSupportedFiats(fiatCurrencies);
      if (fiatCurrencies.length > 0 && !selectedFiat) {
        setSelectedFiat(fiatCurrencies[0]);
      }
    }
  }, [fiatCurrencies, selectedFiat]);
  
  // Fetch exchange rates when component mounts
  useEffect(() => {
    const fetchExchangeRates = async () => {
      setIsLoadingRates(true);
      setRateError(null);
      
      try {
        // Using ExchangeRate-API's free endpoint
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await response.json();
        
        if (data.result === 'success') {
          console.log('Fetched exchange rates:', data.rates);
          console.log('INR rate:', data.rates['INR']); // Log the INR rate specifically
          setExchangeRates(data.rates);
        } else {
          throw new Error('Failed to fetch exchange rates');
        }
      } catch (error) {
        console.error('Error fetching exchange rates:', error);
        setRateError('Could not fetch current exchange rates. Using default values.');
      } finally {
        setIsLoadingRates(false);
      }
    };
    
    fetchExchangeRates();
  }, []);
  
  // Calculate USD equivalent whenever fiat amount or currency changes
  useEffect(() => {
    if (!fiatAmount || !selectedFiat || !exchangeRates[selectedFiat]) {
      setUsdEquivalent('');
      return;
    }
    
    const fiatAmountNum = parseFloat(fiatAmount);
    if (isNaN(fiatAmountNum)) {
      setUsdEquivalent('');
      return;
    }
    
    // Convert from selected fiat to USD
    if (selectedFiat === 'USD') {
      // If the selected currency is USD, no conversion needed
      setUsdEquivalent(fiatAmountNum.toFixed(2));
    } else {
      // The ExchangeRate-API returns rates where:
      // rate = how many units of foreign currency equal 1 USD
      // Example: if rate is 83 for INR, then 1 USD = 83 INR
      // So to convert FROM foreign currency TO USD: foreignAmount / rate = USD amount
      const rate = exchangeRates[selectedFiat];
      
      // Log detailed information to help with debugging
      console.log(`Converting ${fiatAmountNum} ${selectedFiat} to USD`);
      console.log(`Exchange rate for ${selectedFiat}: ${rate} ${selectedFiat} = 1 USD`);
      
      // Ensure rate is a valid number before division
      if (rate && rate > 0) {
        const usdValue = (fiatAmountNum / rate).toFixed(2);
        console.log(`USD equivalent: ${usdValue}`);
        setUsdEquivalent(usdValue);
      } else {
        console.error(`Invalid exchange rate for ${selectedFiat}: ${rate}`);
        setRateError(`Could not get valid exchange rate for ${selectedFiat}`);
        setUsdEquivalent('');
      }
    }
  }, [fiatAmount, selectedFiat, exchangeRates]);
  
  // Fetch token details (name and symbol) whenever the token list changes
  useEffect(() => {
    const fetchTokenDetails = async () => {
      if (!supportedTokens || supportedTokens.length === 0) return;
      
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
            
            // Parse the decimals result - it's a uint8, so we just need to convert the hex to a number
            const tokenDecimals = decimalsResult && decimalsResult !== '0x' 
              ? parseInt(decimalsResult.slice(2), 16) 
              : 18; // Default to 18 if we can't get the decimals
            
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
              decimals: tokenDecimals
            });
          } catch (error) {
            console.error(`Error fetching details for token ${tokenAddress}:`, error);
            tokenInfo.push({
              address: tokenAddress,
              name: 'Unknown',
              symbol: '???',
              decimals: 18 // Default to 18 decimals if we can't fetch
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
  
  // Handle decryption request
  const handleDecryptData = async () => {
    if (!userAddress || !rampAddress || !approvedUserData?.kycData) {
      setError("Missing required data for decryption");
      return;
    }
    
    try {
      setIsDecrypting(true);
      setError(null);
      
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
      
      // Create wallet client for Inco using the browser wallet for signing
      let signingWalletClient;
      if (typeof window !== "undefined" && window.ethereum) {
        signingWalletClient = createWalletClient({
          account: userAddress as Hex,
          chain: getViemChain(chainIdForInco),
          transport: custom(window.ethereum), // Use the browser's Ethereum provider for signing
        });
      } else {
        setError("Ethereum provider (e.g., MetaMask) not found. Please ensure your wallet is connected.");
        setIsDecrypting(false);
        return;
      }
      
      console.log("Using wallet address for signing:", signingWalletClient.account.address);
      console.log("Using dapp address:", rampAddress);
      
      // The kycData from the contract is our resultHandle (referencing the encrypted data)
      const resultHandle = approvedUserData.kycData as Hex;
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
      } catch (innerError: any) {
        console.error("Error during reencryption process:", innerError);
        throw new Error(`Decryption process failed: ${innerError.message}`);
      }
      
    } catch (err) {
      console.error("Error decrypting data:", err);
      setError("Failed to decrypt data. Please try again.");
    } finally {
      setIsDecrypting(false);
    }
  };
  
  const handleOrderTypeChange = (type: 'fiatToCrypto' | 'cryptoToFiat') => {
    setActiveOrderTab(type);
    // Reset form when changing tabs
    setFiatAmount('');
    setTokenAmount('');
    setBankDetails('');
    setUpiId('');
    setUsdEquivalent('');
  };

  const handleSubmitOrder = async () => {
    if (!userAddress || !rampAddress) {
      console.error("Missing required address data");
      setTransactionError("Missing wallet address or contract address. Please ensure your wallet is connected.");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setTransactionError(null);

      if (activeOrderTab === 'fiatToCrypto') {
        // For Fiat to Crypto orders, we need the USD equivalent with 18 decimals
        // as the contract expects amountOfFiatInUsd in wei format (10^18)
        if (!usdEquivalent) {
          setTransactionError("USD equivalent not calculated. Please check the exchange rate.");
          setIsSubmitting(false);
          return;
        }
        
        // Convert USD amount to the format expected by the contract (with 18 decimals)
        const usdDecimal = parseFloat(usdEquivalent);
        const usdAmountForContract = BigInt(Math.floor(usdDecimal * 10**18));
        
        console.log('Creating Fiat to Crypto order:', {
          userAddress,
          fiatAmount,
          fiatCurrency: selectedFiat,
          usdEquivalent,
          usdAmountForContract: usdAmountForContract.toString(),
          selectedToken,
        });
        
        try {
          // Using wagmi's useWriteContract for better handling
          const hash = await writeContractAsync({
            address: rampAddress as `0x${string}`,
            abi: rampAbi,
            functionName: 'createOrderFiatToCrypto',
            args: [
              userAddress as `0x${string}`, 
              usdAmountForContract,
              selectedFiat,
              selectedToken as `0x${string}`
            ]
          });
          
          console.log('Transaction sent:', hash);
          
          // Reset form on success
          setFiatAmount('');
          setUsdEquivalent('');
          
          // Show success message
          alert(`Order submitted successfully! Transaction hash: ${hash}`);
        } catch (txError) {
          console.error('Transaction error:', txError);
          setTransactionError(`Transaction error: ${txError instanceof Error ? txError.message : 'Unknown error'}`);
        }
      } else {
        // For Crypto to Fiat orders
        const tokenAmountNum = parseFloat(tokenAmount);
        if (isNaN(tokenAmountNum)) {
          setTransactionError("Invalid token amount");
          setIsSubmitting(false);
          return;
        }
        
        try {
          // First try to get decimals from our tokenDetails array if it's already been loaded
          let tokenDecimals = 18; // Default to 18 decimals
          const tokenDetail = tokenDetails.find(detail => detail.address.toLowerCase() === selectedToken.toLowerCase());
          
          if (tokenDetail && tokenDetail.decimals !== undefined) {
            tokenDecimals = tokenDetail.decimals;
            console.log(`Using cached token decimals for ${selectedToken}: ${tokenDecimals}`);
          } else {
            // If not found in tokenDetails, fetch it directly
            // Create a tokenContract instance to call decimals()
            if (!window.ethereum) {
              throw new Error("Ethereum provider not available");
            }
            
            // Call decimals() function on the token contract (function signature = 0x313ce567)
            const decimalsResult = await window.ethereum.request({
              method: 'eth_call',
              params: [
                {
                  to: selectedToken,
                  data: '0x313ce567', // Function signature for decimals()
                },
                'latest',
              ],
            });
            
            // Parse the result - decimals is a uint8, so we just need to convert the hex to a number
            tokenDecimals = decimalsResult && decimalsResult !== '0x' 
              ? parseInt(decimalsResult.slice(2), 16) 
              : 18; // Default to 18 if we can't get the decimals
            
            console.log(`Fetched token decimals for ${selectedToken}: ${tokenDecimals}`);
          }
          
          console.log(`Token decimals for ${selectedToken}: ${tokenDecimals}`);
          
          // Convert the token amount to the correct decimal precision
          const scaleFactor = BigInt(10) ** BigInt(tokenDecimals);
          const tokenAmountForContract = BigInt(Math.floor(tokenAmountNum * Number(scaleFactor)));
          
          console.log('Creating Crypto to Fiat order:', {
            userAddress,
            tokenAmount: tokenAmountNum.toString(),
            tokenAmountForContract: tokenAmountForContract.toString(),
            tokenDecimals,
            selectedFiat,
            selectedToken,
            paymentMethod,
            paymentDetails: paymentMethod === 'bank' ? bankDetails : upiId,
          });
          
          // Using wagmi's useWriteContract for better handling
          const hash = await writeContractAsync({
            address: rampAddress as `0x${string}`,
            abi: rampAbi,
            functionName: 'createOrderCryptoToFiat',
            args: [
              userAddress as `0x${string}`, 
              tokenAmountForContract,
              selectedFiat,
              selectedToken as `0x${string}`
            ]
          });
          
          console.log('Transaction sent:', hash);
          
          // Reset form on success
          setTokenAmount('');
          setBankDetails('');
          setUpiId('');
          
          // Show success message
          alert(`Order submitted successfully! Transaction hash: ${hash}`);
        } catch (txError) {
          console.error('Transaction error:', txError);
          setTransactionError(`Transaction error: ${txError instanceof Error ? txError.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      setTransactionError(`Error submitting order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Find token info for display
  const getTokenLabel = (tokenAddress: string) => {
    const token = tokenDetails.find(t => t.address === tokenAddress);
    if (!token) return tokenAddress;
    return `${token.symbol} (${token.name}) - ${tokenAddress.substring(0, 6)}...${tokenAddress.substring(tokenAddress.length - 4)}`;
  };
  
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">User Dashboard</h1>
        
        <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Your Information</h2>
            
            <div className="mb-4">
              <p className="text-gray-600 font-medium">Wallet Address:</p>
              <p className="font-mono bg-gray-100 p-2 rounded mt-1 break-all">{userAddress}</p>
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">KYC Document Number</h3>
              
              {decryptedData !== null ? (
                <div className="bg-gray-100 p-4 rounded">
                  <p className="text-xl font-mono">{decryptedData}</p>
                </div>
              ) : (
                <div className="mb-4">
                  <p className="text-gray-600 mb-4">
                    Your KYC document number is encrypted for security. 
                    Click the button below to decrypt and view your information.
                  </p>
                  
                  <button
                    onClick={handleDecryptData}
                    disabled={isDecrypting}
                    className={`py-2 px-4 rounded font-medium ${
                      isDecrypting
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isDecrypting ? 'Decrypting...' : 'Decrypt KYC Data'}
                  </button>
                  
                  {error && (
                    <div className="mt-3 text-red-500">{error}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Order Creation Section */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Create New Order</h2>
            
            {/* Tabs for Order Types */}
            <div className="flex border-b mb-6">
              <button
                className={`py-2 px-4 font-medium ${
                  activeOrderTab === 'fiatToCrypto'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => handleOrderTypeChange('fiatToCrypto')}
              >
                Buy Crypto with Fiat
              </button>
              <button
                className={`py-2 px-4 font-medium ${
                  activeOrderTab === 'cryptoToFiat'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => handleOrderTypeChange('cryptoToFiat')}
              >
                Buy Fiat with Crypto
              </button>
            </div>
            
            {/* Order Form */}
            <div className="space-y-4">
              {activeOrderTab === 'fiatToCrypto' ? (
                <>
                  {/* Fiat to Crypto Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 mb-2">Fiat Amount</label>
                      <div className="relative">
                        <input
                          type="number"
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter amount"
                          value={fiatAmount}
                          onChange={(e) => setFiatAmount(e.target.value)}
                        />
                        {isLoadingRates && <p className="text-sm text-gray-500 mt-1">Loading exchange rates...</p>}
                        {rateError && <p className="text-sm text-red-500 mt-1">{rateError}</p>}
                        {usdEquivalent && (
                          <p className="text-sm text-green-600 mt-1">
                            ≈ ${usdEquivalent} USD
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-2">Fiat Currency</label>
                      <select
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedFiat}
                        onChange={(e) => setSelectedFiat(e.target.value)}
                        disabled={isLoadingFiats || supportedFiats.length === 0}
                      >
                        {isLoadingFiats ? (
                          <option>Loading...</option>
                        ) : supportedFiats.length === 0 ? (
                          <option>No fiats available</option>
                        ) : (
                          supportedFiats.map((fiat) => (
                            <option key={fiat} value={fiat}>
                              {fiat}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-gray-700 mb-2">Select Token</label>
                      <select
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedToken}
                        onChange={(e) => setSelectedToken(e.target.value)}
                        disabled={isLoadingTokens || supportedTokens.length === 0 || isLoadingTokenDetails}
                      >
                        {isLoadingTokens || isLoadingTokenDetails ? (
                          <option>Loading tokens...</option>
                        ) : supportedTokens.length === 0 ? (
                          <option>No tokens available</option>
                        ) : (
                          tokenDetails.map((token) => (
                            <option key={token.address} value={token.address}>
                              {token.symbol} ({token.name}) - {token.address.substring(0, 6)}...{token.address.substring(token.address.length - 4)}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Crypto to Fiat Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 mb-2">Token Amount</label>
                      <input
                        type="number"
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter token amount"
                        value={tokenAmount}
                        onChange={(e) => setTokenAmount(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-2">Fiat Currency</label>
                      <select
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedFiat}
                        onChange={(e) => setSelectedFiat(e.target.value)}
                        disabled={isLoadingFiats || supportedFiats.length === 0}
                      >
                        {isLoadingFiats ? (
                          <option>Loading...</option>
                        ) : supportedFiats.length === 0 ? (
                          <option>No fiats available</option>
                        ) : (
                          supportedFiats.map((fiat) => (
                            <option key={fiat} value={fiat}>
                              {fiat}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-gray-700 mb-2">Select Token</label>
                      <select
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedToken}
                        onChange={(e) => setSelectedToken(e.target.value)}
                        disabled={isLoadingTokens || supportedTokens.length === 0 || isLoadingTokenDetails}
                      >
                        {isLoadingTokens || isLoadingTokenDetails ? (
                          <option>Loading tokens...</option>
                        ) : supportedTokens.length === 0 ? (
                          <option>No tokens available</option>
                        ) : (
                          tokenDetails.map((token) => (
                            <option key={token.address} value={token.address}>
                              {token.symbol} ({token.name}) - {token.address.substring(0, 6)}...{token.address.substring(token.address.length - 4)}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-gray-700 mb-2">Payment Method</label>
                      <div className="flex space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            className="mr-2"
                            checked={paymentMethod === 'bank'}
                            onChange={() => setPaymentMethod('bank')}
                          />
                          Bank Transfer
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            className="mr-2"
                            checked={paymentMethod === 'upi'}
                            onChange={() => setPaymentMethod('upi')}
                          />
                          UPI
                        </label>
                      </div>
                    </div>
                    
                    {paymentMethod === 'bank' ? (
                      <div className="md:col-span-2">
                        <label className="block text-gray-700 mb-2">Bank Details</label>
                        <textarea
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter your bank account details"
                          rows={3}
                          value={bankDetails}
                          onChange={(e) => setBankDetails(e.target.value)}
                        ></textarea>
                      </div>
                    ) : (
                      <div className="md:col-span-2">
                        <label className="block text-gray-700 mb-2">UPI ID</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter your UPI ID"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
              
              <div className="mt-6">
                <button
                  onClick={handleSubmitOrder}
                  className="py-2 px-4 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={
                    (activeOrderTab === 'fiatToCrypto' && (!fiatAmount || !selectedFiat || !selectedToken || !usdEquivalent)) ||
                    (activeOrderTab === 'cryptoToFiat' && 
                      (!tokenAmount || !selectedFiat || !selectedToken || 
                      (paymentMethod === 'bank' && !bankDetails) || 
                      (paymentMethod === 'upi' && !upiId)))
                  }
                >
                  Submit Order
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add some debugging logs
console.log("Dashboard component defined and exported");

export default Dashboard;