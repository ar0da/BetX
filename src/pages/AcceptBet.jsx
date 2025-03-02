import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetLoginInfo } from '@multiversx/sdk-dapp/hooks';
import BettingContractService from '../services/BettingContractService';
import { BetService } from '../config/firebase';
import { usePemWallet } from '../context/PemWalletContext';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './AcceptBet.css';

const AcceptBet = () => {
  const params = useParams();
  const navigate = useNavigate();
  const { address, isLoggedIn } = useGetLoginInfo();
  const { isPemLoggedIn, pemSigner, pemAddress } = usePemWallet();

  const [betDetails, setBetDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acceptanceStatus, setAcceptanceStatus] = useState(null);

  // Check if user is logged in with any wallet
  const isWalletConnected = isLoggedIn || isPemLoggedIn;
  const connectedAddress = pemAddress || address;

  useEffect(() => {
    const fetchBetDetails = async () => {
      try {
        console.log('betId',params);
        
        // First try to get bet details from Firestore
        const firestoreBet = await BetService.getBetById(params.betId);
        
        if (!firestoreBet) {
          // If not in Firestore, try contract service
          const contractBet = await BettingContractService.getBetDetails(parseInt(params.betId));
          
          if (!contractBet) {
            throw new Error('Bet not found');
          }
          
          setBetDetails(contractBet);
        } else {
          setBetDetails(firestoreBet);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBetDetails();
  }, [params.betId]);

  const handleAcceptBet = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate wallet connection
      if (!isWalletConnected) {
        throw new Error('Please connect your wallet to accept a bet');
      }

      // Validate bet details
      if (!betDetails || betDetails.status !== 'open') {
        throw new Error('This bet is no longer available');
      }

      // Prepare accept bet transaction
      const transaction = {
        receiver: BettingContractService.contractAddress,
        sender: connectedAddress,
        value: betDetails.amount,
        gasLimit: 10000000,
        data: `acceptBet@${betDetails.blockchainTxHash}`, // Use original blockchain tx hash
        chainID: 'D'
      };

      // Send transaction to accept the bet
      const acceptTxHash = await BettingContractService.sendRealBlockchainTransaction(transaction);

      // Update Firestore bet document
      const betDocRef = doc(db, 'bets', params.betId);
      await updateDoc(betDocRef, {
        status: 'accepted',
        acceptedBy: connectedAddress,
        acceptedAt: serverTimestamp(),
        acceptTxHash: acceptTxHash
      });

      toast.success('Bet accepted successfully!');
      setAcceptanceStatus(acceptTxHash);
      
      // Update local storage
      const userBets = JSON.parse(localStorage.getItem('userBets') || '[]');
      userBets.push(acceptTxHash);
      localStorage.setItem('userBets', JSON.stringify(userBets));

      // Redirect to home after successful acceptance
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err) {
      console.error('Bet Acceptance Error:', err);
      toast.error(`Failed to accept bet: ${err.message}`);
      setError(err.message || 'Failed to accept bet');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading bet details...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button onClick={() => navigate('/')}>Back to Home</button>
      </div>
    );
  }

  return (
    <div className="accept-bet-container">
      <h1>Accept Bet</h1>
      
      {acceptanceStatus ? (
        <div className="success-container">
          <h2>Bet Accepted Successfully!</h2>
          <div className="bet-details">
            <p><strong>Bet ID:</strong> {betDetails.id}</p>
            <p><strong>Description:</strong> {betDetails.description}</p>
            <p><strong>Amount:</strong> {betDetails.amount} EGLD</p>
            <p><strong>Transaction Hash:</strong> {acceptanceStatus}</p>
          </div>
          <p>Redirecting to home page...</p>
        </div>
      ) : (
        <form onSubmit={handleAcceptBet} className="accept-bet-form">
          <div className="bet-preview">
            <h2>Bet Details</h2>
            <p><strong>Description:</strong> {betDetails.description}</p>
            <p><strong>Option:</strong> {betDetails.option}</p>
            <p><strong>Creator's Stake:</strong> {betDetails.amount} EGLD</p>
          </div>

          <div className="form-group">
            <label htmlFor="amount">Stake Amount (EGLD)</label>
            <input
              type="number"
              id="amount"
              value={betDetails.amount}
              step="0.0001"
              min="0.0001"
              required
              disabled
            />
          </div>

          {!isWalletConnected && (
            <div className="wallet-warning">
              Please connect your wallet to accept this bet
            </div>
          )}

          <button 
            type="submit" 
            className="accept-bet-button"
            disabled={!isWalletConnected || loading}
          >
            {loading ? 'Accepting...' : 'Accept Bet'}
          </button>
        </form>
      )}
      <ToastContainer />
    </div>
  );
};

export default AcceptBet;
