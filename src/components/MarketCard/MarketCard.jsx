import React from 'react';
import './MarketCard.css';

const MarketCard = ({
  title,
  description,
  endDate,
  volume,
  liquidity,
  yesPrice,
  noPrice,
  status = 'Open',
  onClick
}) => {
  return (
    <div className="market-card" onClick={onClick}>
      <h3>{title}</h3>
      <p className="description">{description}</p>
      
      <div className="market-stats">
        <div className="stat-item">
          <p>Volume</p>
          <p>${volume.toLocaleString()}</p>
        </div>
        <div className="stat-item">
          <p>Liquidity</p>
          <p>${liquidity.toLocaleString()}</p>
        </div>
      </div>
      
      <div className="price-container">
        <div className="yes-price">
          <p>Yes: ${yesPrice.toFixed(2)}</p>
        </div>
        <div className="no-price">
          <p>No: ${noPrice.toFixed(2)}</p>
        </div>
      </div>
      
      <div className="market-footer">
        <div className="end-date">
          Ends: {new Date(endDate).toLocaleDateString()}
        </div>
        <div className={`market-status ${status.toLowerCase()}`}>
          {status}
        </div>
      </div>
    </div>
  );
};

export default MarketCard;
