// Simple script to clear WalletConnect localStorage cache
// Run this in your browser console when debugging WalletConnect issues

function clearWalletConnectCache() {
    const keys = Object.keys(localStorage);
    const wcKeys = keys.filter(
        (key) =>
            key.startsWith("wc@") ||
            key.startsWith("wagmi") ||
            key.startsWith("rk-") ||
            key.includes("walletconnect")
    );

    if (wcKeys.length > 0) {
        console.log("Found WalletConnect cache keys to clear:", wcKeys);
        for (const key of wcKeys) {
            localStorage.removeItem(key);
        }
        console.log("WalletConnect cache cleared successfully");
    } else {
        console.log("No WalletConnect cache keys found");
    }
}

// Execute the function when script is loaded
clearWalletConnectCache();
