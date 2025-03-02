export const walletConnectV2ProjectId = '9b1a9564f91cb659ffe21b73d5c4e2d8';
export const apiTimeout = 6000;
// Kontrat deploy edildikten sonra, bu adresi devnet'te deploy edilen kontrat adresi ile değiştirin
// MultiversX Explorer: https://devnet-explorer.multiversx.com
// Not: Bu adres minimal-contract için güncellenmelidir
export const contractAddress = 'erd1xrlp8jz9yd05q8taetmhpzmslu4qk99d9alsgy0f565z3jl4pn2suqm27c'; // Deployed contract address
export const networkConfig = {
  id: 'devnet',
  chainId: 'D',  // Chain ID for devnet is 'D'
  name: 'Devnet',
  egldLabel: 'xEGLD',
  walletAddress: 'https://devnet-wallet.multiversx.com',
  apiAddress: 'https://devnet-api.multiversx.com',
  gatewayAddress: 'https://devnet-gateway.multiversx.com',
  explorerAddress: 'https://devnet-explorer.multiversx.com'
};

// IPFS Configuration
export const ipfsConfig = {
  // IPFS gateway URLs
  gateway: 'https://gateway.pinata.cloud/ipfs/',
  publicGateway: 'https://ipfs.io/ipfs/',
  
  // Pinata specific settings
  pinata: {
    apiUrl: 'https://api.pinata.cloud',
    gatewayUrl: 'https://gateway.pinata.cloud'
  },
  
  // Set to true to use IPFS for storing bet data
  useIpfs: true
};
