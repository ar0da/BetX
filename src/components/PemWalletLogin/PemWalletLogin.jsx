import React, { useState, useRef } from 'react';
import { UserSigner } from '@multiversx/sdk-wallet';
import { usePemWallet } from '../../context/PemWalletContext';
import { networkConfig } from '../../config/config';
import BettingContractService from '../../services/BettingContractService';
import './PemWalletLogin.css';

// Define our own constants since the SDK might have changed
const WALLET_PROVIDER_KEY = 'walletProvider';
const WALLET_ADDRESS_KEY = 'walletAddress';

const PemWalletLogin = ({ onClose }) => {
  const { connectPemWallet } = usePemWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log('🔍 PEM File Upload Details', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      lastModified: new Date(file.lastModified).toISOString()
    });

    setIsLoading(true);
    setError('');

    try {
      // More flexible file type validation
      const allowedMimeTypes = [
        'text/plain', 
        'application/x-pem-file', 
        'application/octet-stream'
      ];
      const allowedExtensions = ['.pem', '.txt'];

      const fileExtension = file.name.split('.').pop().toLowerCase();
      const isValidExtension = allowedExtensions.some(ext => 
        ext === `.${fileExtension}`
      );
      const isValidMimeType = allowedMimeTypes.includes(file.type);

      console.log('🕵️ File Type Validation', {
        fileExtension: `.${fileExtension}`,
        isValidExtension,
        mimeType: file.type,
        isValidMimeType
      });

      if (!isValidExtension && !isValidMimeType) {
        throw new Error(`Invalid file type. Please upload a .pem file. 
          Detected type: ${file.type}, Extension: .${fileExtension}`);
      }

      if (file.size > 10 * 1024) { // 10 KB max
        throw new Error('PEM file is too large. Maximum size is 10 KB.');
      }

      console.log('Reading PEM file content...');
      const fileContent = await readFileContent(file);
      console.log('✅ PEM file content read successfully', {
        contentLength: fileContent.length,
        firstChars: fileContent.substring(0, 50),
        lastChars: fileContent.substring(fileContent.length - 50)
      });
      
      // Validate PEM content format
      if (!fileContent.includes('BEGIN PRIVATE KEY') || !fileContent.includes('END PRIVATE KEY')) {
        throw new Error('Invalid PEM file format');
      }
      
      console.log('Creating UserSigner from PEM...');
      const signer = UserSigner.fromPem(fileContent);
      console.log('✅ UserSigner created successfully');
      
      const address = signer.getAddress().bech32();
      console.log('👤 PEM wallet address:', address);

      // Set PEM file content globally for contract services
      try {
        // Use BettingContractService method to set global state
        BettingContractService.setPemFileContent(fileContent);
        console.log('✅ PEM File Content Set Successfully');
      } catch (setPemError) {
        console.warn('⚠️ Failed to set PEM file content', setPemError);
        throw setPemError; // Rethrow to prevent connection
      }

      // Connect wallet using context - pass the PEM content
      connectPemWallet(address, signer, fileContent);

      // Display success message
      alert(`Successfully connected PEM wallet: ${address}`);
      
      // Close modal if needed
      if (typeof onClose === 'function') {
        onClose();
      }
    } catch (err) {
      console.error('❌ PEM login error:', err);
      setError(`Invalid PEM file: ${err.message}`);
    } finally {
      setIsLoading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        if (!content) {
          reject(new Error('Empty file content'));
        }
        resolve(content);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="pem-wallet-login">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pem"
        style={{ display: 'none' }}
      />
      <button 
        className="pem-login-button"
        onClick={triggerFileInput}
        disabled={isLoading}
      >
        {isLoading ? 'Connecting...' : 'Connect with PEM'}
      </button>
      
      {error && <div className="pem-login-error">{error}</div>}
      
      <div className="pem-info">
        <p>Upload your PEM wallet file to connect directly.</p>
        <small>Your PEM file is processed locally and never sent to any server.</small>
        <small>Maximum file size: 10 KB</small>
      </div>
    </div>
  );
};

export default PemWalletLogin;
