import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MarketCard from '../../components/MarketCard/MarketCard';
import BettingContractService from '../../services/BettingContractService';
import './Markets.css';

const Markets = () => {
  const navigate = useNavigate();
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        setLoading(true);
        // First get all active bet IDs
        const activeBets = await BettingContractService.getAllActiveBets();
        
        // Then fetch details for each bet
        const marketsPromises = activeBets.map(async (bet) => {
          const betDetails = await BettingContractService.getBetDetails(bet.id);
          if (betDetails) {
            // Parse the description which contains title, description, and endDate
            const [title, description, endDate] = betDetails.description.split('|');
            
            return {
              id: bet.id,
              title: title || 'Unnamed Market',
              description: description || betDetails.description,
              endDate: endDate || new Date().toISOString(),
              volume: parseFloat(betDetails.totalPool) / Math.pow(10, 18), // Convert from smallest denomination
              liquidity: parseFloat(betDetails.totalPool) / Math.pow(10, 18) / 2, // Simplified liquidity calculation
              yesPrice: 0.5, // Simplified price calculation
              noPrice: 0.5,  // Simplified price calculation
              status: betDetails.status
            };
          }
          return null;
        });
        
        const fetchedMarkets = (await Promise.all(marketsPromises)).filter(Boolean);
        
        // Fallback to example markets if no blockchain markets are available
        if (fetchedMarkets.length > 0) {
          setMarkets(fetchedMarkets);
        } else {
          // Use example markets data as fallback
          setMarkets([
            {
              id: 1,
              title: "Will Bitcoin reach $100,000 by end of 2025?",
              description: "This market predicts whether Bitcoin (BTC) will reach or exceed a price of $100,000 USD on any major cryptocurrency exchange before December 31st, 2025.",
              endDate: "2025-12-31",
              volume: 250000,
              liquidity: 100000,
              yesPrice: 0.65,
              noPrice: 0.35,
              status: 'Open'
            },
            {
              id: 2,
              title: "Will Turkey win Eurovision 2025?",
              description: "This market predicts whether Turkey will win the Eurovision Song Contest 2025. The market will resolve to 'Yes' if Turkey wins the contest.",
              endDate: "2025-05-20",
              volume: 75000,
              liquidity: 30000,
              yesPrice: 0.15,
              noPrice: 0.85,
              status: 'Open'
            },
            {
              id: 3,
              title: "Will Ethereum 2.0 complete its final upgrade in 2025?",
              description: "This market predicts whether Ethereum will complete all planned upgrades and transitions to ETH 2.0 by the end of 2025.",
              endDate: "2025-12-31",
              volume: 180000,
              liquidity: 75000,
              yesPrice: 0.72,
              noPrice: 0.28,
              status: 'Open'
            },
            {
              id: 4,
              title: "Will SpaceX successfully land on Mars in 2025?",
              description: "This market predicts whether SpaceX will successfully land a spacecraft on Mars by the end of 2025. The landing must be confirmed by NASA or other space agencies.",
              endDate: "2025-12-31",
              volume: 320000,
              liquidity: 150000,
              yesPrice: 0.25,
              noPrice: 0.75,
              status: 'Open'
            }
          ]);
        }
      } catch (error) {
        console.error('Error fetching markets:', error);
        // Use example markets as fallback on error
        setMarkets([
          {
            id: 1,
            title: "Will Bitcoin reach $100,000 by end of 2025?",
            description: "This market predicts whether Bitcoin (BTC) will reach or exceed a price of $100,000 USD on any major cryptocurrency exchange before December 31st, 2025.",
            endDate: "2025-12-31",
            volume: 250000,
            liquidity: 100000,
            yesPrice: 0.65,
            noPrice: 0.35,
            status: 'Open'
          },
          {
            id: 2,
            title: "Will Turkey win Eurovision 2025?",
            description: "This market predicts whether Turkey will win the Eurovision Song Contest 2025. The market will resolve to 'Yes' if Turkey wins the contest.",
            endDate: "2025-05-20",
            volume: 75000,
            liquidity: 30000,
            yesPrice: 0.15,
            noPrice: 0.85,
            status: 'Open'
          },
          {
            id: 3,
            title: "Will Ethereum 2.0 complete its final upgrade in 2025?",
            description: "This market predicts whether Ethereum will complete all planned upgrades and transitions to ETH 2.0 by the end of 2025.",
            endDate: "2025-12-31",
            volume: 180000,
            liquidity: 75000,
            yesPrice: 0.72,
            noPrice: 0.28,
            status: 'Open'
          },
          {
            id: 4,
            title: "Will SpaceX successfully land on Mars in 2025?",
            description: "This market predicts whether SpaceX will successfully land a spacecraft on Mars by the end of 2025. The landing must be confirmed by NASA or other space agencies.",
            endDate: "2025-12-31",
            volume: 320000,
            liquidity: 150000,
            yesPrice: 0.25,
            noPrice: 0.75,
            status: 'Open'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
  }, []);

  const handleMarketClick = (marketId) => {
    navigate(`/market/${marketId}`);
  };

  if (loading) {
    return <div className="loading">Loading markets...</div>;
  }

  return (
    <div className="markets-container">
      <h1>Prediction Markets</h1>
      <div className="markets-grid">
        {markets.map((market) => (
          <MarketCard
            key={market.id}
            title={market.title}
            description={market.description}
            endDate={market.endDate}
            volume={market.volume}
            liquidity={market.liquidity}
            yesPrice={market.yesPrice}
            noPrice={market.noPrice}
            status={market.status}
            onClick={() => handleMarketClick(market.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default Markets;
