import React, { useState, useEffect } from 'react';
import { useChainId, useReadContract, useWriteContract } from 'wagmi';
import { chainsToRamp, rampAbi } from '../constants';

interface FiatManagementProps {
  onBack: () => void;
  addNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const FiatManagement: React.FC<FiatManagementProps> = ({ onBack, addNotification }) => {
  const chainId = useChainId();
  const rampAddress = chainsToRamp[chainId]?.ramp;
  
  const [fiats, setFiats] = useState<string[]>([]);
  const [newFiatCurrency, setNewFiatCurrency] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [fiatToRemove, setFiatToRemove] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const { writeContractAsync } = useWriteContract();
  
  // Get supported fiat currencies
  const { data: supportedFiats, refetch: refetchFiats } = useReadContract({
    address: rampAddress as `0x${string}` | undefined,
    abi: rampAbi,
    functionName: 'getSupportedFiatCurrencies',
    query: {
      enabled: !!rampAddress,
    },
  });
  
  // Update fiats when data changes
  useEffect(() => {
    if (supportedFiats && Array.isArray(supportedFiats)) {
      setFiats(supportedFiats);
    }
  }, [supportedFiats]);
  
  // Function to add a new fiat currency
  const handleAddFiat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rampAddress || !newFiatCurrency) return;
    
    try {
      setIsAdding(true);
      setError(null);
      setSuccessMessage(null);
      
      // Validate fiat currency code
      const fiatCodeRegex = /^[A-Z]{3}$/;
      if (!fiatCodeRegex.test(newFiatCurrency)) {
        throw new Error('Invalid fiat currency code. Please use a 3-letter code (e.g., USD, EUR, INR)');
      }
      
      await writeContractAsync({
        address: rampAddress as `0x${string}`,
        abi: rampAbi,
        functionName: 'addSupportedFiat',
        args: [newFiatCurrency],
      });
      
      const successMsg = `Fiat currency ${newFiatCurrency} added successfully!`;
      setNewFiatCurrency('');
      setSuccessMessage(successMsg);
      
      // Use the parent notification system if available
      if (addNotification) {
        addNotification(successMsg, 'success');
      }
      
      refetchFiats();
    } catch (err: any) {
      console.error('Error adding fiat currency:', err);
      const errorMsg = err.message || 'Failed to add fiat currency';
      setError(errorMsg);
      
      // Use the parent notification system if available
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
    } finally {
      setIsAdding(false);
    }
  };
  
  // Function to remove a fiat currency
  const handleRemoveFiat = async (fiatCurrency: string) => {
    if (!rampAddress || !fiatCurrency) return;
    
    // Ask for confirmation before removing
    const confirmMessage = `Are you sure you want to remove ${fiatCurrency}?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      setFiatToRemove(fiatCurrency);
      setIsRemoving(true);
      setError(null);
      setSuccessMessage(null);
      
      await writeContractAsync({
        address: rampAddress as `0x${string}`,
        abi: rampAbi,
        functionName: 'removeSupportedFiat',
        args: [fiatCurrency],
      });
      
      const successMsg = `Fiat currency ${fiatCurrency} removed successfully!`;
      setSuccessMessage(successMsg);
      
      // Use the parent notification system if available
      if (addNotification) {
        addNotification(successMsg, 'success');
      }
      
      refetchFiats();
    } catch (err: any) {
      console.error('Error removing fiat currency:', err);
      const errorMsg = err.message || 'Failed to remove fiat currency';
      setError(errorMsg);
      
      // Use the parent notification system if available
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
    } finally {
      setIsRemoving(false);
      setFiatToRemove(null);
    }
  };
  
  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl border border-blue-500/30">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Manage Fiat Currencies</h1>
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
      
      {/* Add new fiat currency form */}
      <div className="mb-8 bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl border border-slate-700/50">
        <h2 className="text-xl font-semibold mb-6 text-slate-200 flex items-center space-x-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Add New Fiat Currency</span>
        </h2>
        <form onSubmit={handleAddFiat}>
          <div className="grid grid-cols-1 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Fiat Currency Code
              </label>
              <input
                type="text"
                value={newFiatCurrency}
                onChange={(e) => setNewFiatCurrency(e.target.value.toUpperCase())}
                placeholder="e.g., USD, EUR, INR"
                maxLength={3}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-200 placeholder-slate-500 transition-all duration-200"
                required
              />
              <p className="mt-2 text-xs text-slate-400">Enter the 3-letter currency code (e.g., "USD", "EUR", "INR")</p>
            </div>
          </div>
          <button
            type="submit"
            disabled={isAdding || !newFiatCurrency}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
              isAdding || !newFiatCurrency
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25'
            }`}
          >
            {isAdding ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-slate-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Adding Currency...
              </span>
            ) : 'Add Fiat Currency'}
          </button>
        </form>
      </div>
      
      {/* List of supported fiat currencies */}
      <div>
        <h2 className="text-xl font-semibold mb-6 text-slate-200 flex items-center space-x-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>Supported Fiat Currencies</span>
        </h2>
        {fiats && fiats.length > 0 ? (
          <div className="overflow-x-auto bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-800/50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Currency Code
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {fiats.map((fiat) => (
                  <tr key={fiat} className="hover:bg-slate-800/50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-200">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {fiat}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <button
                        onClick={() => handleRemoveFiat(fiat)}
                        disabled={isRemoving}
                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                          isRemoving 
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 border border-red-500/30 hover:border-red-400/50'
                        }`}
                      >
                        {isRemoving && fiatToRemove === fiat ? (
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-slate-400 text-lg">No supported fiat currencies found</p>
            <p className="text-slate-500 text-sm mt-1">Add your first currency to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FiatManagement;
