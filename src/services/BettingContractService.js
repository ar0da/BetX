import * as sdkCore from '@multiversx/sdk-core';
import * as sdkNetworkProviders from '@multiversx/sdk-network-providers';
import * as sdkWallet from '@multiversx/sdk-wallet';
import BigNumber from 'bignumber.js';
import { BetService } from '../config/firebase';
import IpfsService from './IpfsService';
import { MULTIVERSX_CONFIG } from '../config';

// Comprehensive SDK import diagnostic logging
console.log('🔍 MultiversX SDK Wallet Import Diagnostic:', {
  sdkWalletKeys: Object.keys(sdkWallet),
  UserSignerType: typeof sdkWallet.UserSigner,
  UserSignerMethods: sdkWallet.UserSigner ? Object.keys(sdkWallet.UserSigner) : 'No Methods',
  DefaultExportKeys: sdkWallet.default ? Object.keys(sdkWallet.default) : 'No Default Export'
});

export default class BettingContractService {
  // Set default contract address from configuration
  static contractAddress = MULTIVERSX_CONFIG.CONTRACT.ADDRESS;

  constructor() {
    // Initialize with configuration
    this.contractAddress = BettingContractService.contractAddress;
  }

  // Comprehensive method for creating UserSigner from PEM content
  static createUserSignerFromPem(pemContent) {
    console.log('🔍 UserSigner Creation Attempt:', {
      pemContentLength: pemContent?.length,
      pemContentFirstLine: pemContent?.split('\n')[0],
      sdkWalletKeys: Object.keys(sdkWallet)
    });

    if (!pemContent || typeof pemContent !== 'string') {
      throw new Error('Invalid PEM content: must be a non-empty string');
    }

    // Validate PEM format
    if (!pemContent.startsWith('-----BEGIN PRIVATE KEY') || !pemContent.includes('-----END PRIVATE KEY')) {
      throw new Error('Invalid PEM format: must start with BEGIN PRIVATE KEY and end with END PRIVATE KEY');
    }

    try {
      // Prioritize fromPem method
      if (typeof sdkWallet.UserSigner?.fromPem === 'function') {
        console.log('🔑 Creating UserSigner using fromPem method');
        return sdkWallet.UserSigner.fromPem(pemContent);
      }

      // Fallback strategies
      if (typeof sdkWallet.UserSigner?.fromPemContent === 'function') {
        console.log('🔑 Creating UserSigner using fromPemContent method');
        return sdkWallet.UserSigner.fromPemContent(pemContent);
      }

      if (typeof sdkWallet.UserSigner === 'function') {
        console.log('🔑 Creating UserSigner using direct constructor');
        return new sdkWallet.UserSigner(pemContent);
      }

      if (sdkWallet.default?.UserSigner?.fromPem) {
        console.log('🔑 Creating UserSigner using default export fromPem');
        return sdkWallet.default.UserSigner.fromPem(pemContent);
      }

      throw new Error('Could not create UserSigner: no valid creation method found');
    } catch (error) {
      console.error('❌ UserSigner Creation Failed', {
        errorMessage: error.message,
        errorStack: error.stack,
        pemContentFirstLine: pemContent?.split('\n')[0]
      });
      throw error;
    }
  }

  // Hardcoded wallet path for browser compatibility
  static WALLET_PATH = '/wallet2/converted_wallet.pem';

  static DEVNET_CONFIG = {
    apiUrl: 'https://devnet-api.multiversx.com',
    chainId: 'D'
  };

  /**
   * Create a robust network provider with fallback mechanisms
   * @returns {sdkNetworkProviders.ApiNetworkProvider} Network provider
   */
  static createNetworkProvider() {
    try {
      return new sdkNetworkProviders.ApiNetworkProvider(this.DEVNET_CONFIG.apiUrl);
    } catch (error) {
      console.error('❌ Network Provider Creation Failed', {
        errorMessage: error.message,
        fallbackUrl: this.DEVNET_CONFIG.apiUrl
      });
      throw error;
    }
  }

  // Default network configuration for MultiversX devnet
  static DEFAULT_NETWORK_CONFIG = {
    chainId: 'D',
    gasPerDataByte: 1500,
    minGasPrice: 1000000000,
    // Add more default parameters as needed
  };

  /**
   * Get network configuration with robust fallback
   * @returns {Promise<Object>} Network configuration
   */
  static async getNetworkConfiguration() {
    try {
      console.log('🌐 Fetching Network Configuration');

      // Check if network config is already set
      if (this.networkConfig) {
        console.log('✅ Using Existing Network Configuration', this.networkConfig);
        return this.networkConfig;
      }

      // Try to fetch from network provider
      try {
        const networkProvider = this.createNetworkProvider();
        const networkConfig = await networkProvider.getNetworkConfig();
        
        console.log('🔧 Network Configuration Fetched', {
          chainId: networkConfig.ChainID,
          gasPerDataByte: networkConfig.GasPerDataByte,
          minGasPrice: networkConfig.MinGasPrice
        });

        // Store and return network configuration
        this.networkConfig = {
          chainId: networkConfig.ChainID,
          gasPerDataByte: networkConfig.GasPerDataByte,
          minGasPrice: networkConfig.MinGasPrice
        };

        return this.networkConfig;
      } catch (providerError) {
        console.warn('⚠️ Network Provider Configuration Failed', {
          errorMessage: providerError.message
        });

        // Fallback to default configuration
        console.log('🔄 Falling Back to Default Network Configuration');
        this.networkConfig = { ...this.DEFAULT_NETWORK_CONFIG };
        return this.networkConfig;
      }
    } catch (error) {
      console.error('❌ Network Configuration Retrieval Failed', {
        errorMessage: error.message,
        errorStack: error.stack
      });

      // Final fallback to hardcoded default
      this.networkConfig = { ...this.DEFAULT_NETWORK_CONFIG };
      return this.networkConfig;
    }
  }

