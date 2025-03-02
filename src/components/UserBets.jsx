import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const UserBets = () => {
  const [userBets, setUserBets] = useState([]);

  useEffect(() => {
    // Retrieve bets from local storage on component mount
    const storedBets = JSON.parse(localStorage.getItem('userBets') || '[]');
    setUserBets(storedBets);
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const truncateText = (text, maxLength = 50) => {
    return text.length > maxLength 
      ? `${text.substring(0, maxLength)}...` 
      : text;
  };

  return (
    <div className="user-bets-container">
      <h2>My Bets</h2>
      {userBets.length === 0 ? (
        <p>No bets created yet.</p>
      ) : (
        <div className="bets-grid">
          {userBets.map((bet, index) => (
            <div key={index} className="bet-card">
              <div className="bet-header">
                <span className={`bet-option ${bet.option.toLowerCase()}`}>
                  {bet.option}
                </span>
                <span className="bet-status">{bet.status}</span>
              </div>
              
              <div className="bet-details">
                <h3>{truncateText(bet.description)}</h3>
                
                <div className="bet-metadata">
                  <p>
                    <strong>Amount:</strong> {bet.amount} EGLD
                  </p>
                  {bet.category && (
                    <p>
                      <strong>Category:</strong> {bet.category}
                    </p>
                  )}
                  {bet.endDate && (
                    <p>
                      <strong>End Date:</strong> {formatDate(bet.endDate)}
                    </p>
                  )}
                </div>
                
                <div className="bet-footer">
                  <p>
                    <strong>Created:</strong> {formatDate(bet.createdAt)}
                  </p>
                  {bet.txHash && (
                    <a 
                      href={`https://devnet-explorer.multiversx.com/transactions/${bet.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tx-link"
                    >
                      View Transaction
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserBets;
