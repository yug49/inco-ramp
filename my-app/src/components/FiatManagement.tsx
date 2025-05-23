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
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Fiat Currencies</h1>
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
      
      {/* Add new fiat currency form */}
      <div className="mb-8 bg-gray-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Add New Fiat Currency</h2>
        <form onSubmit={handleAddFiat}>
          <div className="grid grid-cols-1 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fiat Currency Code
              </label>
              <input
                type="text"
                value={newFiatCurrency}
                onChange={(e) => setNewFiatCurrency(e.target.value.toUpperCase())}
                placeholder="e.g., USD, EUR, INR"
                maxLength={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Enter the 3-letter currency code (e.g., "USD", "EUR", "INR")</p>
            </div>
          </div>
          <button
            type="submit"
            disabled={isAdding || !newFiatCurrency}
            className={`px-4 py-2 rounded-md ${
              isAdding || !newFiatCurrency
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
            ) : 'Add Fiat Currency'}
          </button>
        </form>
      </div>
      
      {/* List of supported fiat currencies */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Supported Fiat Currencies</h2>
        {fiats && fiats.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Currency Code
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fiats.map((fiat) => (
                  <tr key={fiat} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {fiat}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleRemoveFiat(fiat)}
                        disabled={isRemoving}
                        className={`text-red-600 hover:text-red-900 mr-2 ${isRemoving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isRemoving && fiatToRemove === fiat ? (
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
            No supported fiat currencies found
          </div>
        )}
      </div>
    </div>
  );
};

export default FiatManagement;
