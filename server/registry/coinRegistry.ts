export interface CoinMeta {
  symbol: string
  name: string
  category: 'major' | 'midcap' | 'meme' | 'defi'
  networks: string[]
  minTradeUSD: number
  active: boolean
}

export const COIN_REGISTRY: Record<string, CoinMeta> = {
  // Major
  BTC:  { symbol: 'BTC',  name: 'Bitcoin',   category: 'major',  networks: ['BTC'],          minTradeUSD: 10,  active: true },
  ETH:  { symbol: 'ETH',  name: 'Ethereum',  category: 'major',  networks: ['ERC20', 'ARB'], minTradeUSD: 10,  active: true },
  SOL:  { symbol: 'SOL',  name: 'Solana',    category: 'major',  networks: ['SOL'],          minTradeUSD: 10,  active: true },
  BNB:  { symbol: 'BNB',  name: 'BNB',       category: 'major',  networks: ['BEP20'],        minTradeUSD: 10,  active: true },
  XRP:  { symbol: 'XRP',  name: 'Ripple',    category: 'major',  networks: ['XRP'],          minTradeUSD: 10,  active: true },
  ADA:  { symbol: 'ADA',  name: 'Cardano',   category: 'major',  networks: ['ADA'],          minTradeUSD: 10,  active: true },
  AVAX: { symbol: 'AVAX', name: 'Avalanche', category: 'major',  networks: ['AVAX', 'ERC20'],minTradeUSD: 10,  active: true },
  DOT:  { symbol: 'DOT',  name: 'Polkadot',  category: 'major',  networks: ['DOT'],          minTradeUSD: 10,  active: true },
  LINK: { symbol: 'LINK', name: 'Chainlink', category: 'major',  networks: ['ERC20', 'BEP20'],minTradeUSD: 10, active: true },
  // Midcap
  DOGE: { symbol: 'DOGE', name: 'Dogecoin',  category: 'midcap', networks: ['DOGE'],         minTradeUSD: 10,  active: true },
  SHIB: { symbol: 'SHIB', name: 'Shiba Inu', category: 'midcap', networks: ['ERC20', 'BEP20'],minTradeUSD: 10, active: true },
  UNI:  { symbol: 'UNI',  name: 'Uniswap',   category: 'defi',   networks: ['ERC20', 'BEP20'],minTradeUSD: 10, active: true },
  ATOM: { symbol: 'ATOM', name: 'Cosmos',    category: 'midcap', networks: ['ATOM'],         minTradeUSD: 10,  active: true },
  NEAR: { symbol: 'NEAR', name: 'NEAR',      category: 'midcap', networks: ['NEAR'],         minTradeUSD: 10,  active: true },
  ARB:  { symbol: 'ARB',  name: 'Arbitrum',  category: 'defi',   networks: ['ERC20', 'ARB'], minTradeUSD: 10,  active: true },
  OP:   { symbol: 'OP',   name: 'Optimism',  category: 'defi',   networks: ['ERC20', 'OP'],  minTradeUSD: 10,  active: true },
  APT:  { symbol: 'APT',  name: 'Aptos',     category: 'midcap', networks: ['APT'],          minTradeUSD: 10,  active: true },
  // Meme
  PEPE: { symbol: 'PEPE', name: 'Pepe',      category: 'meme',   networks: ['ERC20', 'BEP20'],minTradeUSD: 50, active: true },
  WIF:  { symbol: 'WIF',  name: 'dogwifhat', category: 'meme',   networks: ['SOL'],          minTradeUSD: 50,  active: true },
  BONK: { symbol: 'BONK', name: 'Bonk',      category: 'meme',   networks: ['SOL', 'BEP20'], minTradeUSD: 50,  active: true },
  FLOKI:{ symbol: 'FLOKI',name: 'Floki',     category: 'meme',   networks: ['ERC20', 'BEP20'],minTradeUSD: 50, active: true },
  BRETT:{ symbol: 'BRETT',name: 'Brett',     category: 'meme',   networks: ['BASE'],         minTradeUSD: 50,  active: true },
}

export function getCoinsByCategory(category: CoinMeta['category']): CoinMeta[] {
  return Object.values(COIN_REGISTRY).filter(c => c.category === category && c.active)
}

export function getAllCoins(): CoinMeta[] {
  return Object.values(COIN_REGISTRY).filter(c => c.active)
}

export function getCoin(symbol: string): CoinMeta | undefined {
  return COIN_REGISTRY[symbol]
}
