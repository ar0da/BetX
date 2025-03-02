import React, { useState, useEffect } from 'react';
import { useGetLoginInfo } from '@multiversx/sdk-dapp/hooks';
import { Link } from 'react-router-dom';
import BettingContractService from '../services/BettingContractService';
import { BetService } from '../config/firebase';
import { usePemWallet } from '../context/PemWalletContext';
import UserBets from '../components/UserBets';
import './Home.css';

const Home = () => {
  const { address, isLoggedIn } = useGetLoginInfo();
  const { isPemLoggedIn, pemSigner, pemAddress } = usePemWallet();
  const [activeBets, setActiveBets] = useState([]);
  const [userBets, setUserBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingBetIds, setProcessingBetIds] = useState([]);

  // Wallet connection status
  const isWalletConnected = isLoggedIn || isPemLoggedIn;
  const connectedAddress = pemAddress || address;

  useEffect(() => {
    const fetchBets = async () => {
      try {
        setLoading(true);
        
        // Fetch active bets from Firestore
        const fetchedActiveBets = await BetService.getAllBets();
        
        // Add unique identifier to each bet if missing
        const betsWithIds = fetchedActiveBets.map((bet, index) => ({
          ...bet,
          id: bet.id || `bet_${Date.now()}_${index}`,
          amount: bet.amount || 0.0001 // Ensure amount exists
        }));

        console.log('Fetched Bets with IDs:', betsWithIds);
        
        setActiveBets(betsWithIds);

        // Fetch user's bets if logged in
        if (isWalletConnected && connectedAddress) {
          const fetchedUserBets = await BetService.getUserBets(connectedAddress);
          setUserBets(fetchedUserBets);
        }
      } catch (err) {
        console.error('Error fetching bets:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBets();
  }, [isWalletConnected, connectedAddress]);

  // Bet acceptance handler
  const handleAcceptBet = async (bet) => {
    // Ensure we have a consistent bet object
    const betToAccept = {
      id: bet.id || bet.tempId,
      amount: bet.amount,
      description: bet.description,
      creator: bet.creator
    };

    // Create a local copy of processing bet IDs to avoid race conditions
    const updatedProcessingBetIds = [...processingBetIds, betToAccept.id];
    setProcessingBetIds(updatedProcessingBetIds);

    try {
      // Validate wallet connection
      if (!isWalletConnected) {
        throw new Error('Please connect your wallet to accept a bet');
      }

      // Log detailed bet information for debugging
      console.log('Attempting to accept bet:', {
        betId: betToAccept.id,
        amount: betToAccept.amount,
        description: betToAccept.description,
        isWalletConnected,
        connectedAddress,
        isPemLoggedIn
      });

      // Validate inputs
      if (!betToAccept.id) {
        throw new Error('Bet ID is missing');
      }
      if (!betToAccept.amount) {
        throw new Error('Bet amount is missing');
      }

      // Determine which signer to use
      const signerToUse = isPemLoggedIn ? pemSigner : null;
      const addressToUse = connectedAddress;

      // Additional validation
      if (!addressToUse) {
        throw new Error('No wallet address found');
      }

      // Call bet acceptance method with comprehensive error handling
      const result = await BettingContractService.acceptBet(
        betToAccept.id, 
        betToAccept.amount, 
        signerToUse, 
        addressToUse
      );

      // Update local state or refetch bets
      const updatedBets = activeBets.filter(b => 
        b.id !== betToAccept.id && b.tempId !== betToAccept.id
      );
      setActiveBets(updatedBets);

      // Save blockchain transaction hash to Firestore
      await BetService.updateBet(betToAccept.id, { blockchainTxHash: result.txHash });

      // Show success message with transaction details
      alert(`Bet accepted successfully! Transaction Hash: ${result.txHash}`);
    } catch (error) {
      console.error('Full error details:', error);
      
      // Provide a detailed error message
      const errorMessage = error.message || 'Failed to accept bet';
      alert(`Error: ${errorMessage}`);
      
      // Log additional context about the error
      console.log('Error context:', {
        errorName: error.name,
        errorStack: error.stack
      });
    } finally {
      // Remove the bet ID from processing state
      setProcessingBetIds(prevIds => 
        prevIds.filter(id => id !== betToAccept.id)
      );
    }
  };

  // Copy wallet address
  const copyAddress = () => {
    if (connectedAddress) {
      navigator.clipboard.writeText(connectedAddress)
        .then(() => alert('Address copied!'))
        .catch(err => console.error('Copy failed', err));
    }
  };

  if (loading) {
    return <div className="loading">Loading bets...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="home-container">
      <div className="active-bets-section">
        <h2>Active Bets</h2>
        {activeBets.length === 0 ? (
          <p>No active bets available</p>
        ) : (
          <div className="bet-grid">
            {activeBets.map((bet) => {
              // Ensure bet has all required properties
              if (!bet.id) {
                console.warn('Skipping bet without ID:', bet);
                return null;
              }

              return (
                <div key={bet.id} className="bet-card">
                  <div className="bet-card-content">
                    <h3 className="bet-title">{bet.description || 'Unnamed Bet'}</h3>
                    
                    <div className="bet-details">
                      <div className="bet-detail">
                        <span className="detail-label">Option:</span>
                        <span className={`bet-option ${(bet.option || '').toLowerCase() === 'yes' ? 'yes' : 'no'}`}>
                          {bet.option || 'Not Specified'}
                        </span>
                      </div>
                      
                      <div className="bet-detail">
                        <span className="detail-label">Stake:</span>
                        <span className="bet-stake">{bet.amount || 0.0001} EGLD</span>
                      </div>
                      
                      {bet.category && (
                        <div className="bet-detail">
                          <span className="detail-label">Category:</span>
                          <span className="bet-category">{bet.category}</span>
                        </div>
                      )}
                      
                      {bet.endDate && (
                        <div className="bet-detail">
                          <span className="detail-label">End Date:</span>
                          <span className="bet-end-date">
                            {new Date(bet.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      
                      <div className="bet-detail">
                        <span className="detail-label">Created:</span>
                        <span className="bet-created-date">
                          {new Date(bet.createdAt || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bet-actions">
                      <button 
                        className="accept-bet-button"
                        onClick={() => {
                          console.log('Attempting to accept bet:', bet);
                          handleAcceptBet(bet);
                        }}
                        disabled={!isWalletConnected || processingBetIds.includes(bet.id)}
                      >
                        {processingBetIds.includes(bet.id) ? 'Processing...' : 'Accept Bet'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            }).filter(Boolean)}
          </div>
        )}
      </div>

      {isLoggedIn && (
        <div className="user-bets-section">
          <UserBets bets={userBets} />
        </div>
      )}
    </div>
  );
};

export default Home;
