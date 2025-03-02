import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DappProvider } from '@multiversx/sdk-dapp/wrappers';
import { NotificationModal, SignTransactionsModals, TransactionsToastList } from '@multiversx/sdk-dapp/UI';
import { AxiosInterceptorContext } from '@multiversx/sdk-dapp/wrappers/AxiosInterceptorContext';
import { apiTimeout, walletConnectV2ProjectId } from './config/config';
import { routeNames } from './config/routes';
import { PemWalletProvider } from './context/PemWalletContext';
import Navbar from './components/Navbar/Navbar';
import Home from './pages/Home';
import CreateMarket from './pages/CreateMarket';
import MarketDetail from './pages/MarketDetail/MarketDetail';
import AcceptBet from './pages/AcceptBet';
import './App.css';

const App = () => {
  return (
    <Router>
      <DappProvider
        environment="devnet"
        customNetworkConfig={{
          name: 'customConfig',
          apiTimeout,
          walletConnectV2ProjectId
        }}
      >
        <PemWalletProvider>
          <AxiosInterceptorContext.Provider>
            <AxiosInterceptorContext.Interceptor>
              <TransactionsToastList />
              <NotificationModal />
              <SignTransactionsModals />
              <div className="app">
                <Navbar />
                <main className="main-content">
                  <Routes>
                    <Route path={routeNames.home} element={<Home />} />
                    <Route path={routeNames.create} element={<CreateMarket />} />
                    <Route path="/market/:betId" element={<MarketDetail />} />
                    <Route path="/accept-bet/:betId" element={<AcceptBet />} />
                  </Routes>
                </main>
              </div>
            </AxiosInterceptorContext.Interceptor>
          </AxiosInterceptorContext.Provider>
        </PemWalletProvider>
      </DappProvider>
    </Router>
  );
};

export default App;
