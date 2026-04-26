import { ExchangeConfig } from '../adapters/cex/base'

export const EXCHANGE_REGISTRY: Record<string, ExchangeConfig> = {
  binance: {
    id: 'binance', name: 'Binance', tier: 1,
    takerFee: 0.001, makerFee: 0.001,
    withdrawalFees: {
      USDT: { TRC20: 1, ERC20: 10, BEP20: 0.8, SOL: 1 },
      BTC:  { BTC: 0.0005 },
      ETH:  { ERC20: 0.005, ARB: 0.001 },
      BNB:  { BEP20: 0.0005 },
      SOL:  { SOL: 0.01 },
      XRP:  { XRP: 0.25 },
      DOGE: { DOGE: 5 },
      PEPE: { ERC20: 50000, BEP20: 50000 },
    },
    supportedNetworks: ['BTC', 'ERC20', 'TRC20', 'BEP20', 'SOL', 'XRP', 'ARB'],
    wsUrl: 'wss://stream.binance.com:9443/ws',
    restUrl: 'https://api.binance.com',
    active: true
  },
  bybit: {
    id: 'bybit', name: 'Bybit', tier: 1,
    takerFee: 0.001, makerFee: 0.001,
    withdrawalFees: {
      USDT: { TRC20: 1, ERC20: 10, BEP20: 0.8 },
      BTC:  { BTC: 0.0005 },
      ETH:  { ERC20: 0.005 },
      SOL:  { SOL: 0.01 },
      XRP:  { XRP: 0.25 },
    },
    supportedNetworks: ['BTC', 'ERC20', 'TRC20', 'BEP20', 'SOL', 'XRP'],
    wsUrl: 'wss://stream.bybit.com/v5/public/spot',
    restUrl: 'https://api.bybit.com',
    active: true
  },
  okx: {
    id: 'okx', name: 'OKX', tier: 1,
    takerFee: 0.001, makerFee: 0.0008,
    withdrawalFees: {
      USDT: { TRC20: 1, ERC20: 10, BEP20: 0.8 },
      BTC:  { BTC: 0.0004 },
      ETH:  { ERC20: 0.004 },
      SOL:  { SOL: 0.01 },
    },
    supportedNetworks: ['BTC', 'ERC20', 'TRC20', 'BEP20', 'SOL'],
    wsUrl: 'wss://ws.okx.com:8443/ws/v5/public',
    restUrl: 'https://www.okx.com',
    active: true
  },
  kucoin: {
    id: 'kucoin', name: 'KuCoin', tier: 1,
    takerFee: 0.001, makerFee: 0.001,
    withdrawalFees: {
      USDT: { TRC20: 1, ERC20: 10, BEP20: 0.8 },
      BTC:  { BTC: 0.0005 },
      ETH:  { ERC20: 0.005 },
      SOL:  { SOL: 0.01 },
    },
    supportedNetworks: ['BTC', 'ERC20', 'TRC20', 'BEP20', 'SOL'],
    wsUrl: 'wss://ws-api.kucoin.com',
    restUrl: 'https://api.kucoin.com',
    active: true
  },
  gateio: {
    id: 'gateio', name: 'Gate.io', tier: 2,
    takerFee: 0.002, makerFee: 0.002,
    withdrawalFees: {
      USDT: { TRC20: 1, ERC20: 10, BEP20: 0.8 },
      BTC:  { BTC: 0.0005 },
      ETH:  { ERC20: 0.005 },
    },
    supportedNetworks: ['BTC', 'ERC20', 'TRC20', 'BEP20'],
    restUrl: 'https://api.gateio.ws',
    active: true
  },
  mexc: {
    id: 'mexc', name: 'MEXC', tier: 2,
    takerFee: 0.001, makerFee: 0.0, // maker-free; taker 0.10%
    withdrawalFees: {
      USDT: { TRC20: 1, ERC20: 10, BEP20: 0.8 },
      BTC:  { BTC: 0.0005 },
      ETH:  { ERC20: 0.005 },
      SOL:  { SOL: 0.01 },
    },
    supportedNetworks: ['BTC', 'ERC20', 'TRC20', 'BEP20', 'SOL'],
    restUrl: 'https://api.mexc.com',
    active: true
  },
  bitget: {
    id: 'bitget', name: 'Bitget', tier: 2,
    takerFee: 0.001, makerFee: 0.001,
    withdrawalFees: {
      USDT: { TRC20: 1, ERC20: 10, BEP20: 0.8 },
      BTC:  { BTC: 0.0005 },
      ETH:  { ERC20: 0.005 },
    },
    supportedNetworks: ['BTC', 'ERC20', 'TRC20', 'BEP20'],
    restUrl: 'https://api.bitget.com',
    active: true
  },
  htx: {
    id: 'htx', name: 'HTX', tier: 2,
    takerFee: 0.002, makerFee: 0.002,
    withdrawalFees: {
      USDT: { TRC20: 1, ERC20: 10, BEP20: 0.8 },
      BTC:  { BTC: 0.0005 },
      ETH:  { ERC20: 0.005 },
    },
    supportedNetworks: ['BTC', 'ERC20', 'TRC20', 'BEP20'],
    restUrl: 'https://api.huobi.pro',
    active: true
  },
  bingx: {
    id: 'bingx', name: 'BingX', tier: 2,
    takerFee: 0.001, makerFee: 0.001, // 0.10% / 0.10%
    withdrawalFees: {
      USDT: { TRC20: 1, ERC20: 10, BEP20: 0.8 },
      BTC:  { BTC: 0.0005 },
    },
    supportedNetworks: ['BTC', 'ERC20', 'TRC20', 'BEP20'],
    restUrl: 'https://open-api.bingx.com',
    active: true
  },
  kraken: {
    id: 'kraken', name: 'Kraken', tier: 2,
    takerFee: 0.0026, makerFee: 0.0016, // 0.26% / 0.16%
    withdrawalFees: {
      USDT: { ERC20: 10 },
      BTC:  { BTC: 0.0002 },
      ETH:  { ERC20: 0.0035 },
    },
    supportedNetworks: ['BTC', 'ERC20'],
    restUrl: 'https://api.kraken.com',
    active: true
  },
  coinbase: {
    id: 'coinbase', name: 'Coinbase', tier: 3,
    takerFee: 0.006, makerFee: 0.004,
    withdrawalFees: {
      USDT: { ERC20: 10 },
      BTC:  { BTC: 0 },
      ETH:  { ERC20: 0 },
    },
    supportedNetworks: ['BTC', 'ERC20'],
    restUrl: 'https://api.exchange.coinbase.com',
    active: true
  },
  cryptocom: {
    id: 'cryptocom', name: 'Crypto.com', tier: 3,
    takerFee: 0.00075, makerFee: 0.00075,
    withdrawalFees: {
      USDT: { TRC20: 1, ERC20: 10 },
      BTC:  { BTC: 0.0004 },
      ETH:  { ERC20: 0.004 },
    },
    supportedNetworks: ['BTC', 'ERC20', 'TRC20'],
    restUrl: 'https://api.crypto.com',
    active: true
  },
  bitfinex: {
    id: 'bitfinex', name: 'Bitfinex', tier: 3,
    takerFee: 0.002, makerFee: 0.001,
    withdrawalFees: {
      USDT: { ERC20: 10, TRC20: 1 },
      BTC:  { BTC: 0.0004 },
      ETH:  { ERC20: 0.00135 },
    },
    supportedNetworks: ['BTC', 'ERC20', 'TRC20'],
    wsUrl: 'wss://api-pub.bitfinex.com/ws/2',
    restUrl: 'https://api-pub.bitfinex.com',
    active: true
  },
  bitstamp: {
    id: 'bitstamp', name: 'Bitstamp', tier: 3,
    takerFee: 0.005, makerFee: 0.003,
    withdrawalFees: {
      USDT: { ERC20: 10 },
      BTC:  { BTC: 0.0005 },
      ETH:  { ERC20: 0.004 },
    },
    supportedNetworks: ['BTC', 'ERC20'],
    restUrl: 'https://www.bitstamp.net',
    active: false // DISABLED — stale prices: FTM $0.046 vs real $0.70, ENJ wrong
  },
  upbit: {
    id: 'upbit', name: 'Upbit', tier: 3,
    takerFee: 0.0025, makerFee: 0.0025,
    withdrawalFees: {
      USDT: { TRC20: 1, ERC20: 10 },
      BTC:  { BTC: 0.0005 },
      ETH:  { ERC20: 0.005 },
    },
    supportedNetworks: ['BTC', 'ERC20', 'TRC20'],
    restUrl: 'https://api.upbit.com',
    active: true
  },
  phemex: {
    id: 'phemex', name: 'Phemex', tier: 3,
    takerFee: 0.001, makerFee: 0.001,
    withdrawalFees: {
      USDT: { TRC20: 1, ERC20: 10, BEP20: 0.8 },
      BTC:  { BTC: 0.0005 },
      ETH:  { ERC20: 0.005 },
    },
    supportedNetworks: ['BTC', 'ERC20', 'TRC20', 'BEP20'],
    restUrl: 'https://api.phemex.com',
    active: true
  },
  whitebit: {
    id: 'whitebit', name: 'WhiteBit', tier: 3,
    takerFee: 0.001, makerFee: 0.001,
    withdrawalFees: {
      USDT: { TRC20: 1, ERC20: 10, BEP20: 0.8 },
      BTC:  { BTC: 0.0005 },
      ETH:  { ERC20: 0.005 },
    },
    supportedNetworks: ['BTC', 'ERC20', 'TRC20', 'BEP20'],
    restUrl: 'https://whitebit.com',
    active: true
  },
  lbank: {
    id: 'lbank', name: 'LBank', tier: 3,
    takerFee: 0.001, makerFee: 0.001,
    withdrawalFees: {
      USDT: { TRC20: 1, ERC20: 10 },
      BTC:  { BTC: 0.0005 },
      ETH:  { ERC20: 0.005 },
    },
    supportedNetworks: ['BTC', 'ERC20', 'TRC20'],
    restUrl: 'https://api.lbank.info',
    active: false // DISABLED — inflated MATIC price: $0.377 vs real $0.198
  },
  coinex: {
    id: 'coinex', name: 'CoinEx', tier: 3,
    takerFee: 0.002, makerFee: 0.002,
    withdrawalFees: {
      USDT: { TRC20: 1, ERC20: 10, BEP20: 0.8 },
      BTC:  { BTC: 0.0005 },
      ETH:  { ERC20: 0.005 },
    },
    supportedNetworks: ['BTC', 'ERC20', 'TRC20', 'BEP20'],
    restUrl: 'https://api.coinex.com',
    active: true
  },
  bitmart: {
    id: 'bitmart', name: 'BitMart', tier: 3,
    takerFee: 0.0025, makerFee: 0.0025,
    withdrawalFees: {
      USDT: { TRC20: 1, ERC20: 10, BEP20: 0.8 },
      BTC:  { BTC: 0.0005 },
      ETH:  { ERC20: 0.005 },
    },
    supportedNetworks: ['BTC', 'ERC20', 'TRC20', 'BEP20'],
    restUrl: 'https://api-cloud.bitmart.com',
    active: true
  },
  ascendex: {
    id: 'ascendex', name: 'AscendEX', tier: 3,
    takerFee: 0.001, makerFee: 0.001,
    withdrawalFees: {
      USDT: { TRC20: 1, ERC20: 10, BEP20: 0.8 },
      BTC:  { BTC: 0.0005 },
      ETH:  { ERC20: 0.005 },
    },
    supportedNetworks: ['BTC', 'ERC20', 'TRC20', 'BEP20'],
    restUrl: 'https://ascendex.com',
    active: false // DISABLED — wrong MATIC price: $0.091 vs real $0.198
  },
  probit: {
    id: 'probit', name: 'ProBit', tier: 3,
    takerFee: 0.002, makerFee: 0.002,
    withdrawalFees: {
      USDT: { TRC20: 1, ERC20: 10 },
      BTC:  { BTC: 0.0005 },
      ETH:  { ERC20: 0.005 },
    },
    supportedNetworks: ['BTC', 'ERC20', 'TRC20'],
    restUrl: 'https://api.probit.com',
    active: false // DISABLED — low volume, stale orderbooks
  },
  btse: {
    id: 'btse', name: 'BTSE', tier: 3,
    takerFee: 0.001, makerFee: 0.001,
    withdrawalFees: {
      USDT: { TRC20: 1, ERC20: 10 },
      BTC:  { BTC: 0.0005 },
      ETH:  { ERC20: 0.005 },
    },
    supportedNetworks: ['BTC', 'ERC20', 'TRC20'],
    restUrl: 'https://api.btse.com',
    active: false // DISABLED — low volume, limited coin support
  },
  deribit: {
    id: 'deribit', name: 'Deribit', tier: 3,
    takerFee: 0.0005, makerFee: 0,
    withdrawalFees: {
      BTC:  { BTC: 0.0005 },
      ETH:  { ERC20: 0.0006 },
      USDT: { ERC20: 10 },
    },
    supportedNetworks: ['BTC', 'ERC20'],
    restUrl: 'https://www.deribit.com',
    active: false // DISABLED — derivatives exchange, perpetual prices ≠ spot
  },
  coinw: {
    id: 'coinw', name: 'CoinW', tier: 3,
    takerFee: 0.002, makerFee: 0.002,
    withdrawalFees: {
      USDT: { TRC20: 1, ERC20: 10 },
      BTC:  { BTC: 0.0005 },
      ETH:  { ERC20: 0.005 },
    },
    supportedNetworks: ['BTC', 'ERC20', 'TRC20'],
    restUrl: 'https://api.coinw.com',
    active: false // DISABLED — low volume, unreliable data quality
  },

  // ── DEX protocol stubs ──────────────────────────────────────────────────────
  // These entries allow fee lookup when DEX prices participate in spread comparisons.
  // Actual DEX trading logic lives in server/adapters/dex/; these stubs provide fee data only.
  // Gas/slippage costs are handled separately in cexDexCalculator.ts.

  hyperliquid: {
    id: 'hyperliquid', name: 'Hyperliquid', tier: 3,
    takerFee: 0.0005, makerFee: 0.0002, // 0.05% / 0.02% — perp DEX, deep books
    withdrawalFees: {},
    supportedNetworks: ['ARB'],
    restUrl: 'https://api.hyperliquid.xyz',
    active: false // price feed handled by HyperliquidAdapter → dexTickStore
  },
  jupiter: {
    id: 'jupiter', name: 'Jupiter', tier: 3,
    takerFee: 0.0, makerFee: 0.0, // DEX aggregator — fees embedded in slippage
    withdrawalFees: {},
    supportedNetworks: ['SOL'],
    restUrl: 'https://price.jup.ag',
    active: false // price feed handled by JupiterAdapter → dexTickStore
  },
  uniswap_v3: {
    id: 'uniswap_v3', name: 'Uniswap V3', tier: 3,
    takerFee: 0.003, makerFee: 0.0, // 0.30% pool fee tier (most common)
    withdrawalFees: {},
    supportedNetworks: ['ERC20', 'ARB', 'OP', 'BASE'],
    restUrl: 'https://api.uniswap.org',
    active: false // price feed handled by UniswapAdapter → dexTickStore
  },
}

export function getTier3Exchanges(): ExchangeConfig[] {
  return getAllExchanges().filter(e => e.tier === 3)
}

export function getExchange(id: string): ExchangeConfig {
  return EXCHANGE_REGISTRY[id]
}

export function getAllExchanges(): ExchangeConfig[] {
  return Object.values(EXCHANGE_REGISTRY).filter(e => e.active)
}

export function getTier1Exchanges(): ExchangeConfig[] {
  return getAllExchanges().filter(e => e.tier === 1)
}

export function getTier2Exchanges(): ExchangeConfig[] {
  return getAllExchanges().filter(e => e.tier === 2)
}
