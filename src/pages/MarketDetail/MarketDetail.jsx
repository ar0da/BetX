import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetAccountInfo, useGetLoginInfo } from '@multiversx/sdk-dapp/hooks';
import BettingContractService from '../../services/BettingContractService';
import './MarketDetail.css';

const MarketDetail = () => {
  const { betId } = useParams();
  const navigate = useNavigate();
  const { address } = useGetAccountInfo();
  const { isLoggedIn } = useGetLoginInfo();

  const [bet, setBet] = useState(null);
  const [betDetails, setBetDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stakeAmount, setStakeAmount] = useState('');
  const [transactionInProgress, setTransactionInProgress] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBetDetails = async () => {
      if (!betId) return;
      
      try {
        setLoading(true);
        const betData = await BettingContractService.getBetDetails(parseInt(betId));
        
        if (betData) {
          setBet(betData);
          
          // Parse the description JSON if it's in JSON format
          try {
            const parsedDescription = JSON.parse(betData.description);
            setBetDetails(parsedDescription);
          } catch (e) {
            // If not in JSON format, use as is
            setBetDetails({ title: 'Bet', description: betData.description });
          }
          
          // If the bet is matched, set the stake amount to the creator's stake
          if (betData.status === 'Matched' && betData.creatorStake) {
            setStakeAmount(betData.creatorStake);
          }
        } else {
          // Bet not found
          setError('Bet not found');
        }
      } catch (error) {
        console.error('Error fetching bet details:', error);
        setError(`Error fetching bet details: ${error.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchBetDetails();
  }, [betId, address, isLoggedIn, navigate]);

  const handleAcceptBet = async (e) => {
    e.preventDefault();
    
    if (!isLoggedIn) {
      setError('Please connect your wallet to accept this bet');
      return;
    }
    
    if (!bet || bet.status !== 'Open') {
      setError('This bet is not open for acceptance');
      return;
    }
    
    if (address === bet.creator) {
      setError('You cannot bet against yourself');
      return;
    }
    
    try {
      setTransactionInProgress(true);
      setError('');
      
      // Convert stake to smallest denomination (10^18)
      const stakeValue = bet.creatorStake;
      
      const response = await BettingContractService.acceptBet(
        parseInt(betId),
        stakeValue
      );
      
      console.log('Bet accepted successfully:', response);
      
      // Refresh bet data after transaction
      const updatedBet = await BettingContractService.getBetDetails(parseInt(betId));
      setBet(updatedBet);
    } catch (error) {
      console.error('Error accepting bet:', error);
      setError(`Error accepting bet: ${error.message || 'Unknown error'}`);
    } finally {
      setTransactionInProgress(false);
    }
  };

  const handleCancelBet = async () => {
    if (!isLoggedIn) {
      setError('Please connect your wallet to cancel this bet');
      return;
    }
    
    if (!bet || bet.status !== 'Open') {
      setError('This bet cannot be cancelled');
      return;
    }
    
    if (address !== bet.creator) {
      setError('Only the creator can cancel this bet');
      return;
    }
    
    try {
      setTransactionInProgress(true);
      setError('');
      
      const response = await BettingContractService.cancelBet(parseInt(betId));
      
      console.log('Bet cancelled successfully:', response);
      
      // Refresh bet data after transaction
      const updatedBet = await BettingContractService.getBetDetails(parseInt(betId));
      setBet(updatedBet);
    } catch (error) {
      console.error('Error cancelling bet:', error);
      setError(`Error cancelling bet: ${error.message || 'Unknown error'}`);
    } finally {
      setTransactionInProgress(false);
    }
  };

  const handleResolveBet = async (result) => {
    if (!isLoggedIn) {
      setError('Please connect your wallet to resolve this bet');
      return;
    }
    
    if (!bet || bet.status !== 'Matched') {
      setError('This bet cannot be resolved');
      return;
    }
    
    try {
      setTransactionInProgress(true);
      setError('');
      
      const response = await BettingContractService.resolveBet(
        parseInt(betId),
        result === 'creator'
      );
      
      console.log('Bet resolved successfully:', response);
      
      // Refresh bet data after transaction
      const updatedBet = await BettingContractService.getBetDetails(parseInt(betId));
      setBet(updatedBet);
    } catch (error) {
      console.error('Error resolving bet:', error);
      setError(`Error resolving bet: ${error.message || 'Unknown error'}`);
    } finally {
      setTransactionInProgress(false);
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const formatEgld = (value) => {
    if (!value) return '0';
    // Convert from smallest denomination (10^18) to EGLD
    const egldValue = parseInt(value) / Math.pow(10, 18);
    return egldValue.toFixed(4);
  };

  if (loading) {
    return <div className="loading">Loading bet details...</div>;
  }

  if (error && !bet) {
    return <div className="error-message">{error}</div>;
  }

  if (!bet) {
    return <div className="error-message">Bet not found</div>;
  }

  return (
    <div className="market-detail-container">
      {error && <div className="error-message">{error}</div>}
      
      <div className="market-header">
        <h1>{betDetails?.title || 'Bet Details'}</h1>
        <div className="market-status">
          Status: <span className={`status-${bet.status.toLowerCase()}`}>
            {bet.status}
          </span>
        </div>
      </div>

      <div className="market-details">
        <div className="detail-item">
          <span className="label">Description:</span>
          <span className="value">{betDetails?.description || bet.description}</span>
        </div>
        
        {betDetails?.endDate && (
          <div className="detail-item">
            <span className="label">End Date:</span>
            <span className="value">{new Date(betDetails.endDate).toLocaleString()}</span>
          </div>
        )}
        
        <div className="detail-item">
          <span className="label">Creator:</span>
          <span className="value">{formatAddress(bet.creator)}</span>
        </div>
        
        <div className="detail-item">
          <span className="label">Creator Stake:</span>
          <span className="value">{formatEgld(bet.creatorStake)} EGLD</span>
        </div>
        
        {bet.challenger && (
          <div className="detail-item">
            <span className="label">Challenger:</span>
            <span className="value">{formatAddress(bet.challenger)}</span>
          </div>
        )}
        
        {bet.challenger && (
          <div className="detail-item">
            <span className="label">Challenger Stake:</span>
            <span className="value">{formatEgld(bet.challengerStake)} EGLD</span>
          </div>
        )}
        
        {bet.winner && (
          <div className="detail-item">
            <span className="label">Winner:</span>
            <span className="value">{formatAddress(bet.winner)}</span>
          </div>
        )}
        
        <div className="detail-item">
          <span className="label">Total Pool:</span>
          <span className="value">
            {formatEgld(
              (parseInt(bet.creatorStake) + parseInt(bet.challengerStake || '0')).toString()
            )} EGLD
          </span>
        </div>
      </div>

      {/* Accept Bet Section */}
      {bet.status === 'Open' && isLoggedIn && address !== bet.creator && (
        <div className="action-section">
          <h2>Accept This Bet</h2>
          <p>You need to match the creator's stake of {formatEgld(bet.creatorStake)} EGLD</p>
          
          <button 
            className="action-button accept"
            onClick={handleAcceptBet}
            disabled={transactionInProgress}
          >
            {transactionInProgress ? 'Processing...' : `Accept Bet (${formatEgld(bet.creatorStake)} EGLD)`}
          </button>
        </div>
      )}

      {/* Cancel Bet Section */}
      {bet.status === 'Open' && isLoggedIn && address === bet.creator && (
        <div className="action-section">
          <h2>Cancel Your Bet</h2>
          <p>You can cancel your bet and get your stake back since no one has accepted it yet.</p>
          
          <button 
            className="action-button cancel"
            onClick={handleCancelBet}
            disabled={transactionInProgress}
          >
            {transactionInProgress ? 'Processing...' : 'Cancel Bet'}
          </button>
        </div>
      )}

      {/* Resolve Bet Section - Only for admin/owner */}
      {bet.status === 'Matched' && isLoggedIn && (
        <div className="action-section">
          <h2>Resolve Bet (Admin Only)</h2>
          <p>As an admin, you can resolve this bet by determining the winner.</p>
          
          <div className="resolve-buttons">
            <button
              className="action-button resolve-creator"
              onClick={() => handleResolveBet('creator')}
              disabled={transactionInProgress}
            >
              {transactionInProgress ? 'Processing...' : `Creator Wins (${formatAddress(bet.creator)})`}
            </button>
            <button
              className="action-button resolve-challenger"
              onClick={() => handleResolveBet('challenger')}
              disabled={transactionInProgress}
            >
              {transactionInProgress ? 'Processing...' : `Challenger Wins (${formatAddress(bet.challenger)})`}
            </button>
          </div>
          <p className="resolve-note">
            Note: Resolving the bet will distribute the pool to the winner and close the bet permanently.
          </p>
        </div>
      )}

      {/* Resolved Bet Section */}
      {bet.status === 'Resolved' && (
        <div className="action-section">
          <h2>Bet Resolved</h2>
          <p>
            This bet has been resolved. 
            {bet.winner && ` The winner is ${formatAddress(bet.winner)}.`}
          </p>
        </div>
      )}

      {/* Cancelled Bet Section */}
      {bet.status === 'Cancelled' && (
        <div className="action-section">
          <h2>Bet Cancelled</h2>
          <p>This bet was cancelled by the creator.</p>
        </div>
      )}

      {!isLoggedIn && (
        <div className="login-prompt">
          <p>Connect your wallet to interact with this bet.</p>
        </div>
      )}
    </div>
  );
};

export default MarketDetail;
