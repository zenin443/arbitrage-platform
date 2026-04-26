"use client";

export interface GapRecord {
  id?: string;
  type: string;
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  spreadPercent: number;
  buyPrice: number;
  sellPrice: number;
  maxTradeableUsd: number;
  detectedAt: number;
  durationMs: number;
}

interface Props {
  signal: GapRecord;
  onClose: () => void;
}

const EXCHANGE_LABELS: Record<string, string> = {
  binance:  "Binance",
  bybit:    "Bybit",
  okx:      "OKX",
  kucoin:   "KuCoin",
  kraken:   "Kraken",
  coinbase: "Coinbase",
  gate:     "Gate.io",
  htx:      "HTX",
  mexc:     "MEXC",
};

function exchangeLabel(id: string): string {
  return EXCHANGE_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}

function timeAgo(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function formatDuration(ms: number): string {
  const s = Math.floor((ms ?? 0) / 1000);
  if (s <= 0)   return "—";
  if (s < 60)   return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function formatPx(p: number): string {
  if (!p) return "—";
  if (p >= 10000) return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 100)   return p.toFixed(2);
  if (p >= 1)     return p.toFixed(4);
  return p.toFixed(6);
}

function RiskBar({
  label,
  score,
  activeColor,
}: {
  label: string;
  score: number;
  activeColor: string;
}) {
  return (
    <div className="flex justify-between items-center mb-1">
      <span className="text-[11px] text-[#8B949E] font-sans">{label}</span>
      <div className="flex gap-[2px]">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-3 h-1 rounded-sm ${i <= score ? activeColor : "bg-[#21262D]"}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function SignalDetailPane({ signal, onClose }: Props) {
  const buyEx  = exchangeLabel(signal.buyExchange);
  const sellEx = exchangeLabel(signal.sellExchange);
  const coin   = signal.symbol;

  // P&L calculations
  const tradeSize   = Math.min(signal.maxTradeableUsd || 10000, 10000);
  const grossProfit = tradeSize * (signal.spreadPercent / 100);
  const buyFee      = tradeSize * 0.001;
  const sellFee     = tradeSize * 0.001;
  const slippageEst = grossProfit * 0.05;
  const netProfit   = grossProfit - buyFee - sellFee - slippageEst;
  const netRoi      = (netProfit / tradeSize) * 100;
  const tokens      = signal.buyPrice > 0 ? tradeSize / signal.buyPrice : 0;
  const perToken    = signal.sellPrice - signal.buyPrice;

  // Risk scores
  const liq = signal.maxTradeableUsd;
  const liquidityScore =
    liq > 20000 ? 5 : liq > 10000 ? 4 : liq > 5000 ? 3 : liq > 1000 ? 2 : 1;

  const ageSeconds = (Date.now() - signal.detectedAt) / 1000;
  const speedScore =
    ageSeconds < 30 ? 5 : ageSeconds < 60 ? 4 : ageSeconds < 300 ? 3 : ageSeconds < 600 ? 2 : 1;

  const sp = signal.spreadPercent;
  const confidenceScore =
    sp > 0.4 ? 5 : sp > 0.3 ? 4 : sp > 0.2 ? 3 : sp > 0.1 ? 2 : 1;

  const steps = [
    {
      num: 1,
      color: "#388BFD",
      title: "Validate spread",
      desc: `Re-check live prices on both exchanges. Confirm spread still > 0.25% after fees.`,
    },
    {
      num: 2,
      color: "#388BFD",
      title: "Check balances",
      desc: `Verify USDT on ${buyEx} for buy. Verify ${coin} or USDT margin on ${sellEx} for sell.`,
    },
    {
      num: 3,
      color: "#3FB950",
      title: "Execute simultaneously",
      desc: `Market buy on ${buyEx} + market sell on ${sellEx} fired at the same time.`,
    },
    {
      num: 4,
      color: "#D29922",
      title: "Monitor fills",
      desc: `Poll order status every 500ms. Wait up to 30s for both sides to fill.`,
    },
    {
      num: 5,
      color: "#3FB950",
      title: "Reconcile P&L",
      desc: `Calculate actual profit from fill prices. Record to trade history.`,
    },
  ];

  return (
    <div className="bg-[#0D1117] border-t border-b border-[#388BFD]/20">

      {/* Header */}
      <div className="flex justify-between items-center px-4 py-2 bg-gradient-to-r from-[#161B22] to-[#0D1117] border-b border-[#21262D]">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-sans font-medium text-[#E6EDF3]">Arbitrage process</span>
          <span className="text-[#3FB950] text-[11px] font-mono">{signal.symbol}</span>
          <span className="text-[#8B949E] text-[11px] font-sans">{buyEx} → {sellEx}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[#8B949E] text-[11px] font-sans">
            detected {timeAgo(signal.detectedAt)}
          </span>
          <button
            onClick={onClose}
            className="text-[#8B949E] hover:text-[#E6EDF3] text-sm leading-none transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 3-column content */}
      <div className="grid grid-cols-3 divide-x divide-[#21262D]">

        {/* ── Column 1: Price comparison ── */}
        <div className="p-3">
          <div className="text-[11px] font-sans text-[#8B949E] mb-2">
            Price comparison
          </div>

          {/* Buy box */}
          <div className="bg-[#3FB950]/5 border border-[#3FB950]/20 rounded-md p-2.5 mb-2">
            <div className="flex justify-between items-center">
              <span className="text-[#3FB950] text-[11px] font-sans">Buy on</span>
              <span className="text-[#3FB950] text-[11px] font-medium font-sans">{buyEx}</span>
            </div>
            <div className="text-[#E6EDF3] text-[18px] font-mono font-medium my-1">
              ${formatPx(signal.buyPrice)}
            </div>
            <div className="text-[11px] font-sans text-[#8B949E]">
              Depth: ${(signal.maxTradeableUsd || 10000).toLocaleString()} available
            </div>
          </div>

          {/* Sell box */}
          <div className="bg-[#F85149]/5 border border-[#F85149]/20 rounded-md p-2.5 mb-2">
            <div className="flex justify-between items-center">
              <span className="text-[#F85149] text-[11px] font-sans">Sell on</span>
              <span className="text-[#F85149] text-[11px] font-medium font-sans">{sellEx}</span>
            </div>
            <div className="text-[#E6EDF3] text-[18px] font-mono font-medium my-1">
              ${formatPx(signal.sellPrice)}
            </div>
            <div className="text-[11px] font-sans text-[#8B949E]">
              Depth: ${((signal.maxTradeableUsd || 10000) * 2).toLocaleString()} available
            </div>
          </div>

          {/* Spread */}
          <div className="bg-[#161B22] rounded p-2 text-center">
            <div className="text-[11px] font-sans text-[#8B949E]">Spread</div>
            <div className="text-[20px] font-mono font-medium text-[#3FB950]">
              {signal.spreadPercent.toFixed(3)}%
            </div>
            <div className="text-[11px] font-mono text-[#8B949E]">
              ${perToken.toFixed(6)} per token
            </div>
          </div>
        </div>

        {/* ── Column 2: Execution steps ── */}
        <div className="p-3">
          <div className="text-[11px] font-sans text-[#8B949E] mb-2">
            Execution process
          </div>

          {steps.map((step, idx) => (
            <div key={step.num} className="flex gap-2 mb-3">
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono font-medium"
                  style={{
                    background: `${step.color}20`,
                    border: `1px solid ${step.color}`,
                    color: step.color,
                  }}
                >
                  {step.num}
                </div>
                {idx < steps.length - 1 && (
                  <div className="w-px h-4 bg-[#21262D] mt-0.5" />
                )}
              </div>
              <div className="pt-0.5 min-w-0">
                <div className="text-[12px] font-medium text-[#E6EDF3] font-sans">{step.title}</div>
                <div className="text-[11px] font-sans text-[#8B949E] leading-relaxed mt-0.5">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Column 3: P&L breakdown ── */}
        <div className="p-3">
          <div className="text-[11px] font-sans text-[#8B949E] mb-2">
            Profit breakdown
          </div>

          <table className="w-full text-[11px] mb-3">
            <tbody>
              <tr>
                <td className="py-[2px] font-sans text-[#8B949E]">Trade size</td>
                <td className="py-[2px] text-right font-mono text-[#E6EDF3]">
                  ${tradeSize.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td className="py-[2px] font-sans text-[#8B949E]">Tokens</td>
                <td className="py-[2px] text-right font-mono text-[#E6EDF3]">
                  {tokens.toFixed(4)} {coin}
                </td>
              </tr>
              <tr>
                <td className="py-[2px] font-sans text-[#8B949E]">Spread</td>
                <td className="py-[2px] text-right font-mono text-[#3FB950]">
                  {signal.spreadPercent.toFixed(3)}%
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="py-[2px]">
                  <div className="border-t border-[#21262D]" />
                </td>
              </tr>
              <tr>
                <td className="py-[2px] font-sans text-[#8B949E]">Gross profit</td>
                <td className="py-[2px] text-right font-mono text-[#3FB950]">+${grossProfit.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-[2px] font-sans text-[#8B949E]">Buy fee (0.1%)</td>
                <td className="py-[2px] text-right font-mono text-[#F85149]">-${buyFee.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-[2px] font-sans text-[#8B949E]">Sell fee (0.1%)</td>
                <td className="py-[2px] text-right font-mono text-[#F85149]">-${sellFee.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-[2px] font-sans text-[#8B949E]">Slippage est.</td>
                <td className="py-[2px] text-right font-mono text-[#D29922]">~${slippageEst.toFixed(2)}</td>
              </tr>
              <tr>
                <td colSpan={2} className="py-[2px]">
                  <div className="border-t-2 border-[#21262D]" />
                </td>
              </tr>
              <tr>
                <td className="py-[3px] font-sans font-medium text-[#8B949E]">Net profit</td>
                <td className="py-[3px] text-right font-mono text-[#3FB950] text-[14px] font-medium">
                  +${netProfit.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="py-[2px] font-sans text-[#8B949E]">Net ROI</td>
                <td className="py-[2px] text-right font-mono text-[#3FB950]">+{netRoi.toFixed(4)}%</td>
              </tr>
            </tbody>
          </table>

          {/* Risk assessment bars */}
          <div className="mb-3">
            <RiskBar label="Liquidity"  score={liquidityScore}  activeColor="bg-[#3FB950]" />
            <RiskBar label="Speed"      score={speedScore}      activeColor="bg-[#3FB950]" />
            <RiskBar label="Confidence" score={confidenceScore} activeColor="bg-[#388BFD]" />
          </div>

          {/* Gap duration */}
          <div className="bg-[#161B22] rounded p-2 text-center mt-3">
            <div className="text-[11px] font-sans text-[#8B949E]">Gap duration</div>
            <div className="text-[14px] font-mono font-medium text-[#D29922]">
              {formatDuration(signal.durationMs)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