  /**
   * Send a real blockchain transaction with comprehensive error handling
   * @param {Object} transaction - Transaction details
   * @returns {Promise<string>} Transaction hash
   */
  async sendRealBlockchainTransaction(transaction) {
    try {
      console.log('🚀 Preparing Transaction', { 
        receiver: transaction.receiver,
        value: transaction.value,
        data: transaction.data
      });

      // Validate transaction object
      if (!transaction) {
        throw new Error('Transaction object is undefined');
      }

      // Validate required transaction fields
      const requiredFields = ['receiver', 'sender', 'value', 'chainID'];
      for (const field of requiredFields) {
        if (!transaction[field]) {
          throw new Error(`Missing required transaction field: ${field}`);
        }
      }

      // Validate UserSigner
      if (!this.userSigner) {
        throw new Error('UserSigner not initialized');
      }

      // Import MultiversX SDK dynamically
      const sdkCore = await import('@multiversx/sdk-core');
      const sdkNetworkProviders = await import('@multiversx/sdk-network-providers');

      // Create network provider
      const networkProvider = new sdkNetworkProviders.ApiNetworkProvider(
        'https://devnet-api.multiversx.com'
      );

      // Get wallet address with robust error checking
      let walletAddress;
      try {
        walletAddress = this.userSigner.getAddress();
        
        // Additional validation for wallet address
        if (!walletAddress) {
          console.error("❌ Wallet address is undefined or invalid!");
          throw new Error("Invalid wallet address");
        }
      } catch (addressError) {
        console.error('❌ Error getting wallet address', {
          errorMessage: addressError.message,
          signerAvailable: !!this.userSigner,
          signerType: typeof this.userSigner
        });
        throw new Error(`Failed to retrieve wallet address: ${addressError.message}`);
      }

      // Retrieve account with comprehensive error handling
      let account;
      try {
        account = await networkProvider.getAccount(walletAddress);
        
        // Detailed account logging
        console.log("🔍 Account Data:", {
          fullAccountObject: account,
          nonce: account?.nonce,
          balance: account?.balance
        });

        // Validate account retrieval
        if (!account) {
          throw new Error("No account data retrieved from network provider");
        }
      } catch (accountError) {
        console.error('❌ Account Retrieval Error', {
          errorMessage: accountError.message,
          walletAddress: walletAddress.toString()
        });
        throw new Error(`Failed to retrieve account: ${accountError.message}`);
      }

      // Robust nonce retrieval
      const nonce = account.nonce || 0;
      console.log('🔢 Nonce Retrieval', {
        nonce: nonce,
        addressUsed: walletAddress.toString()
      });

      // Comprehensive transaction value handling
      let transactionValue = "0";
      try {
        // Attempt to convert transaction value to a valid number
        if (transaction.value !== undefined && transaction.value !== null) {
          // Convert to string and trim whitespace
          const valueStr = String(transaction.value).trim();
          
          // Parse the value, defaulting to 0 if invalid
          const parsedValue = parseFloat(valueStr);
          
          // Validate the parsed value
          transactionValue = isNaN(parsedValue) || parsedValue < 0 
            ? "0" 
            : parsedValue.toString();
        }

        console.log('💰 Transaction Value Processed', {
          originalValue: transaction.value,
          processedValue: transactionValue
        });
      } catch (valueError) {
        console.error('❌ Transaction Value Processing Error', {
          errorMessage: valueError.message,
          originalValue: transaction.value
        });
        transactionValue = "0";
      }

      console.log('transaction',transaction);
      
      // Prepare transaction with comprehensive error prevention
      const txBuilder = new sdkCore.Transaction({
        nonce: nonce,
        value: new sdkCore.BigIntValue(transactionValue),
        sender: this.userSigner.getAddress(),
        receiver: sdkCore.Address.fromBech32(transaction.receiver),
        gasLimit: transaction.gasLimit || 10000000,
        chainID: transaction.chainID || 'D',
        data: transaction.data ? Buffer.from(transaction.data) : undefined
      });

      console.log('🔐 Transaction Object Created',txBuilder,  {
        receiverAddress: txBuilder.receiver,
        senderAddress: txBuilder.sender,
        nonce: Number(txBuilder.nonce),
        value: Number(txBuilder.value)
      });

      // Sign transaction with enhanced error handling
      let signedTransaction;
      try {

        const serializedTransaction = txBuilder.serializeForSigning();
        console.log('🔐 Serialized Transaction',serializedTransaction);
        
        signedTransaction = await this.userSigner.sign(serializedTransaction);
        txBuilder.applySignature(signedTransaction);
        

        console.log('✅ Transaction Signed Successfully', {
          signerMethods: Object.keys(this.userSigner),
          transactionDetails: {
            receiver: txBuilder.receiver,
            sender:  txBuilder.sender
          }
        });
      } catch (signError) {
        console.error('❌ Transaction Signing Failed', {
          errorMessage: signError.message,
          signerAvailable: !!this.userSigner,
          signerType: typeof this.userSigner,
          signerMethods: this.userSigner ? Object.keys(this.userSigner) : 'No Methods',
          transactionDetails: transaction
        });
        throw new Error(`Transaction signing failed: ${signError.message}`);
      }

      // Send transaction with comprehensive error handling
      try {
        console.log(signedTransaction);
        
        const txHash = await networkProvider.sendTransaction(signedTransaction);
        console.log('📡 Sending Transaction',signedTransaction);

        console.log('✅ Transaction Sent Successfully', {
          txHash,
          receiver: transaction.receiver
        });

        return txHash;
      } catch (sendError) {
        console.error('❌ Transaction Sending Failed', sendError, {
          errorMessage: sendError.message,
          signedTransactionDetails: signedTransaction
        });
        throw new Error(`Transaction sending failed: ${sendError.message}`);
      }
    } catch (error) {
      console.error('❌ Comprehensive Transaction Sending Error', {
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name,
        transactionDetails: transaction
      });

      // Rethrow to allow caller to handle or display the error
      throw error;
    }
  }

