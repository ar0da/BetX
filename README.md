# BetX - MultiversX Blockchain Betting Application

## Project Overview

BetX is a decentralized betting application built on the MultiversX blockchain, providing a secure and transparent betting experience using blockchain technology.

## Features

- 🔒 PEM Wallet Integration
- 🎲 Decentralized Betting Mechanism
- 🌐 MultiversX Devnet Deployment
- 🔐 Secure Client-Side Wallet Authentication

## Prerequisites

- Node.js (v18+)
- npm or yarn
- Rust (for smart contract development)
- MultiversX SDK
- MultiversX `mxpy` CLI tool

## Setup and Installation

### Frontend Setup

1. Clone the repository
   ```bash
   git clone https://github.com/ar0da/BetX.git
   cd BetX
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Run development server
   ```bash
   npm run dev
   ```

### Smart Contract Development

1. Build the contract
   ```bash
   cd minimal-contract
   cargo build --release
   mxpy contract build
   ```

2. Deploy to MultiversX Devnet
   - Use `mxpy contract deploy` or
   - Use devnet web wallet: https://devnet-wallet.multiversx.com

### Configuration

- Update `config.js` with your deployed contract address
- Ensure PEM wallet is configured for devnet

## Development Notes

- Uses React + Vite for frontend
- Rust-based smart contract
- Client-side PEM wallet authentication
- Devnet deployment for testing

## Security

- PEM files processed entirely client-side
- No sensitive wallet information stored server-side

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
Made by Gtu Blockchain


## Contact
Arda Ceylan
Salih Cengiz
Melik Caymazoğlu
