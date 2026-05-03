# Pair–Exchange Coverage Matrix

> **This file is auto-regenerated** 45 seconds after every server startup via `buildCoverageMatrix()` in `server/priceServer.ts`.
> The table below is a static reference showing *expected* coverage based on exchange capabilities.
> For live coverage, start the server and wait 45 s — the file will be overwritten with real tick data.

---

## Why USDT gaps appear but USDC / BTC gaps don't (by default)

| Quote | Typical cross-exchange spread | Avg break-even (fees) | Profitable? |
|-------|-------------------------------|-----------------------|-------------|
| USDT  | 0.2 – 2.0 %                  | 0.2 – 0.7 %           | ✅ Often     |
| USDC  | 0.01 – 0.15 %                | 0.2 – 0.7 %           | ❌ Rarely    |
| BTC   | 0.01 – 0.08 %                | 0.2 – 0.4 %           | ❌ Rarely    |

**USDT** markets are served by tier-3 regional exchanges (WhiteBit, UpBit, Phemex, CoinEx, BitMart)
that frequently lag the global price — creating exploitable spreads of 0.3–2 %.

**USDC** and **BTC cross-pair** markets are served almost exclusively by tier-1/2 global exchanges
(Binance, OKX, KuCoin, Bybit, Gate.io, MEXC) that are tightly arbitraged together. Their
spreads rarely exceed 0.05 %, which is well below break-even for any fee combination.

**As of this version** `getProfitableGaps()` returns *all* active gaps (spread > 0), not just
profitable ones. The `profitSimulation.isProfitable` flag on each gap indicates true profitability
after round-trip fees. USDC and BTC gaps are now visible in the UI (filter pills show non-zero
counts); they are labeled as not profitable, which is accurate.

---

## Expected USDC pair coverage

| Symbol       | Exchanges                                              | Gap-eligible |
|--------------|--------------------------------------------------------|--------------|
| BTC/USDC     | binance, bybit, okx, kucoin, gateio, mexc, coinbase    | ✅ 7          |
| ETH/USDC     | binance, bybit, okx, kucoin, gateio, mexc, coinbase    | ✅ 7          |
| SOL/USDC     | binance, bybit, okx, kucoin, gateio, coinbase          | ✅ 6          |
| XRP/USDC     | binance, okx, kucoin, gateio, coinbase                 | ✅ 5          |
| DOGE/USDC    | binance, okx, coinbase                                 | ✅ 3          |
| AVAX/USDC    | binance, okx, kucoin, coinbase                         | ✅ 4          |
| LINK/USDC    | binance, okx, kucoin, coinbase                         | ✅ 4          |
| ADA/USDC     | binance, okx, kucoin, coinbase                         | ✅ 4          |
| UNI/USDC     | binance, okx, gateio                                   | ✅ 3          |
| AAVE/USDC    | binance, okx                                           | ✅ 2          |
| MATIC/USDC   | binance, okx, kucoin                                   | ✅ 3          |
| ATOM/USDC    | binance, okx, kucoin, coinbase                         | ✅ 4          |
| NEAR/USDC    | binance, okx, kucoin, coinbase                         | ✅ 4          |
| ARB/USDC     | binance, okx                                           | ✅ 2          |
| OP/USDC      | binance, okx                                           | ✅ 2          |
| LTC/USDC     | binance, okx, coinbase                                 | ✅ 3          |

---

## Expected BTC cross-pair coverage

| Symbol       | Exchanges                                   | Gap-eligible |
|--------------|---------------------------------------------|--------------|
| ETH/BTC      | binance, bybit, okx, kucoin, gateio, mexc   | ✅ 6          |
| SOL/BTC      | binance, bybit, okx, kucoin                 | ✅ 4          |
| XRP/BTC      | binance, okx, kucoin, gateio                | ✅ 4          |
| DOGE/BTC     | binance, okx, kucoin                        | ✅ 3          |
| ADA/BTC      | binance, okx, kucoin                        | ✅ 3          |
| AVAX/BTC     | binance, okx, kucoin                        | ✅ 3          |
| LINK/BTC     | binance, okx, kucoin                        | ✅ 3          |
| DOT/BTC      | binance, okx, kucoin                        | ✅ 3          |
| BNB/BTC      | binance, okx                                | ✅ 2          |
| LTC/BTC      | binance, okx, kucoin, gateio                | ✅ 4          |
| BCH/BTC      | binance, okx, kucoin                        | ✅ 3          |
| ATOM/BTC     | binance, okx, kucoin                        | ✅ 3          |
| NEAR/BTC     | binance, okx, kucoin                        | ✅ 3          |
| UNI/BTC      | binance, okx, kucoin                        | ✅ 3          |
| ARB/BTC      | binance, okx                                | ✅ 2          |
| OP/BTC       | binance, okx                                | ✅ 2          |

---

## Pairs with expected single-source only (cannot gap — acceptable)

These pairs exist on so few exchanges that no cross-exchange gap detection is possible.
They are kept in the symbol universe for completeness and future coverage expansion.

| Symbol      | Likely source  | Reason                              |
|-------------|----------------|-------------------------------------|
| USDC/USDT   | binance, kucoin | Stablecoin pair — nearly zero spread |
| SOL/ETH     | binance, okx   | Thin market                          |
| BNB/ETH     | binance only   | BNB listed mainly on Binance         |
| LINK/ETH    | binance, okx   | Thin market                          |
| AAVE/ETH    | binance, okx   | Thin market                          |

---

## Notes on adapter symbol normalization

| Exchange  | Raw format   | Normalized to | Method              |
|-----------|-------------|----------------|---------------------|
| Binance   | `BTCUSDC`   | `BTC/USDC`     | SYMBOL_MAP lookup   |
| Bybit     | `BTCUSDC`   | `BTC/USDC`     | SYMBOL_MAP lookup   |
| OKX       | `BTC-USDC`  | `BTC/USDC`     | `replace('-', '/')` |
| KuCoin    | `BTC-USDC`  | `BTC/USDC`     | `replace('-', '/')` |
| Coinbase  | `BTC-USD`   | emitted as `BTC/USDC` (and `BTC/USDT`) | USD ≈ USDC/USDT |
| CCXT      | `BTC/USDC`  | `BTC/USDC`     | CCXT standard       |

---

*For live data, wait 45 s after `npm run server` and this file will be replaced with actual tick coverage.*
