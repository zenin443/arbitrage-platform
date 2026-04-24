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
    takerFee: 0.002, makerFee: 0.002,
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
    takerFee: 0.002, makerFee: 0.002,
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
    takerFee: 0.002, makerFee: 0.0016,
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
    id: 'coinbase', name: 'Coinbase', tier: 2,
    takerFee: 0.006, makerFee: 0.004,
    withdrawalFees: {
      USDT: { ERC20: 10 },
      BTC:  { BTC: 0 },
      ETH:  { ERC20: 0 },
    },
    supportedNetworks: ['BTC', 'ERC20'],
    restUrl: 'https://api.coinbase.com',
    active: true
  }
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
