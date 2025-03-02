import React from 'react';
import Home from '../pages/Home';
import Markets from '../pages/Markets/Markets';
import MarketDetail from '../pages/MarketDetail/MarketDetail';

export const routeNames = {
  home: '/',
  markets: '/markets',
  create: '/create',
  portfolio: '/portfolio',
  marketDetail: '/market/:betId'
};

export const routes = {
  [routeNames.home]: Home,
  [routeNames.markets]: Markets,
  [routeNames.create]: '/create',
  [routeNames.portfolio]: '/portfolio',
  [routeNames.marketDetail]: MarketDetail
};
