import React, { useState, useEffect } from 'react';
import { useAccount, useChainId, useReadContract, useWriteContract } from 'wagmi';
import { chainsToRamp, rampAbi } from '../constants';
import { Hex } from 'viem';
import { useRouter } from 'next/navigation';
import { getViemChain, supportedChains } from '@inco/js';
import { Lightning } from '@inco/js/lite'
import { createWalletClient, http, custom } from 'viem';

// Add type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

// Types for the form data
interface FormData {
  name: string;
  phoneNumber: string;
  dob: string;
  address: string;
  kycDocumentType: 'AADHAR';
  kycDocumentNumber: number ;
}

// User status types
type UserStatus = 'NOT_REGISTERED' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'LOADING';

// Types for user data returned from contract
interface PendingUserData {
  userAddress: string;
  kycData: string; // Encrypted KYC data as bytes
}

interface ApprovedUserData {
  userAddress: string;
  kycData: any; // Encrypted KYC data as euint256
}

const UserRegistration: React.FC = () => {
  // Router for navigation
  const router = useRouter();
  
  // Get chain and account information
  const chainId = useChainId();
  const { address: userAddress, isConnected } = useAccount();
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phoneNumber: '',
    dob: '',
    address: '',
    kycDocumentType: 'AADHAR',
    kycDocumentNumber: 0,
  });

  // Encryption state
  const [plainTextKyc, setPlainTextKyc] = useState<string>('');
  const [cipherTextKyc, setCipherTextKyc] = useState<string>('');
  const [isEncrypting, setIsEncrypting] = useState<boolean>(false);
  
  // User status state
  const [userStatus, setUserStatus] = useState<UserStatus>('LOADING');
  
  // Get ramp address for current chain
  const rampAddress = chainsToRamp[chainId]?.ramp;
  
  // Read owner address from contract - proper way to use the hook at component level
  const { data: ownerAddress } = useReadContract({
    address: rampAddress as `0x${string}` | undefined,
    abi: rampAbi,
    functionName: 'owner',
    query: {
      enabled: isConnected && !!rampAddress,
    },
  }) as { data: Hex | undefined };
  
  // Read pending user data from contract
  const { data: pendingUserData, isPending: isPendingLoading, refetch: refetchPendingUser } = useReadContract({
    address: rampAddress as `0x${string}` | undefined,
    abi: rampAbi,
    functionName: 'getPendingUser',
    args: [userAddress],
    query: {
      enabled: isConnected && !!rampAddress && !!userAddress,
    },
  }) as { data: PendingUserData | undefined, isPending: boolean, refetch: () => Promise<any> };
  
  // Read approved user data from contract
  const { data: approvedUserData, isPending: isApprovedLoading, refetch: refetchApprovedUser } = useReadContract({
    address: rampAddress as `0x${string}` | undefined,
    abi: rampAbi,
    functionName: 'getApprovedUser',
    args: [userAddress],
    query: {
      enabled: isConnected && !!rampAddress && !!userAddress,
    },
  }) as { data: ApprovedUserData | undefined, isPending: boolean, refetch: () => Promise<any> };
  
  // Write contract function to register user
  const { data: hash, isPending, error, writeContractAsync } = useWriteContract()
  
  // Effect to determine user status based on contract data
  useEffect(() => {
    const isLoading = isPendingLoading || isApprovedLoading;
    
    if (isLoading) {
      setUserStatus('LOADING');
      return;
    }
    
    // Check if user is approved
    if (approvedUserData && approvedUserData.userAddress !== '0x0000000000000000000000000000000000000000') {
      setUserStatus('VERIFIED');
      // Redirect to dashboard if user is verified
      if (typeof window !== 'undefined') {
        router.push('/dashboard');
        router.push('/dashboard');
      }
      return;
    }
    
    // Check if user registration is pending
    if (pendingUserData && pendingUserData.userAddress !== '0x0000000000000000000000000000000000000000') {
      setUserStatus('PENDING_VERIFICATION');
      return;
    }
    
    // User is not registered
    setUserStatus('NOT_REGISTERED');
  }, [pendingUserData, approvedUserData, isPendingLoading, isApprovedLoading, router]);
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Function to update the plaintext KYC preview
  useEffect(() => {
    // Create a JSON string of the form data for plaintext display
    const kycJson = JSON.stringify(formData, null, 2);
    setPlainTextKyc(kycJson);
  }, [formData]);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userAddress || !rampAddress) return;
    
    try {
      setIsEncrypting(true);

      // Create a JSON string of the form data
      const kycJson = JSON.stringify(formData);

      // Encrypt KYC data using Inco.js SDK
      // Since we're on Base chain (84532 is Base Sepolia)
      // Use Lightning for encryption
      let chainIdForInco;
      if (chainId === 84532) {
        // Base Sepolia
        chainIdForInco = supportedChains.baseSepolia;
      } else {
        // Fallback to Base Sepolia if chain not recognized
        chainIdForInco = supportedChains.baseSepolia;
      }

      const zap = Lightning.latest('testnet', chainIdForInco);
      console.log("Lightning instance created");
      
      // Create wallet client for Inco using connected wallet
      // Using the ownerAddress from the component-level hook
      const walletClient = createWalletClient({
        account: (ownerAddress || userAddress) as Hex,
        chain: getViemChain(chainIdForInco),
        transport: window.ethereum ? custom(window.ethereum) : http(),
      });
      
      console.log("Using wallet address:", walletClient.account.address);
      
      // Variable to store the ciphertext (declare it outside try-catch)
      let ciphertext: string;
      
      try {
        // Since the registerUser function expects bytes, we'll use a simpler approach
        // The inco.js encrypt function only supports small numbers that can fit into 32 bytes
        
        // Convert the document number to a number type (parseFloat for decimal or parseInt for integer)
        // Use Number() for simplicity in this case
        const kycData = Number(formData.kycDocumentNumber);
        
        // Check if it's a valid number
        if (isNaN(kycData)) {
          throw new Error("Document number must be a valid number");
        }
        
        console.log("Using kyc value for encryption:", kycData);

        // Encrypt the value (which is now a number and thus a SupportedNativeType)
        ciphertext = await zap.encrypt(kycData, {
          accountAddress: walletClient.account.address,
          dappAddress: rampAddress,
        });

        setCipherTextKyc(ciphertext);
        
        // Note: In a production environment, you would typically:
        // 1. Store the actual KYC data in a secure off-chain database
        // 2. Only store the encrypted hash on-chain for verification purposes
        // 3. Use the hash as a reference to the off-chain data
      } catch (encryptError) {
        console.error("Encryption error:", encryptError);
        throw encryptError;
      }
      
      // Register user on the contract
      await writeContractAsync({
        abi: rampAbi,
        address: rampAddress as `0x${string}`,
        functionName: 'registerUser',
        args: [userAddress, ciphertext], // Pass ciphertext directly without modification
      });
      
      // Refresh user data
      await Promise.all([refetchPendingUser(), refetchApprovedUser()]);
      
    } catch (error) {
      console.error('Error registering user:', error);
      alert('Failed to register. Please try again.');
    } finally {
      setIsEncrypting(false);
    }
  };
  
  // Render based on user status
  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="text-center bg-slate-900/50 backdrop-blur-sm p-10 rounded-2xl border border-slate-800 max-w-md w-full">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-6">
            <span className="text-white font-bold text-lg">IR</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-200 mb-4">Welcome to Inco Ramp</h1>
          <p className="text-slate-400 mb-6">Please connect your wallet to continue.</p>
        </div>
      </div>
    );
  }
  
  if (userStatus === 'LOADING') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-emerald-400 rounded-full animate-ping"></div>
          </div>
          <p className="mt-6 text-slate-400 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }
  
  if (userStatus === 'PENDING_VERIFICATION') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="text-center bg-slate-900/50 backdrop-blur-sm p-10 rounded-2xl border border-slate-800 max-w-md w-full">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-200 mb-4">Verification Pending</h1>
          <p className="text-slate-400 leading-relaxed">
            Your registration request has been submitted and is pending verification by the admin.
            Please check back later.
          </p>
        </div>
      </div>
    );
  }
  
  if (userStatus === 'NOT_REGISTERED') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="bg-slate-900/50 backdrop-blur-sm p-8 rounded-2xl border border-slate-800 max-w-lg w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-slate-200 mb-2">User Registration</h1>
            <p className="text-slate-400">Complete your KYC verification to access the platform</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="Enter your full name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number</label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="Enter your phone number"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Date of Birth</label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Residential Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="Enter your residential address"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">KYC Document Type</label>
              <select
                name="kycDocumentType"
                value={formData.kycDocumentType}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all cursor-not-allowed opacity-75"
                required
                disabled
              >
                <option value="AADHAR">Aadhar Card</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Document Number</label>
              <input
                type="number"
                name="kycDocumentNumber"
                value={formData.kycDocumentNumber}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="Enter your document number"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isPending || isEncrypting}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 ${
                isPending || isEncrypting 
                  ? 'bg-slate-700 cursor-not-allowed opacity-50' 
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg hover:shadow-emerald-500/25 transform hover:-translate-y-0.5'
              }`}
            >
              {isPending ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Submitting...
                </div>
              ) : isEncrypting ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Encrypting...
                </div>
              ) : (
                'Register & Complete KYC'
              )}
            </button>
          </form>

        </div>
      </div>
    );
  }
  
  // This should not be reached but added for completeness
  return null;
};

export default UserRegistration;