export const routeNames = {
  home: '/',
  create: '/create-market',
  markets: '/markets'
};

export const routes = [
  {
    path: routeNames.home,
    component: 'Home'
  },
  {
    path: routeNames.create,
    component: 'CreateMarket'
  },
  {
    path: routeNames.markets,
    component: 'Markets'
  }
];
