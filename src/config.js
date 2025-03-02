// MultiversX Blockchain Configuration
const DEFAULT_CONTRACT_ADDRESS = 'erd1xrlp8jz9yd05q8taetmhpzmslu4qk99d9alsgy0f565z3jl4pn2suqm27c';

export const MULTIVERSX_CONFIG = {
  NETWORK: {
    CHAIN_ID: 'D', // Devnet
    API_URL: 'https://devnet-api.multiversx.com',
    GATEWAY_URL: 'https://devnet-gateway.multiversx.com',
  },
  CONTRACT: {
    // Use import.meta.env for Vite environment variables
    ADDRESS: import.meta.env.VITE_CONTRACT_ADDRESS || DEFAULT_CONTRACT_ADDRESS,
  },
};