  /**
   * Validate and sanitize PEM file content
   * @param {string} pemContent - Raw PEM file content
   * @returns {string} Sanitized PEM content
   */
  static validatePemContent(pemContent) {
    // Comprehensive PEM content validation
    if (!pemContent || typeof pemContent !== 'string') {
      throw new Error('Invalid PEM content: must be a non-empty string');
    }

    // Remove any leading/trailing whitespace and normalize line breaks
    let sanitizedContent = pemContent.trim().replace(/\r\n/g, '\n');

    // More flexible PEM format regex
    const pemRegex = /-----BEGIN\s+PRIVATE\s+KEY-----\s*([\s\S]*?)\s*-----END\s+PRIVATE\s+KEY-----/;
    const matches = sanitizedContent.match(pemRegex);

    if (!matches) {
      console.error('❌ Invalid PEM Format', {
        contentLength: sanitizedContent.length,
        firstChars: sanitizedContent.substring(0, 100),
        lastChars: sanitizedContent.substring(sanitizedContent.length - 100)
      });
      throw new Error('Invalid PEM format: must contain BEGIN and END PRIVATE KEY markers');
    }

    // Extract the base64 encoded key content
    let base64Content = matches[1].replace(/\s+/g, '');

    // Validate base64 content
    try {
      // Attempt to decode the base64 content
      const decodedContent = atob(base64Content);
      
      // Check decoded content length (basic sanity check)
      if (decodedContent.length < 32) {
        throw new Error('Decoded PEM content is too short');
      }
    } catch (decodeError) {
      console.error('❌ Base64 Decoding Failed', {
        errorMessage: decodeError.message,
        base64Content: base64Content
      });
      throw new Error('Invalid base64 encoding in PEM file');
    }

    // Reconstruct a standard PEM format
    return `-----BEGIN PRIVATE KEY-----
${base64Content}
-----END PRIVATE KEY-----`;
  }

  /**
   * Enhance UserSigner with additional methods and error handling
   * @param {Object} userSigner 
   * @param {string} pemContent 
   * @returns {Object} Enhanced signer
   */
  static enhanceUserSigner(userSigner, pemContent) {
    // Validate and sanitize PEM content
    try {
      pemContent = this.validatePemContent(pemContent);
    } catch (validationError) {
      console.error('❌ PEM Content Validation Failed', {
        errorMessage: validationError.message,
        pemContentFirstChars: pemContent?.substring(0, 50)
      });
      throw validationError;
    }

    // Comprehensive diagnostic logging
    console.log('🔍 UserSigner Enhancement Diagnostic:', {
      pemContentLength: pemContent.length,
      pemContentFirstChars: pemContent.substring(0, 50),
      userSignerType: typeof userSigner,
      userSignerMethods: Object.keys(userSigner),
      sdkWalletKeys: Object.keys(sdkWallet),
      UserSignerType: typeof sdkWallet.UserSigner,
      UserSignerMethods: sdkWallet.UserSigner ? Object.keys(sdkWallet.UserSigner) : 'No Methods'
    });

    // Create a deep copy of the signer to avoid modifying the original
    const enhancedSigner = { ...userSigner };

    // Parse PEM content using multiple strategies
    let signer;
    try {
      // Strategy 1: Direct method
      if (typeof sdkWallet.UserSigner?.fromPem === 'function') {
        console.log('✅ Using sdkWallet.UserSigner.fromPem');
        signer = sdkWallet.UserSigner.fromPem(pemContent);
      } 
      // Strategy 2: Constructor approach
      else if (typeof sdkWallet.UserSigner === 'function') {
        console.log('✅ Using sdkWallet.UserSigner constructor');
        signer = new sdkWallet.UserSigner(pemContent);
      } else {
        throw new Error('No valid UserSigner creation method found');
      }

      // Add enhanced signing methods
      if (signer) {
        enhancedSigner.originalSign = enhancedSigner.sign;
        enhancedSigner.sign = async (transaction) => {
          try {
            // Try multiple signing strategies
            if (typeof signer.sign === 'function') {
              return await signer.sign(transaction);
            }
            if (typeof signer.signTransaction === 'function') {
              return await signer.signTransaction(transaction);
            }
            if (typeof enhancedSigner.originalSign === 'function') {
              return await enhancedSigner.originalSign(transaction);
            }
            throw new Error('No valid signing method found');
          } catch (signError) {
            console.error('❌ Enhanced Signing Failed', {
              errorMessage: signError.message,
              signerMethods: Object.keys(signer)
            });
            throw signError;
          }
        };

        // Ensure getAddress method
        enhancedSigner.getAddress = () => {
          try {
            return signer.getAddress();
          } catch (addressError) {
            console.error('❌ Address Extraction Failed', {
              errorMessage: addressError.message
            });
            throw addressError;
          }
        };
      }
    } catch (parseError) {
      console.error('❌ UserSigner Enhancement Failed', {
        errorMessage: parseError.message,
        pemContentFirstChars: pemContent?.substring(0, 50)
      });
      throw parseError;
    }

    return enhancedSigner;
  }

