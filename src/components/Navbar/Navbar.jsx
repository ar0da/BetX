import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useGetAccountInfo, useGetLoginInfo } from '@multiversx/sdk-dapp/hooks';
import { logout } from '@multiversx/sdk-dapp/utils';
import { ExtensionLoginButton, WalletConnectLoginButton } from '@multiversx/sdk-dapp/UI';
import { routeNames } from '../../config/routes';
import { usePemWallet } from '../../context/PemWalletContext';
import PemWalletLogin from '../PemWalletLogin/PemWalletLogin';
import './Navbar.css';

const Navbar = () => {
  const { address } = useGetAccountInfo();
  const { isLoggedIn } = useGetLoginInfo();
  const { isPemLoggedIn, pemAddress, disconnectPemWallet } = usePemWallet();
  const [showPemLogin, setShowPemLogin] = useState(false);

  const handleLogout = () => {
    console.log('Logging out...');
    // If logged in with PEM wallet, disconnect using context
    if (isPemLoggedIn) {
      console.log('Disconnecting PEM wallet...');
      disconnectPemWallet();
      alert('PEM wallet disconnected successfully');
    } else {
      // Otherwise use MultiversX SDK logout
      console.log('Logging out using MultiversX SDK...')
      logout();
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const togglePemLogin = () => {
    setShowPemLogin(!showPemLogin);
  };

  const closePemLogin = () => {
    setShowPemLogin(false);
  };

  const commonProps = {
    callbackRoute: routeNames.home,
    nativeAuth: true
  };

  // Wallet connection status
  const isWalletConnected = isLoggedIn || isPemLoggedIn;
  const connectedAddress = pemAddress || address;

  const copyAddress = () => {
    if (connectedAddress) {
      navigator.clipboard.writeText(connectedAddress)
        .then(() => alert('Address copied!'))
        .catch(err => console.error('Copy failed', err));
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-left">
          <NavLink to={routeNames.home} className="navbar-brand">
            BetX
          </NavLink>
          <div className="navbar-links">
            <NavLink 
              to={routeNames.home}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              Market
            </NavLink>
            <NavLink 
              to={routeNames.create}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              Create Bet
            </NavLink>
          </div>
        </div>
        
        <div className="wallet-section">
          {isLoggedIn || isPemLoggedIn ? (
            <div className="wallet-status-navbar">
              <div className="wallet-connection-status connected">
                <span className="status-dot"></span>
                Connected
              </div>
              <div className="wallet-address-navbar">
                {formatAddress(connectedAddress)}
                <span 
                  className="wallet-address-copy" 
                  onClick={copyAddress}
                  title="Copy Address"
                >
                  📋
                </span>
              </div>
              <button 
                className="connect-wallet-btn"
                onClick={handleLogout}
              >
                {isPemLoggedIn 
                  ? `PEM: ${formatAddress(pemAddress)}` 
                  : `DeFi: ${formatAddress(address)}`}
              </button>
            </div>
          ) : (
            <>
              <div className="wallet-connect-buttons">
                <ExtensionLoginButton
                  {...commonProps}
                  buttonClassName="connect-wallet-btn"
                  loginButtonText="DeFi Wallet"
                />
                <WalletConnectLoginButton 
                  {...commonProps}
                  buttonClassName="connect-wallet-btn"
                  loginButtonText="xPortal"
                />
                <button 
                  className="connect-wallet-btn web-wallet"
                  onClick={togglePemLogin}
                >
                  PEM Wallet
                </button>
              </div>
              {showPemLogin && (
                <div className="pem-login-modal">
                  <div className="pem-login-backdrop" onClick={togglePemLogin}></div>
                  <div className="pem-login-content">
                    <button className="pem-login-close" onClick={togglePemLogin}>×</button>
                    <h3>Connect with PEM Wallet</h3>
                    <PemWalletLogin onClose={closePemLogin} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
