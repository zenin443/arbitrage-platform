'use client';

export default function DexMarketsPage() {
  return (
    <div className="min-h-screen bg-[#0D1117] text-[#C9D1D9] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-[40px] mb-4">🔗</div>
        <h1 className="text-[18px] font-mono font-bold text-[#E6EDF3] uppercase tracking-wider mb-3">
          DEX Markets
        </h1>
        <p className="text-[13px] font-mono text-[#484F58] leading-relaxed mb-6">
          Cross-DEX arbitrage tracking across Uniswap, Jupiter, PancakeSwap, and more.
          Real-time liquidity depth, slippage estimation, and gas-optimized routing.
        </p>
        <div className="inline-block border border-[#21262D] rounded px-4 py-2">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#F0883E]">
            Coming in v0.8
          </span>
        </div>
      </div>
    </div>
  );
}
