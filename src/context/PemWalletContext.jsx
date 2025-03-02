import React, { createContext, useState, useEffect, useContext } from 'react';
import { UserSigner } from '@multiversx/sdk-wallet';

// Create context
const PemWalletContext = createContext();

// Custom hook to use the PEM wallet context
export const usePemWallet = () => useContext(PemWalletContext);

// Provider component
export const PemWalletProvider = ({ children }) => {
  const [isPemLoggedIn, setIsPemLoggedIn] = useState(false);
  const [pemAddress, setPemAddress] = useState('');
  const [pemSigner, setPemSigner] = useState(null);
  const [pemContent, setPemContent] = useState('');

  // Check if PEM wallet is connected on mount
  useEffect(() => {
    checkPemWalletStatus();
    
    // Listen for storage changes
    window.addEventListener('storage', checkPemWalletStatus);
    
    // Listen for custom PEM wallet events
    window.addEventListener('pemWalletConnected', handlePemWalletConnected);
    
    return () => {
      window.removeEventListener('storage', checkPemWalletStatus);
      window.removeEventListener('pemWalletConnected', handlePemWalletConnected);
    };
  }, []);

  const checkPemWalletStatus = () => {
    console.log('PemWalletContext - Checking PEM wallet status');
    const walletProvider = sessionStorage.getItem('walletProvider');
    const walletAddress = sessionStorage.getItem('walletAddress');
    const storedPemContent = sessionStorage.getItem('pemContent');
    
    if (walletProvider === 'pem' && walletAddress && storedPemContent) {
      console.log('PemWalletContext - PEM wallet is connected:', walletAddress);
      try {
        // Recreate the signer from the stored PEM content
        const signer = UserSigner.fromPem(storedPemContent);
        setIsPemLoggedIn(true);
        setPemAddress(walletAddress);
        setPemSigner(signer);
        setPemContent(storedPemContent);
      } catch (error) {
        console.error('Error recreating signer from stored PEM content:', error);
        disconnectPemWallet();
      }
    } else {
      console.log('PemWalletContext - PEM wallet is not connected');
      setIsPemLoggedIn(false);
      setPemAddress('');
      setPemSigner(null);
      setPemContent('');
    }
  };

  const handlePemWalletConnected = (event) => {
    console.log('PemWalletContext - PEM wallet connected event received:', event.detail);
    setIsPemLoggedIn(true);
    setPemAddress(event.detail.address);
    setPemSigner(event.detail.signer);
    setPemContent(event.detail.pemContent);
  };

  const connectPemWallet = (address, signer, pemContent) => {
    console.log('PemWalletContext - Connecting PEM wallet:', address);
    
    // Store in session storage
    sessionStorage.setItem('walletProvider', 'pem');
    sessionStorage.setItem('walletAddress', address);
    sessionStorage.setItem('pemContent', pemContent);
    
    // Update state
    setIsPemLoggedIn(true);
    setPemAddress(address);
    setPemSigner(signer);
    setPemContent(pemContent);
    
    // Dispatch event
    const walletEvent = new CustomEvent('pemWalletConnected', { 
      detail: { address, signer, pemContent },
      bubbles: true
    });
    window.dispatchEvent(walletEvent);
    document.dispatchEvent(walletEvent);
  };

  const disconnectPemWallet = () => {
    console.log('PemWalletContext - Disconnecting PEM wallet');
    
    // Clear session storage
    sessionStorage.removeItem('walletProvider');
    sessionStorage.removeItem('walletAddress');
    sessionStorage.removeItem('pemContent');
    
    // Update state
    setIsPemLoggedIn(false);
    setPemAddress('');
    setPemSigner(null);
    setPemContent('');
  };

  // Context value
  const value = {
    isPemLoggedIn,
    pemAddress,
    pemSigner,
    connectPemWallet,
    disconnectPemWallet
  };

  return (
    <PemWalletContext.Provider value={value}>
      {children}
    </PemWalletContext.Provider>
  );
};

export default PemWalletContext;
