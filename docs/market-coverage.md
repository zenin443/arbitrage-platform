# Market Coverage — Exchange × Pair Matrix

Last updated: 2026-04-28

## Symbol Universe

Arbitrance tracks **3 quote currencies** across all tier-1 and tier-2 exchanges.

| Quote | Pair count | Rationale |
|-------|-----------|-----------|
| USDT  | 90 pairs  | Universal quote; broadest exchange support |
| USDC  | 16 pairs  | Coinbase/Kraken primary; growing Binance coverage |
| BTC   | 16 pairs  | High-volume cross-pairs; triangular arb loops |
| **Total** | **122 pairs** | |

---

## USDT Pairs (90)

| Tier | Symbols |
|------|---------|
| 1 (free) | BTC, ETH, SOL, BNB, XRP, ADA, DOGE, AVAX, DOT, LINK |
| 2 (basic) | TRX, MATIC, UNI, NEAR, LTC, BCH, APT, FIL, ATOM, ARB, OP, IMX, INJ, SUI, SEI, STX, RENDER, FTM, ALGO, HBAR |
| 3 (pro) | VET, AAVE, GRT, SAND, MANA, AXS, THETA, EOS, IOTA, XTZ, FLOW, CRV, EGLD, KAVA, ROSE, ZIL, ONE, ENJ, CHZ, LRC, COMP, SNX, BAL, SUSHI, YFI, DYDX, GMX, MKR, RPL, SSV |
| 4 (pro) | PEPE, SHIB, WIF, BONK, FLOKI, ORDI, TIA, WLD, JUP, PYTH, W, STRK, MEME, BLUR, ACE, PIXEL, PORTAL, DYM, ALT, ONDO, PENDLE, ENA, ETHFI, BOME, SLERF, MEW, POPCAT, TURBO, NEIRO, APE |

## USDC Pairs (16)

| Tier | Symbols |
|------|---------|
| 1 | BTC/USDC, ETH/USDC, SOL/USDC, XRP/USDC, DOGE/USDC, AVAX/USDC, LINK/USDC, ADA/USDC |
| 2 | UNI/USDC, AAVE/USDC, MATIC/USDC, ATOM/USDC, NEAR/USDC, ARB/USDC, OP/USDC, LTC/USDC |

## BTC Cross-Pairs (16)

| Tier | Symbols |
|------|---------|
| 1 | ETH/BTC, SOL/BTC, XRP/BTC, DOGE/BTC, ADA/BTC, AVAX/BTC, LINK/BTC, DOT/BTC |
| 2 | BNB/BTC, LTC/BTC, BCH/BTC, ATOM/BTC, NEAR/BTC, UNI/BTC, ARB/BTC, OP/BTC |

---

## Exchange Coverage

Pair availability varies by exchange. The adapter layer validates pair existence at startup and logs skipped pairs. Below is the **expected** coverage based on exchange APIs as of this document's date.

> **Note:** Actual subscribed counts are logged to stdout at startup:  
> `[Coverage] binance: 90 USDT, 18 USDC, 16 BTC pairs subscribed`

### Tier 1 Exchanges (WebSocket native)

| Exchange | USDT | USDC | BTC | Notes |
|----------|------|------|-----|-------|
| Binance  | ~90  | ~18  | ~16 | USDC coverage limited to major coins |
| Bybit    | ~85  | ~12  | ~14 | USDC expanding in 2024+ |
| OKX      | ~88  | ~20  | ~16 | Strong USDC + BTC coverage |
| KuCoin   | ~80  | ~8   | ~14 | Fewer USDC pairs |

### Tier 2 Exchanges (CCXT)

| Exchange | USDT | USDC | BTC | Notes |
|----------|------|------|-----|-------|
| Gate.io  | ~88  | ~15  | ~15 | |
| MEXC     | ~85  | ~5   | ~12 | Limited USDC |
| HTX/Huobi| ~80  | ~3   | ~14 | Very few USDC pairs |
| Bitget   | ~75  | ~10  | ~12 | |
| BingX    | ~70  | ~5   | ~8  | |

### Tier 3 Exchanges (Native REST)

| Exchange   | USDT | USDC | BTC | Notes |
|------------|------|------|-----|-------|
| Coinbase   | ~30  | ~80  | ~15 | USDC is the primary quote — best USDC coverage |
| Crypto.com | ~60  | ~20  | ~10 | |
| Bitfinex   | ~50  | ~5   | ~20 | Strong BTC cross-pair coverage |
| Upbit      | ~40  | ~3   | ~10 | KRW-focused, limited USDC |
| Phemex     | ~55  | ~5   | ~12 | |
| WhiteBit   | ~50  | ~8   | ~10 | |
| CoinEx     | ~45  | ~5   | ~12 | |
| BitMart    | ~40  | ~3   | ~8  | |

### Disabled Exchanges

The following exchanges were disabled due to data quality issues (stale prices, inflated spreads):

| Exchange   | Reason |
|------------|--------|
| Bitstamp   | Stale prices (FTM, ENJ) |
| AscendEx   | Wrong MATIC price |
| LBank      | Inflated MATIC price |
| CoinW      | Low volume, unreliable data |
| BTSE       | Low volume, limited coin support |
| Deribit    | Derivatives exchange — perpetual ≠ spot |
| ProBit     | Low volume, stale orderbooks |

---

## Gap Detection Rules

The gap detector compares prices **only within the same (symbol, quote_currency) tuple**:

- ✅ `BTC/USDT` on Binance vs `BTC/USDT` on Bybit → valid CEX-CEX gap
- ✅ `BTC/USDC` on Coinbase vs `BTC/USDC` on Kraken → valid CEX-CEX gap  
- ❌ `BTC/USDT` on Binance vs `BTC/USDC` on Coinbase → **blocked** (different denominations)

This is enforced at the data layer: the `tickStore` groups by `symbol` (which includes the quote), so different quote currencies are naturally isolated.

---

## Quote Currency Filter

The Intelligence page `/intelligence` includes filter pills:

```
[ALL] [USDT (124)] [USDC (38)] [BTC (22)]
```

Selecting a pill filters:
- The Live Gaps table
- The Most Gapped Assets sidebar leaderboard
- The Arbitrage Heatmap matrix

The Dashboard `/dashboard` sidebar includes a three-way tab:

```
[USDT] [USDC] [BTC]
```

Switching tabs filters the coin price list to only show coins with that quote currency.