  /**
   * Set PEM file content globally with enhanced validation
   * @param {string} pemContent - PEM file content
   */
  static setPemFileContent(pemContent) {
    try {
      // Validate PEM content
      const validatedPemContent = this.validatePemContent(pemContent);
      
      // Store in multiple places for redundancy
      window.pemFileContent = validatedPemContent;
      sessionStorage.setItem('pemFileContent', validatedPemContent);
      
      // Create UserSigner immediately
      try {
        const userSigner = sdkWallet.UserSigner.fromPem(validatedPemContent);
        const address = userSigner.getAddress().bech32();
        
        // Store signer and address
        window.userSigner = userSigner;
        window.walletAddress = address;
        sessionStorage.setItem('walletAddress', address);
        
        console.log('✅ UserSigner Created Successfully', {
          address,
          signerMethods: Object.keys(userSigner)
        });
        
        return userSigner;
      } catch (signerError) {
        console.error('❌ UserSigner Creation Failed', {
          errorMessage: signerError.message,
          pemContentLength: validatedPemContent.length
        });
        throw signerError;
      }
    } catch (error) {
      console.error('❌ PEM Content Setting Failed', {
        errorMessage: error.message
      });
      throw error;
    }
  }

  /**
   * Get UserSigner, with fallback mechanisms
   * @returns {Object} UserSigner
   */
  static getUserSigner() {
    try {
      // Check window object first
      if (window.userSigner) {
        console.log('✅ UserSigner Retrieved from Window');
        return window.userSigner;
      }

      // Check session storage for PEM content
      const pemContent = sessionStorage.getItem('pemFileContent');
      if (pemContent) {
        console.log('🔍 Recreating UserSigner from Session Storage');
        return sdkWallet.UserSigner.fromPem(pemContent);
      }

      // Try reading from file path
      const pemFilePath = this.WALLET_PATH;
      if (pemFilePath) {
        console.log('📂 Attempting to read PEM from file', { pemFilePath });
        const fileContent = this.readPemFile(pemFilePath);
        return sdkWallet.UserSigner.fromPem(fileContent);
      }

      console.error('❌ No UserSigner Found');
      throw new Error('Wallet not connected. Please upload your PEM file.');
    } catch (error) {
      console.error('❌ UserSigner Retrieval Failed', {
        errorMessage: error.message
      });
      throw error;
    }
  }

  /**
   * Read PEM file content with error handling
   * @param {string} pemFilePath 
   * @returns {Promise<string>} PEM file content
   */
  static async readPemFile(pemFilePath) {
    try {
      console.log('🔍 Attempting to Read PEM File', { pemFilePath });

      // Direct file path handling
      if (pemFilePath && typeof pemFilePath === 'string') {
        try {
          const fileContent = await fetch(pemFilePath).then(r => r.text());
          if (fileContent) return fileContent;
        } catch (fetchError) {
          console.warn('⚠️ File fetch failed, trying alternative methods', fetchError);
        }
      }
      
      // Check session storage first
      const storedPemContent = sessionStorage.getItem('pemFileContent');
      if (storedPemContent) {
        console.log('✅ PEM Content Retrieved from Session Storage');
        return storedPemContent;
      }

      // Check global window object
      if (window.pemFileContent) {
        console.warn('⚠️ Using global pemFileContent');
        return window.pemFileContent;
      }

      // Fallback to hardcoded content with more robust validation
      const hardcodedPemContent = `-----BEGIN PRIVATE KEY-----
NDdhNjZmOThkMGU5ZmQ2NGYzZWZlMjRlZGRmNTlhYmViZDg0YWZmMmQxNmQ4ZDgw
NWM1ZjQzZDk1YjVjZjQ2ODA3MmYzMjFkN2ZkMDVhNzViZTRkMDRmOTk4NGRjZDBk
OTY3ZDYyYzhkOTc2YWQ3MDMxZDIwMmQxZmFiYzUxZjM=
-----END PRIVATE KEY-----`;
      
      console.warn('⚠️ Using hardcoded PEM content as last resort');
      return hardcodedPemContent;
    } catch (error) {
      console.error('❌ PEM File Reading Failed', {
        pemFilePath,
        errorMessage: error.message,
        errorStack: error.stack
      });

      // Final fallback mechanism
      throw new Error(`Could not read PEM file: ${error.message}. Please ensure PEM content is available.`);
    }
  }

