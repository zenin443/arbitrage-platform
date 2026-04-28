// lib/magnus/botRegistry.ts

export interface BotStrategy {
  name: string
  type: 'primary' | 'secondary'
  description: string
}

export interface BotDefinition {
  internalId: string
  apiKey: string
  codename: string
  displayName: string
  tagline: string
  color: string
  colorName: string
  glowHex: string
  apiPath: string
  startingCapital: number | 'flex'
  capitalLabel: string
  /** Preferred quote currency for this bot's signal universe */
  quoteCurrency: 'USDT' | 'USDC' | 'BTC'
  strategies: BotStrategy[]
  winRateBenchmark: string
  signalsPerDay: string
  sharpe: string
  strategyClass: string
  explanation: string
}

export const BOT_REGISTRY: BotDefinition[] = [
  {
    internalId: 'magnus-beta-1k',
    apiKey: 'magnus-beta-1k',
    codename: 'VEGA',
    displayName: 'VEGA · $1K',
    tagline: 'Speed hunter',
    color: '#378ADD',
    colorName: 'cyan',
    glowHex: '#06b6d4',
    apiPath: '/api/magnus/beta-1k',
    startingCapital: 1000,
    capitalLabel: '$1K',
    quoteCurrency: 'USDT',
    strategies: [
      { name: 'CEX-CEX Spot Arb', type: 'primary', description: 'Same coin, different prices across exchanges' },
      { name: 'TWAP Deviation', type: 'primary', description: 'Positions ahead of institutional TWAP reversion' },
      { name: 'Stablecoin Drift', type: 'secondary', description: 'USDC/USDT peg deviation trades' },
      { name: 'Orderbook Pressure', type: 'secondary', description: 'Bid/ask imbalance direction predictor' },
      { name: 'Signal Scorer', type: 'secondary', description: '6-dimension opportunity filter' },
    ],
    winRateBenchmark: '94%+',
    signalsPerDay: '100-200',
    sharpe: '2.8-4.2',
    strategyClass: 'Price Arbitrage',
    explanation: 'VEGA hunts tight price gaps across all 18 exchanges simultaneously. When the same coin trades at different prices on different platforms, VEGA buys on the cheaper exchange and records the spread as profit. With a small capital base, it executes frequently with high precision.'
  },
  {
    internalId: 'magnus-beta-10k',
    apiKey: 'magnus-beta-10k',
    codename: 'NEXUS',
    displayName: 'NEXUS · $10K',
    tagline: 'Cross-exchange bridge',
    color: '#4AADE8',
    colorName: 'blue',
    glowHex: '#3b82f6',
    apiPath: '/api/magnus/beta-10k',
    startingCapital: 10000,
    capitalLabel: '$10K',
    quoteCurrency: 'USDC',
    strategies: [
      { name: 'CEX-CEX Spot Arb', type: 'primary', description: 'High-capital cross-exchange spread capture' },
      { name: 'Triangular Arbitrage', type: 'primary', description: 'Three-leg cycle: USDT->BTC->ETH->USDT' },
      { name: 'Wrapped Token Parity', type: 'secondary', description: 'WBTC/BTC and wETH/ETH parity gaps' },
      { name: 'Stablecoin Drift', type: 'secondary', description: 'USDC/USDT peg arbitrage' },
      { name: 'Cross-Chain Arb', type: 'secondary', description: 'Same token across different blockchains' },
    ],
    winRateBenchmark: '94%+',
    signalsPerDay: '100-200',
    sharpe: '2.8-4.2',
    strategyClass: 'Price Arbitrage',
    explanation: 'NEXUS operates with larger capital to capture price gaps across all 18 CEX exchanges. It also runs triangular arbitrage — exploiting price inconsistencies between three currency pairs on a single exchange. No cross-exchange transfer risk on the triangular leg.'
  },
  {
    internalId: 'magnus-alpha',
    apiKey: 'magnus-alpha',
    codename: 'HERMES',
    displayName: 'HERMES · Flex',
    tagline: 'DEX-CEX messenger',
    color: '#7F77DD',
    colorName: 'violet',
    glowHex: '#8b5cf6',
    apiPath: '/api/magnus/alpha',
    startingCapital: 'flex',
    capitalLabel: 'Flex',
    quoteCurrency: 'BTC',
    strategies: [
      { name: 'DEX-CEX Arbitrage', type: 'primary', description: 'Uniswap/Jupiter vs Binance/OKX price gaps' },
      { name: 'Wrapped Token Parity', type: 'primary', description: 'WBTC/BTC wETH/ETH parity detection' },
      { name: 'Triangular Arbitrage', type: 'secondary', description: 'Cross-pair cycles on single exchanges' },
      { name: 'Cross-Chain Arb', type: 'secondary', description: 'SOL on Solana vs Ethereum bridge gaps' },
      { name: 'TWAP Deviation', type: 'secondary', description: '4-hour TWAP reversion signal' },
    ],
    winRateBenchmark: '88%+',
    signalsPerDay: '20-60',
    sharpe: '2.5-3.5',
    strategyClass: 'DEX-CEX',
    explanation: 'HERMES bridges the gap between decentralized (DeFi) and centralized (CeFi) markets. DEX prices on Uniswap and Jupiter lag CEX prices by 12-60 seconds due to block confirmation times — HERMES captures this deterministic window before the gap closes.'
  },
  {
    internalId: 'magnus-futures',
    apiKey: 'magnus-futures',
    codename: 'KRONOS',
    displayName: 'KRONOS · $1K',
    tagline: 'Time convergence',
    color: '#EF9F27',
    colorName: 'amber',
    glowHex: '#f59e0b',
    apiPath: '/api/magnus/futures',
    startingCapital: 1000,
    capitalLabel: '$1K',
    quoteCurrency: 'USDT',
    strategies: [
      { name: 'Spot-Futures Basis', type: 'primary', description: 'Buy spot, short perp, collect basis convergence' },
    ],
    winRateBenchmark: '92%+',
    signalsPerDay: '30-80',
    sharpe: '2.5-3.5',
    strategyClass: 'Carry / Structural',
    explanation: 'KRONOS exploits the price difference between spot markets and perpetual futures. When a perpetual contract trades at a premium to spot, KRONOS buys spot and shorts the perpetual simultaneously — collecting the spread as they mechanically converge at each 8-hour funding window.'
  },
  {
    internalId: 'magnus-rate-harvest',
    apiKey: 'magnus-rate-harvest',
    codename: 'ATLAS',
    displayName: 'ATLAS · $5K',
    tagline: 'Carry harvester',
    color: '#1D9E75',
    colorName: 'green',
    glowHex: '#22c55e',
    apiPath: '/api/magnus/rate-harvest',
    startingCapital: 5000,
    capitalLabel: '$5K',
    quoteCurrency: 'USDC',
    strategies: [
      { name: 'Funding Rate Harvest', type: 'primary', description: 'Delta-neutral long spot + short perp position' },
    ],
    winRateBenchmark: '96%+',
    signalsPerDay: '3-8 events',
    sharpe: '4.0-6.0',
    strategyClass: 'Carry / Structural',
    explanation: 'ATLAS runs a delta-neutral strategy — simultaneously holding long spot and short perpetual positions of equal size. The directional exposure cancels out, leaving only the funding rate payment as pure income. Annualized rates reach 200-900% during bull markets. Zero directional risk.'
  },
  {
    internalId: 'magnus-pairs',
    apiKey: 'magnus-pairs',
    codename: 'SIGMA',
    displayName: 'SIGMA · $10K',
    tagline: 'Statistical arbitrageur',
    color: '#5DCAA5',
    colorName: 'purple',
    glowHex: '#a855f7',
    apiPath: '/api/simulators',
    startingCapital: 10000,
    capitalLabel: '$10K',
    quoteCurrency: 'USDT',
    strategies: [
      { name: 'Pairs Trading / Cointegration', type: 'primary', description: 'Z-score mean reversion on correlated pairs' },
    ],
    winRateBenchmark: '78%+',
    signalsPerDay: '5-20',
    sharpe: '3.5-5.0',
    strategyClass: 'Statistical',
    explanation: 'SIGMA uses statistical relationships between correlated crypto pairs. BTC and ETH share the same macro driver (crypto market sentiment) and historically trade within a stable ratio. When their ratio deviates significantly from the 30-day average, SIGMA positions for the inevitable reversion — shorting the expensive asset, longing the cheap one.'
  },
  {
    internalId: 'magnus-cascade',
    apiKey: 'magnus-cascade',
    codename: 'ARES',
    displayName: 'ARES · $3K',
    tagline: 'Liquidation hunter',
    color: '#E24B4A',
    colorName: 'orange',
    glowHex: '#f97316',
    apiPath: '/api/simulators',
    startingCapital: 3000,
    capitalLabel: '$3K',
    quoteCurrency: 'BTC',
    strategies: [
      { name: 'Liquidation Cascade', type: 'primary', description: 'OI drop detection + flash discount buying' },
    ],
    winRateBenchmark: '72%+',
    signalsPerDay: '3-8',
    sharpe: '2.0-4.0',
    strategyClass: 'Event-Driven',
    explanation: 'ARES monitors open interest data across perpetual exchanges. When a large cascade of forced liquidations occurs (typically 50M+ in a short window), spot prices temporarily drop below fair value as liquidation engines sell at market. ARES buys the discounted spot and holds for the mechanical reversion, typically within 90 seconds.'
  },
  {
    internalId: 'magnus-calendar',
    apiKey: 'magnus-calendar',
    codename: 'TEMPUS',
    displayName: 'TEMPUS · $5K',
    tagline: 'Calendar arbitrageur',
    color: '#BA7517',
    colorName: 'teal',
    glowHex: '#14b8a6',
    apiPath: '/api/simulators',
    startingCapital: 5000,
    capitalLabel: '$5K',
    quoteCurrency: 'USDC',
    strategies: [
      { name: 'Calendar Spread', type: 'primary', description: 'Quarterly futures vs perpetual basis arbitrage' },
    ],
    winRateBenchmark: '85%+',
    signalsPerDay: '5-20',
    sharpe: '2.5-4.0',
    strategyClass: 'Carry / Structural',
    explanation: 'TEMPUS trades the mispricing between quarterly futures contracts (which expire in March, June, September, December) and perpetual futures. At expiry, quarterly futures must equal spot price — this convergence is mathematically guaranteed. When the basis deviates from fair value, TEMPUS captures the mispricing.'
  },
  {
    internalId: 'magnus-listing',
    apiKey: 'magnus-listing',
    codename: 'SCOUT',
    displayName: 'SCOUT · $2K',
    tagline: 'New listing sniper',
    color: '#9B59B6',
    colorName: 'pink',
    glowHex: '#ec4899',
    apiPath: '/api/simulators',
    startingCapital: 2000,
    capitalLabel: '$2K',
    quoteCurrency: 'USDT',
    strategies: [
      { name: 'New Listing Arbitrage', type: 'primary', description: 'Exchange listing gap detection (60s polling)' },
    ],
    winRateBenchmark: '80%+',
    signalsPerDay: '2-5/week',
    sharpe: '3.0-5.0',
    strategyClass: 'Event-Driven',
    explanation: 'SCOUT monitors new token listings on major exchanges every 60 seconds. When a token lists on Binance for the first time, it often already trades on smaller exchanges at an established price. The listing gap — typically 3-15% — persists for 5-10 minutes before the market normalizes. SCOUT is first in.'
  },
]

// Helper: get bot by internal ID, apiKey, or codename
export function getBotById(id: string): BotDefinition | undefined {
  return BOT_REGISTRY.find(b =>
    b.internalId === id ||
    b.apiKey === id ||
    b.codename.toLowerCase() === id.toLowerCase()
  )
}

// Helper: get all codenames map for quick lookup
export const BOT_CODENAMES = Object.fromEntries(
  BOT_REGISTRY.map(b => [b.apiKey, b.codename])
)
