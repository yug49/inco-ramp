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
        <h1 className="text-3xl font-bold mb-6 text-white">User Dashboard</h1>
        
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-hidden mb-8 glass-card">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Your Information
            </h2>
            
            <div className="mb-4">
              <p className="text-slate-300 font-medium mb-2">Wallet Address:</p>
              <div className="font-mono bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-3 rounded-lg break-all text-emerald-400 text-sm">
                {userAddress}
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3 text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                KYC Document Number
              </h3>
              
              {decryptedData !== null ? (
                <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-500/30 p-4 rounded-lg">
                  <p className="text-xl font-mono text-emerald-400">{decryptedData}</p>
                </div>
              ) : (
                <div className="mb-4">
                  <p className="text-slate-300 mb-4 leading-relaxed">
                    Your KYC document number is encrypted for security. 
                    Click the button below to decrypt and view your information.
                  </p>
                  
                  <button
                    onClick={handleDecryptData}
                    disabled={isDecrypting}
                    className={`group relative py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
                      isDecrypting
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700 hover:to-emerald-600 hover:shadow-lg hover:shadow-emerald-500/25 transform hover:-translate-y-0.5'
                    }`}
                  >
                    {isDecrypting && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-lg animate-pulse"></div>
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      </>
                    )}
                    <span className="relative">
                      {isDecrypting ? 'Decrypting...' : 'Decrypt KYC Data'}
                    </span>
                  </button>
                  
                  {error && (
                    <div className="mt-3 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Order Creation Section */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-hidden mb-8 glass-card">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create New Order
            </h2>
            
            {/* Tabs for Order Types */}
            <div className="flex border-b border-slate-700/50 mb-6">
              <button
                className={`py-3 px-4 font-medium transition-all duration-200 ${
                  activeOrderTab === 'fiatToCrypto'
                    ? 'border-b-2 border-emerald-500 text-emerald-400 bg-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                } rounded-t-lg`}
                onClick={() => handleOrderTypeChange('fiatToCrypto')}
              >
                Buy Crypto with Fiat
              </button>
              <button
                className={`py-3 px-4 font-medium transition-all duration-200 ${
                  activeOrderTab === 'cryptoToFiat'
                    ? 'border-b-2 border-emerald-500 text-emerald-400 bg-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                } rounded-t-lg`}
                onClick={() => handleOrderTypeChange('cryptoToFiat')}
              >
                Buy Fiat with Crypto
              </button>
            </div>
            
            {/* Order Form */}
            <div className="space-y-6">
              {activeOrderTab === 'fiatToCrypto' ? (
                <>
                  {/* Fiat to Crypto Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-slate-300 mb-2 font-medium">Fiat Amount</label>
                      <div className="relative">
                        <input
                          type="number"
                          className="w-full p-3 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
                          placeholder="Enter amount"
                          value={fiatAmount}
                          onChange={(e) => setFiatAmount(e.target.value)}
                        />
                        {isLoadingRates && <p className="text-sm text-slate-400 mt-2">Loading exchange rates...</p>}
                        {rateError && <p className="text-sm text-red-400 mt-2">{rateError}</p>}
                        {usdEquivalent && (
                          <p className="text-sm text-emerald-400 mt-2 font-medium">
                            ≈ ${usdEquivalent} USD
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-slate-300 mb-2 font-medium">Fiat Currency</label>
                      <select
                        className="w-full p-3 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
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
                            <option key={fiat} value={fiat} className="bg-slate-800">
                              {fiat}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-slate-300 mb-2 font-medium">Select Token</label>
                      <select
                        className="w-full p-3 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
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
                            <option key={token.address} value={token.address} className="bg-slate-800">
                              {token.symbol} ({token.name}) - {token.address.substring(0, 6)}...{token.address.substring(token.address.length - 4)}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Information Note - positioned above submit button */}
                  <div className="md:col-span-2 mt-4 mb-2 bg-emerald-900/20 backdrop-blur-sm border border-emerald-500/30 p-4 rounded-lg">
                    <p className="text-sm text-emerald-300 leading-relaxed">
                      <strong className="text-emerald-400">Note:</strong> In production, this app will also have a Razorpay or similar payment gateways' button here for users to send the respective fiat. Upon confirmation it will execute the <code className="bg-emerald-800/50 px-2 py-1 rounded text-emerald-400">fullfillOrder()</code> function of the Ramp contract automatically which will complete the order. For now the fullFillOrder() function can be called by the admin through the admin dashboard.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Crypto to Fiat Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-slate-300 mb-2 font-medium">Token Amount</label>
                      <input
                        type="number"
                        className="w-full p-3 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
                        placeholder="Enter token amount"
                        value={tokenAmount}
                        onChange={(e) => setTokenAmount(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-slate-300 mb-2 font-medium">Fiat Currency</label>
                      <select
                        className="w-full p-3 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
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
                            <option key={fiat} value={fiat} className="bg-slate-800">
                              {fiat}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-slate-300 mb-2 font-medium">Select Token</label>
                      <select
                        className="w-full p-3 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
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
                            <option key={token.address} value={token.address} className="bg-slate-800">
                              {token.symbol} ({token.name}) - {token.address.substring(0, 6)}...{token.address.substring(token.address.length - 4)}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-slate-300 mb-3 font-medium">Payment Method</label>
                      <div className="flex space-x-6">
                        <label className="flex items-center cursor-pointer group">
                          <input
                            type="radio"
                            className="mr-3 w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500 focus:ring-2"
                            checked={paymentMethod === 'bank'}
                            onChange={() => setPaymentMethod('bank')}
                          />
                          <span className="text-slate-300 group-hover:text-white transition-colors duration-200">Bank Transfer</span>
                        </label>
                        <label className="flex items-center cursor-pointer group">
                          <input
                            type="radio"
                            className="mr-3 w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500 focus:ring-2"
                            checked={paymentMethod === 'upi'}
                            onChange={() => setPaymentMethod('upi')}
                          />
                          <span className="text-slate-300 group-hover:text-white transition-colors duration-200">UPI</span>
                        </label>
                      </div>
                    </div>
                    
                    {paymentMethod === 'bank' ? (
                      <div className="md:col-span-2">
                        <label className="block text-slate-300 mb-2 font-medium">Bank Details</label>
                        <textarea
                          className="w-full p-3 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200 resize-none"
                          placeholder="Enter your bank account details"
                          rows={3}
                          value={bankDetails}
                          onChange={(e) => setBankDetails(e.target.value)}
                        ></textarea>
                      </div>
                    ) : (
                      <div className="md:col-span-2">
                        <label className="block text-slate-300 mb-2 font-medium">UPI ID</label>
                        <input
                          type="text"
                          className="w-full p-3 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
                          placeholder="Enter your UPI ID"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                        />
                      </div>
                    )}
                    
                    {/* Information Note */}
                    <div className="md:col-span-2 mt-2 mb-4 bg-emerald-900/20 backdrop-blur-sm border border-emerald-500/30 p-4 rounded-lg">
                      <p className="text-sm text-emerald-300 leading-relaxed">
                        <strong className="text-emerald-400">Note:</strong> In production, after the successful placement of the order, first the money will be automatically sent to the user on this bank account/UPI ID using a payment gateway. Then, upon confirmation it will execute the <code className="bg-emerald-800/50 px-2 py-1 rounded text-emerald-400">fullfillOrder()</code> function of the Ramp contract automatically which will complete the order. For now the fullFillOrder() function can be called by the admin through the admin dashboard.
                      </p>
                    </div>
                  </div>
                </>
              )}
              
              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleSubmitOrder}
                  className={`group relative py-3 px-8 rounded-lg font-medium transition-all duration-200 ${
                    isSubmitting
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : (activeOrderTab === 'fiatToCrypto' && (!fiatAmount || !selectedFiat || !selectedToken || !usdEquivalent)) ||
                        (activeOrderTab === 'cryptoToFiat' && 
                          (!tokenAmount || !selectedFiat || !selectedToken || 
                          (paymentMethod === 'bank' && !bankDetails) || 
                          (paymentMethod === 'upi' && !upiId)))
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700 hover:to-emerald-600 hover:shadow-lg hover:shadow-emerald-500/25 transform hover:-translate-y-0.5'
                  }`}
                  disabled={
                    isSubmitting ||
                    (activeOrderTab === 'fiatToCrypto' && (!fiatAmount || !selectedFiat || !selectedToken || !usdEquivalent)) ||
                    (activeOrderTab === 'cryptoToFiat' && 
                      (!tokenAmount || !selectedFiat || !selectedToken || 
                      (paymentMethod === 'bank' && !bankDetails) || 
                      (paymentMethod === 'upi' && !upiId)))
                  }
                >
                  {isSubmitting && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-lg animate-pulse"></div>
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    </>
                  )}
                  <span className="relative flex items-center gap-2">
                    {!isSubmitting && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                    {isSubmitting ? 'Submitting Order...' : 'Submit Order'}
                  </span>
                </button>
              </div>
              
              {transactionError && (
                <div className="mt-4 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
                  {transactionError}
                </div>
              )}
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