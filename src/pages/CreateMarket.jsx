import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetLoginInfo } from '@multiversx/sdk-dapp/hooks';
import BettingContractService from '../services/BettingContractService';
import { usePemWallet } from '../context/PemWalletContext';
import './CreateMarket.css';
import { authenticateFirebase, auth } from '../config/firebase';

const CreateMarket = () => {
  const navigate = useNavigate();
  const { address, isLoggedIn } = useGetLoginInfo();
  const { isPemLoggedIn, pemSigner, pemAddress } = usePemWallet();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [option, setOption] = useState(true);
  const [category, setCategory] = useState('sports');
  const [endDate, setEndDate] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState('');

  // Check if user is logged in with any wallet
  const isWalletConnected = isLoggedIn || isPemLoggedIn;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Attempt Firebase authentication with more robust error handling
      try {
        await authenticateFirebase();
      } catch (authError) {
        console.error('Firebase Authentication Error:', authError);
        
        // Check if authentication is truly necessary
        if (!auth.currentUser) {
          throw new Error('Failed to authenticate with Firebase. Please check your configuration.');
        }
      }

      // Validate inputs
      if (!description.trim()) {
        throw new Error('Description is required');
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Invalid amount: must be a positive number');
      }

      // Prepare wallet context
      const walletContext = {
        isPemLoggedIn,
        pemSigner,
        pemAddress: pemAddress || address
      };

      // Prepare bet data
      const betData = {
        description: description.trim(),
        option,
        category,
        endDate: endDate || null,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        creator: walletContext.pemAddress || address
      };

      // Prepare additional information for IPFS
      const additionalInfo = {
        category,
        endDate,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        createdAt: new Date().toISOString(),
        creator: pemAddress || 'unknown'
      };

      let betResult;
      if (isPemLoggedIn && pemSigner && pemAddress) {
        console.log('Creating bet with PEM wallet');
        betResult = await BettingContractService.createBetWithPem(
          description,
          amount,
          option,
          pemSigner,
          pemAddress,
          additionalInfo
        );
      } else {
        console.log('Creating bet with DeFi wallet');
        betResult = await BettingContractService.createBet(
          betData,
          parsedAmount
        );
      }

      console.log('Bet created successfully:', betResult);

      // Store the bet result in local storage or context
      const currentBets = JSON.parse(localStorage.getItem('userBets') || '[]');
      currentBets.push(betResult);
      localStorage.setItem('userBets', JSON.stringify(currentBets));

      // Set transaction hash from the result
      setTxHash(betResult.txHash);
      setSuccess(true);

      // Reset form
      setDescription('');
      setAmount('');
      setOption(true);
      setCategory('sports');
      setEndDate('');
      setTags('');

      // Redirect to home after a short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      console.error('Error creating bet:', err);
      
      // Provide more specific error messages
      if (err.code === 'auth/configuration-not-found') {
        setError('Firebase Authentication is not configured correctly. Please check your project settings.');
      } else {
        setError(err.message || 'Failed to create bet');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isWalletConnected) {
    return (
      <div className="wallet-warning">
        <p>Please connect your wallet to create a bet</p>
      </div>
    );
  }

  return (
    <div className="create-market-container">
      <h1>Create New Bet</h1>

      {/* Success Message */}
      {success && (
        <div className="success-container">
          <div className="success-message">
            Bet created successfully!
            {txHash && (
              <div className="tx-hash">
                Transaction Hash: 
                <a 
                  href={`https://devnet-explorer.multiversx.com/transactions/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 10)}
                </a>
              </div>
            )}
            <p>Redirecting to home page...</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="error-container">
          <div className="error-message">{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="create-market-form">
        <div className="form-group">
          <label htmlFor="description">Bet Description *</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter a clear and concise bet description"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="amount">Stake Amount (EGLD) *</label>
          <input
            type="text"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter stake amount"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Bet Option *</label>
          <div className="option-selector">
            <button
              type="button"
              className={`option-btn ${option === true ? 'selected' : ''}`}
              onClick={() => setOption(true)}
              disabled={loading}
            >
              Yes
            </button>
            <button
              type="button"
              className={`option-btn ${option === false ? 'selected' : ''}`}
              onClick={() => setOption(false)}
              disabled={loading}
            >
              No
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={loading}
          >
            <option value="sports">Sports</option>
            <option value="politics">Politics</option>
            <option value="entertainment">Entertainment</option>
            <option value="crypto">Crypto</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="endDate">End Date (Optional)</label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="tags">Tags (Comma separated, Optional)</label>
          <input
            type="text"
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., football, championship, final"
            disabled={loading}
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="button-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="button-primary"
            disabled={loading || !isWalletConnected}
          >
            {loading ? 'Creating Bet...' : 'Create Bet'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateMarket;