  /**
   * Create a new bet using IPFS for metadata storage
   * @param {Object} betData - Bet details to be stored
   * @param {string|number} amount - Amount to stake in EGLD
   * @returns {Promise<Object>} Comprehensive bet creation result
   */
  static async createBet(betData, amount) {
    try {
      // Authenticate Firebase first
      await authenticateFirebase();

      // Validate betData
      if (!betData || typeof betData !== 'object') {
        throw new Error('Invalid bet data: must be an object');
      }

      // Comprehensive amount validation
      console.log('Original amount:', amount);
      console.log('Amount type:', typeof amount);

      // Check if amount is undefined or null
      if (amount === undefined || amount === null) {
        throw new Error("Amount is undefined or null. Please provide a valid amount.");
      }

      // Convert amount to string if it's a number
      const amountString = typeof amount === 'number' ? amount.toString() : amount;

      // Parse amount
      const parsedAmount = parseFloat(amountString);
      console.log('Parsed amount:', parsedAmount);

      // Validate parsed amount
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Invalid amount: must be a positive number');
      }

      // Prepare bet data with option
      const preparedBetData = {
        ...betData,
        option: betData.option ? 'Yes' : 'No'
      };

      // Upload bet metadata to IPFS
      const ipfsCid = await IpfsService.uploadToIpfs({
        ...preparedBetData,
        createdAt: new Date().toISOString()
      });

      console.log('Bet metadata uploaded to IPFS with CID:', ipfsCid);

      // Convert amount to string representation of smallest unit
      const valueInWei = (parsedAmount * 1e18).toFixed(0);
      console.log('valueInWei:', valueInWei);

      // Prepare transaction data
      const data = `createBet@${Buffer.from(ipfsCid).toString('hex')}`;

      // Prepare transaction to create bet on blockchain
      const transaction = new sdkCore.Transaction({
        value: valueInWei,
        data: new sdkCore.TransactionPayload(data),
        receiver: new sdkCore.Address(contractAddress),
        gasLimit: 60000000,
        chainID: networkConfig.chainId
      });

      // Log transaction details for debugging
      console.log('Transaction object:', {
        value: transaction.getValue().toString(),
        data: transaction.getData().toString(),
        receiver: transaction.getReceiver().toString(),
        gasLimit: transaction.getGasLimit()
      });

      await refreshAccount();

      // Send transactions with error handling
      const { sessionId, error } = await sendTransactions({
        transactions: transaction,
        transactionsDisplayInfo: {
          processingMessage: 'Creating bet...',
          errorMessage: 'Failed to create bet',
          successMessage: 'Bet created successfully'
        }
      });

      if (error) {
        console.error('Transaction error:', error);
        throw new Error(error);
      }

      console.log('Transaction successful! Session ID:', sessionId);

      // Prepare comprehensive bet result for component creation
      const betResult = {
        id: null, // Will be set by the contract
        ...preparedBetData,
        amount: parsedAmount,
        ipfsCid,
        txHash: sessionId,
        status: 'Open',
        createdAt: new Date().toISOString()
      };

      // Save bet to Firestore
      await BetService.saveBet(betResult);

      return {
        txHash: sessionId,
        betAmount: parsedAmount,
        betType: preparedBetData.option
      };
    } catch (error) {
      console.error('Error creating bet:', error);
      // Rethrow the error to be handled by the caller
      throw error;
    }
  }

  /**
   * Retrieve bet details from IPFS using contract-provided CID
   * @param {number} betId - ID of the bet to retrieve
   * @returns {Promise<Object>} Bet details from IPFS
   */
  static async getBetDetails(betId) {
    try {
      console.log(`Fetching details for bet ID: ${betId}`);

      // Validate contract address and bet ID
      if (!contractAddress) {
        console.warn('Contract address is not defined');
        return null;
      }

      if (!betId || betId <= 0) {
        console.warn('Invalid bet ID');
        return null;
      }

      const query = new sdkCore.Query({
        address: new sdkCore.Address(contractAddress),
        func: new sdkCore.ContractFunction('getBetById()'), 
        args: [new sdkCore.BigUIntValue(betId)]
      });

      try {
        const queryResponse = await this.createNetworkProvider().queryContract(query);
        
        console.log('Query response:', queryResponse);

        // Check if returnData exists and is not empty
        if (!queryResponse.returnData || queryResponse.returnData.length === 0) {
          console.warn(`No data returned for bet ID: ${betId}`);
          return null;
        }

        // Decode IPFS CID
        const ipfsCid = Buffer.from(queryResponse.returnData[0], 'base64').toString('utf-8');
        
        console.log(`Fetched IPFS CID for bet ${betId}:`, ipfsCid);

        // Validate IPFS CID
        if (!ipfsCid || !ipfsCid.startsWith('Qm')) {
          console.warn(`Invalid IPFS CID for bet ${betId}`);
          return null;
        }
        
        // Fetch bet details from IPFS
        const betDetails = await IpfsService.fetchFromIpfs(ipfsCid);
        
        return {
          id: betId,
          ...betDetails
        };

      } catch (queryError) {
        console.error(`Error querying bet ${betId}:`, {
          message: queryError.message,
          name: queryError.name,
          stack: queryError.stack
        });

        // Return null on query failure
        return null;
      }
    } catch (error) {
      console.error(`Unexpected error fetching bet ${betId}:`, {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      // Return null on any unexpected error
      return null;
    }
  }

  /**
   * Retrieve all bet IDs from the contract
   * @returns {Promise<number[]>} List of bet IDs
   */
  static async getAllBetIds() {
    try {
      console.log('Fetching bet IDs from contract:', contractAddress);

      // Validate contract address
      if (!contractAddress) {
        console.warn('Contract address is not defined');
        return [];
      }

      const query = new sdkCore.Query({
        address: new sdkCore.Address(contractAddress),
        func: new sdkCore.ContractFunction('getTotalBetCount()'), 
        args: []
      });

      try {
        const queryResponse = await this.createNetworkProvider().queryContract(query);
        
        console.log('Query response:', queryResponse);

        // Check if returnData exists and is not empty
        if (!queryResponse.returnData || queryResponse.returnData.length === 0) {
          console.warn('No bet count data returned from contract');
          return [];
        }

        // Decode total bet count with more robust parsing
        const totalBetsHex = queryResponse.returnData[0];
        console.log('Total bets hex:', totalBetsHex);

        // Safely parse the hex value
        const totalBets = totalBetsHex 
          ? parseInt(Buffer.from(totalBetsHex, 'base64').toString('hex') || '0', 16)
          : 0;

        console.log('Total bets parsed:', totalBets);

        // Return array of bet IDs or empty array
        return totalBets > 0 
          ? Array.from({length: totalBets}, (_, i) => i + 1) 
          : [];

      } catch (queryError) {
        console.error('Detailed contract query error:', {
          message: queryError.message,
          name: queryError.name,
          stack: queryError.stack
        });

        // Check for specific error types
        if (queryError.message.includes('Bad Request')) {
          console.warn('Bad Request error: Possible contract method mismatch or invalid query');
        }

        // Return empty array on query failure
        return [];
      }
    } catch (error) {
      console.error('Unexpected error in getAllBetIds:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      // Return empty array on any unexpected error
      return [];
    }
  }

  /**
   * Fetch all bet details from IPFS
   * @returns {Promise<Object[]>} List of bet details
   */
  static async getAllBets() {
    try {
      const betIds = await this.getAllBetIds();
      
      if (betIds.length === 0) {
        return []; // Return empty list if no bet IDs
      }
      
      // Fetch details for each bet
      const betsPromises = betIds.map(async (betId) => {
        try {
          return await this.getBetDetails(betId);
        } catch (betError) {
          console.warn(`Error fetching bet ${betId}:`, betError);
          return null; // Skip this bet if there's an error
        }
      });
      
      // Filter out any null results
      const bets = await Promise.all(betsPromises);
      return bets.filter(bet => bet !== null);
    } catch (error) {
      console.error('Error getting all bets:', error);
      return []; // Return empty list on any error
    }
  }

  /**
   * Prepare transaction for bet acceptance
   * @param {string} betId - Bet identifier
   * @param {number} amount - Bet amount in EGLD
   * @param {string} address - User wallet address
   * @returns {Object} Prepared transaction details
   */
  static async prepareBlockchainTransaction(betId, amount, address) {
    try {
      // Comprehensive logging and validation
      const logContext = {
        method: 'prepareBlockchainTransaction',
        timestamp: new Date().toISOString(),
        betId,
        amount,
        address,
        contractAddress
      };

      console.log('🔍 Preparing Blockchain Transaction:', logContext);

      // Validate critical parameters
      if (!betId) {
        throw new Error('Invalid Bet ID: No bet identifier provided');
      }

      if (!amount || parseFloat(amount) <= 0) {
        throw new Error(`Invalid Bet Amount: ${amount}. Must be a positive number.`);
      }

      if (!address) {
        throw new Error('Invalid Wallet Address: No address provided');
      }

      if (!contractAddress) {
        throw new Error('Contract Address Not Configured: Deploy the contract first');
      }

      // Convert amount to wei (smallest unit)
      const valueInWei = new BigNumber(amount)
        .multipliedBy(new BigNumber(10).pow(18))
        .toFixed(0);

      console.log('💰 Amount Conversion:', {
        originalAmount: amount,
        weiAmount: valueInWei
      });

      // Prepare transaction data with comprehensive encoding
      const encodedBetId = Buffer.from(betId.toString()).toString('hex');
      const transactionData = `acceptBet@${encodedBetId}`;

      console.log('📝 Transaction Data Preparation:', {
        originalBetId: betId,
        encodedBetId,
        transactionData
      });

      // Create transaction object with enhanced configuration
      const transaction = new sdkCore.Transaction({
        value: valueInWei,
        data: new sdkCore.TransactionPayload(transactionData),
        receiver: new sdkCore.Address(contractAddress),
        sender: new sdkCore.Address(address),
        gasLimit: 10000000, // Adjusted gas limit
        chainID: 'D', // Devnet chain ID
        version: 1,
        options: 0
      });

      console.log('🚀 Transaction Object Created:', {
        receiver: contractAddress,
        sender: address,
        value: valueInWei,
        gasLimit: 10000000,
        chainID: 'D'
      });

      return { 
        transaction, 
        logContext
      };
    } catch (error) {
      console.error('❌ Transaction Preparation Error:', {
        errorMessage: error.message,
        errorStack: error.stack,
        betId,
        amount,
        address
      });
      throw error;
    }
  }

  /**
   * Prepare transaction data for accepting a bet
   * @param {string} betId - Unique identifier for the bet
   * @returns {string} Encoded transaction data
   */
  static prepareAcceptBetTransactionData(betId) {
    try {
      // Validate bet ID
      if (!betId || typeof betId !== 'string') {
        throw new Error('Invalid bet ID for transaction data');
      }

      // Encode bet ID for blockchain transaction
      // This should match the smart contract's method signature
      const encodedBetId = Buffer.from(betId, 'utf-8').toString('base64');

      console.log('📦 Prepared Transaction Data', {
        betId,
        encodedBetId
      });

      // Construct transaction data for smart contract method
      // Adjust this based on your actual smart contract method signature
      return `acceptBet@${encodedBetId}`;
    } catch (error) {
      console.error('❌ Transaction Data Preparation Failed', {
        betId,
        errorMessage: error.message
      });
      throw error;
    }
  }

  /**
   * Convert amount to EGLD value with proper decimal handling
   * @param {number} amount - Bet amount 
   * @returns {string} EGLD value as string
   */
  static convertToEgldValue(amount) {
    try {
      // Ensure amount is a positive number
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Invalid bet amount');
      }

      // Convert to smallest EGLD unit (1 EGLD = 10^18 smallest units)
      const egldValue = (parsedAmount * 1e18).toString();

      console.log('💰 Amount Conversion', {
        inputAmount: amount,
        egldValue
      });

      return egldValue;
    } catch (error) {
      console.error('❌ EGLD Value Conversion Failed', {
        amount,
        errorMessage: error.message
      });
      throw error;
    }
  }

  /**
   * Accept an existing bet
   * @param {string} betId - Bet identifier
   * @param {number} amount - Bet amount
   * @returns {Promise<string>} Transaction hash
   */
  static async acceptBet(betId, amount) {
    try {
      console.log('💰 Initiating Bet Acceptance', { 
        betId, 
        amount, 
        timestamp: new Date().toISOString() 
      });

      // Validate input parameters
      if (!betId || typeof betId !== 'string') {
        throw new Error('Invalid bet ID');
      }

      if (amount <= 0) {
        throw new Error('Invalid bet amount');
      }

      // Create service instance
      const service = new BettingContractService();

      // Get UserSigner with robust retrieval
      const userSigner = this.getUserSigner();
      if (!userSigner) {
        throw new Error('Failed to retrieve user signer');
      }
      service.userSigner = userSigner;

      // Get sender address
      const senderAddress = userSigner.getAddress().toString();
      console.log('👤 Sender Address', { senderAddress });

      // Validate contract address
      if (!this.contractAddress) {
        throw new Error('Contract address is not set. Please deploy the contract first.');
      }

      // Prepare transaction data
      const transactionData = this.prepareAcceptBetTransactionData(betId);
      console.log('📝 Transaction Data Prepared', { transactionData });

      // Create transaction object
      const transaction = {
        receiver: this.contractAddress,
        sender: senderAddress,
        value: amount, // Use raw amount instead of converting
        gasLimit: 10000000, // Adjust based on contract complexity
        data: transactionData,
        chainID: 'D' // Hardcoded devnet chain ID
      };

      console.log('🔍 Transaction Details', { 
        receiver: transaction.receiver,
        value: transaction.value,
        chainId: transaction.chainID 
      });

      // Send blockchain transaction using service instance method
      const txHash = await service.sendRealBlockchainTransaction(transaction);
      
      console.log('✅ Bet Accepted Successfully', { 
        betId, 
        amount, 
        txHash 
      });

      return txHash;
    } catch (error) {
      console.error('❌ Comprehensive Bet Acceptance Error', {
        method: 'acceptBet',
        timestamp: new Date().toISOString(),
        betId,
        amount,
        address: this.userSigner?.getAddress()?.toString(),
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name
      });

      // Rethrow to allow caller to handle or display the error
      throw error;
    }
  }

  /**
   * Cancel an existing bet
   * @param {number} betId - ID of the bet to cancel
   * @returns {Promise<string>} Transaction hash
   */
  static async cancelBet(betId) {
    try {
      // Convert betId to string representation of smallest unit
      const betIdInWei = betId.toString();

      const transaction = new sdkCore.Transaction({
        data: `cancelBet@${betIdInWei}`,
        receiver: contractAddress,
        gasLimit: 60000000
      });

      await refreshAccount();

      const { sessionId, error } = await sendTransactions({
        transactions: transaction,
        transactionsDisplayInfo: {
          processingMessage: 'Cancelling bet...',
          errorMessage: 'Failed to cancel bet',
          successMessage: 'Bet cancelled successfully'
        }
      });

      if (error) {
        console.error('Transaction error:', error);
        throw new Error(error);
      }

      return sessionId;
    } catch (error) {
      console.error('Error cancelling bet:', error);
      throw error;
    }
  }

  /**
   * Resolve a bet (only callable by contract owner)
   * @param {number} betId - ID of the bet to resolve
   * @param {boolean} result - Result of the bet
   * @returns {Promise<string>} Transaction hash
   */
  static async resolveBet(betId, result) {
    try {
      // Convert betId to string representation of smallest unit
      const betIdInWei = betId.toString();

      const transaction = new sdkCore.Transaction({
        data: `resolveBet@${betIdInWei}@${result ? '01' : '00'}`,
        receiver: contractAddress,
        gasLimit: 60000000
      });

      await refreshAccount();

      const { sessionId, error } = await sendTransactions({
        transactions: transaction,
        transactionsDisplayInfo: {
          processingMessage: 'Resolving bet...',
          errorMessage: 'Failed to resolve bet',
          successMessage: 'Bet resolved successfully'
        }
      });

      if (error) {
        console.error('Transaction error:', error);
        throw new Error(error);
      }

      return sessionId;
    } catch (error) {
      console.error('Error resolving bet:', error);
      throw error;
    }
  }

  /**
   * Create a new bet using PEM wallet authentication
   * @param {string} description - Bet description
   * @param {string|number} amount - Amount to stake in EGLD
   * @param {boolean} option - Bet option (true/false)
   * @param {Object} pemSigner - PEM wallet signer
   * @param {string} pemAddress - PEM wallet address
   * @param {Object} additionalInfo - Additional bet metadata
   * @returns {Promise<Object>} Comprehensive bet creation result
   */
  static async createBetWithPem(description, amount, option, pemSigner, pemAddress, additionalInfo) {
    try {
      // Authenticate Firebase first
      await authenticateFirebase();

      // Validate input parameters
      console.log('Original amount:', amount);
      console.log('Amount type:', typeof amount);

      // Check if amount is undefined or null
      if (amount === undefined || amount === null) {
        throw new Error("Amount is undefined or null. Please provide a valid amount.");
      }

      // Convert amount to string if it's a number
      const amountString = typeof amount === 'number' ? amount.toString() : amount;

      // Parse amount
      const parsedAmount = parseFloat(amountString);
      console.log('Parsed amount:', parsedAmount);

      // Validate parsed amount
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Invalid amount: must be a positive number');
      }

      // Combine description with additional info for IPFS storage
      const betData = {
        description,
        option: option ? 'Yes' : 'No',
        ...additionalInfo
      };

      // Upload bet metadata to IPFS
      const ipfsCid = await IpfsService.uploadToIpfs({
        ...betData,
        createdAt: new Date().toISOString()
      });

      console.log('Bet metadata uploaded to IPFS with CID:', ipfsCid);

      // Convert amount to string representation of smallest unit
      const valueInWei = (parsedAmount * 1e18).toFixed(0);
      console.log('valueInWei:', valueInWei);

      // Prepare transaction data
      const data = `createBet@${Buffer.from(ipfsCid).toString('hex')}`;

      // Prepare transaction to create bet on blockchain
      const transaction = new sdkCore.Transaction({
        value: valueInWei,
        data: new sdkCore.TransactionPayload(data),
        receiver: new sdkCore.Address(contractAddress),
        sender: new sdkCore.Address(pemAddress),
        gasLimit: 60000000,
        chainID: networkConfig.chainId
      });

      // Log transaction details for debugging
      console.log('Transaction object:', {
        value: transaction.getValue().toString(),
        data: transaction.getData().toString(),
        receiver: transaction.getReceiver().toString(),
        sender: transaction.getSender().toString(),
        gasLimit: transaction.getGasLimit()
      });

      // Get account info for nonce
      const accountOnNetwork = await this.createNetworkProvider().getAccount(new sdkCore.Address(pemAddress));
      
      // Update transaction with nonce
      transaction.setNonce(accountOnNetwork.nonce);

      // Sign the transaction
      const serializedTx = transaction.serializeForSigning();
      const signature = await pemSigner.sign(serializedTx);
      transaction.applySignature(signature);

      // Send the transaction
      const txHash = await this.createNetworkProvider().sendTransaction(transaction);
      
      console.log('Transaction successful! Transaction Hash:', txHash);

      // Prepare comprehensive bet result for component creation
      const betResult = {
        id: null, // Will be set by the contract
        description,
        option: option ? 'Yes' : 'No',
        amount: parsedAmount,
        creator: pemAddress,
        ipfsCid,
        txHash,
        status: 'Open',
        createdAt: new Date().toISOString(),
        ...additionalInfo
      };

      // Save bet to Firestore
      await BetService.saveBet(betResult);

      return betResult;
    } catch (error) {
      console.error('Error creating bet with PEM:', error);
      throw error;
    }
  }

  /**
   * Helper method to convert decimal to hex
   * @param {number} decimal - Decimal number to convert
   * @returns {string} Hex representation
   */
  static decimalToHex(decimal) {
    return decimal.toString(16).padStart(2, '0');
  }

  /**
   * Set the smart contract address with validation
   * @param {string} address - MultiversX contract address
   */
  static setContractAddress(address) {
    try {
      // Basic validation for MultiversX address format
      const addressRegex = /^erd1[a-zA-Z0-9]{58}$/;
      
      if (!address || typeof address !== 'string') {
        throw new Error('Contract address must be a non-empty string');
      }

      if (!addressRegex.test(address)) {
        throw new Error('Invalid MultiversX contract address format');
      }

      // Store contract address
      this.contractAddress = address;
      
      // Optional: Store in session storage for persistence
      sessionStorage.setItem('contractAddress', address);

      console.log('✅ Contract Address Set Successfully', {
        address,
        addressLength: address.length
      });

      return address;
    } catch (error) {
      console.error('❌ Contract Address Setting Failed', {
        errorMessage: error.message,
        providedAddress: address
      });
      throw error;
    }
  }

  /**
   * Get the current contract address
   * @returns {string|null} Contract address or null
   */
  static getContractAddress() {
    // Check class property first
    if (this.contractAddress) {
      return this.contractAddress;
    }

    // Check session storage
    const storedAddress = sessionStorage.getItem('contractAddress');
    if (storedAddress) {
      this.contractAddress = storedAddress;
      return storedAddress;
    }

    console.warn('⚠️ No Contract Address Found');
    return null;
  }
}
